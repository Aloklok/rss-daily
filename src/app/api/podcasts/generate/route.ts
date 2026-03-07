import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { generateSiliconFlow } from '@/domains/intelligence/services/siliconflow';
import { fetchBriefingData } from '@/domains/reading/services';

// Force dynamic execution
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 mins

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        const body = await req.json();
        const { date, forceRegenerate } = body;

        if (!date) {
            return Response.json({ error: 'Date is required' }, { status: 400 });
        }

        if (!forceRegenerate) {
            const { data: existingPodcast } = await supabase
                .from('daily_podcasts')
                .select('*')
                .eq('date', date)
                .eq('language', 'zh')
                .maybeSingle();

            if (existingPodcast?.script_content) {
                return Response.json({
                    script: existingPodcast.script_content,
                    fromCache: true
                });
            }
        }

        const briefingData = await fetchBriefingData(date, 'zh');

        // 1. Prepare Summary List (All news, Title + TLDR only)
        // This corresponds to the "News Directory" at the top of the user's site
        const summaryList = Object.values(briefingData).flat().map(a => ({
            title: a.title,
            category: a.category,
            tldr: a.tldr,
            fullSummary: a.summary
        }));

        // 2. Prepare Detail List (Top 4 'Important' news with full details)
        // These are the specialized cards for deep dives
        const detailList = (briefingData['重要新闻'] || []).slice(0, 4).map(a => ({
            title: a.title,
            summary: a.summary,
            marketTake: a.marketTake,
            critique: a.critiques
        }));

        // Get Prompt and Model ID from App Config
        const { data: configRows } = await supabase
            .from('app_config')
            .select('key, value')
            .in('key', ['gemini_podcast_prompt', 'gemini_podcast_model', 'gemini_podcast_enable_thinking']);

        const configMap = (configRows || []).reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});

        const defaultPrompt = "请为您生成一份播客脚本：\n\n{{summaryList}}\n\n{{detailList}}";

        // ... rest of prompt prep ...
        const promptTemplate = configMap['gemini_podcast_prompt'] || defaultPrompt;
        const modelId = configMap['gemini_podcast_model'] || 'Qwen/Qwen3-8B';
        const enableThinking = configMap['gemini_podcast_enable_thinking'] === 'true';
        const totalCount = summaryList.length;

        // ... prompt replacement logic ...
        const promptText = promptTemplate
            .replace('{{summaryList}}', JSON.stringify(summaryList, null, 2))
            .replace('{{detailList}}', JSON.stringify(detailList, null, 2))
            .replace('{{date}}', date)
            .replace('{{totalCount}}', totalCount.toString());

        console.log(`[Podcast] Generating script for ${date} using ${modelId} (Thinking: ${enableThinking})`);
        const script = await generateSiliconFlow(
            [
                { role: 'user', content: promptText }
            ],
            modelId,
            2000,
            false,
            enableThinking
        );

        if (!script || script.trim() === '') {
            return Response.json({ error: '生成的播客文稿为空' }, { status: 500 });
        }

        console.log(`[Podcast] Script generated (${script.length} characters)`);

        // Check for existing ID to bypass Postgres 'upsert' constraint crash
        const { data: existingCheck } = await supabase
            .from('daily_podcasts')
            .select('id')
            .eq('date', date)
            .eq('language', 'zh')
            .maybeSingle();

        let dbError;
        if (existingCheck?.id) {
            const result = await supabase
                .from('daily_podcasts')
                .update({
                    script_content: script,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingCheck.id);
            dbError = result.error;
        } else {
            const result = await supabase
                .from('daily_podcasts')
                .insert({
                    date: date,
                    language: 'zh',
                    script_content: script,
                    audio_url: '', // Satisfy NOT NULL constraint even though we play locally
                    updated_at: new Date().toISOString()
                });
            dbError = result.error;
        }

        if (dbError) {
            console.error('DB Insert/Update Error:', dbError);
        }

        return Response.json({ script });

    } catch (error: any) {
        console.error('[Podcast] API Generation Error:', error, 'CAUSE:', error.cause);
        return Response.json({
            error: error.message || '生成失败，请稍后重试',
            cause: error.cause ? String(error.cause) : null,
            stack: error.stack
        }, { status: 500 });
    }
}
