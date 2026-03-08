/**
 * 播客批量回填脚本
 *
 * 自动查询最近 N 天缺失的播客文稿，并调用大模型进行批量生成。
 * 为了提高速度并节省成本，此脚本跳过了 TTS 语音生成阶段。
 *
 * 使用方法：
 *   npx tsx scripts/backfill-podcasts.ts [--days=90] [--delay=10]
 *
 * 参数：
 *   --days N     检查过去 N 天的数据（默认 90）
 *   --delay N    两次生成之间的延迟秒数，避免触发 API 频率限制（默认 10）
 *   --overwrite  是否覆盖已存在的文稿（默认 false）
 *   --model ID   指定使用的模型 ID（覆盖数据库配置）
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 解析命令行参数
const daysArg = process.argv.find((arg) => arg.startsWith('--days='));
const daysToLookBack = daysArg ? parseInt(daysArg.split('=')[1], 10) : 90;

const delayArg = process.argv.find((arg) => arg.startsWith('--delay='));
const delayMs = delayArg ? parseInt(delayArg.split('=')[1], 10) * 1000 : 10000;
const overwrite = process.argv.includes('--overwrite');

const modelArg = process.argv.find((arg) => arg.startsWith('--model='));
const overrideModelId = modelArg ? modelArg.split('=')[1] : null;

// 工具函数：获取过去 N 天的日期字符串数组 (YYYY-MM-DD)
function getPastDates(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

// 延迟函数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillPodcasts() {
    console.log(`🎙️ Starting podcast script backfill...`);
    console.log(`📅 Look back days: ${daysToLookBack}`);
    console.log(`⏳ Delay between generation: ${delayMs / 1000}s`);

    const datesToCheck = getPastDates(daysToLookBack);

    // 1. 查询数据库中已经存在的播客脚本文稿
    const { data: existingPodcasts, error: queryError } = await supabase
        .from('daily_podcasts')
        .select('id, date, script_content')
        .in('date', datesToCheck)
        .eq('language', 'zh');

    if (queryError) {
        console.error('❌ Failed to fetch existing podcasts:', queryError);
        return;
    }

    // 建立已存在的日期 Set（仅算有 script_content 的）
    const existingDates = new Set(
        existingPodcasts?.filter((p) => p.script_content).map((p) => p.date) || [],
    );

    const missingDates = datesToCheck.filter((d) => {
        if (overwrite) return true;
        return !existingDates.has(d);
    });

    if (missingDates.length === 0) {
        console.log('✨ All podcasts are already generated for the requested period!');
        return;
    }

    console.log(`📉 Found ${missingDates.length} missing dates to generate.`);

    // 2. 获取 App Config
    const { MODELS } = await import('../src/domains/intelligence/constants');

    const { data: configRows } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['gemini_podcast_prompt', 'gemini_podcast_model', 'gemini_podcast_enable_thinking']);

    const configMap = (configRows || []).reduce(
        (acc: any, row: any) => ({ ...acc, [row.key]: row.value }),
        {},
    );

    const defaultPrompt = '请为您生成一份播客脚本：\n\n{{articleList}}';
    const promptTemplate = configMap['gemini_podcast_prompt'] || defaultPrompt;
    let modelId = overrideModelId || configMap['gemini_podcast_model'] || 'Qwen/Qwen3-8B';
    const enableThinking = configMap['gemini_podcast_enable_thinking'] === 'true';

    // 如果用户明确要求“本人”（Gemini），且配置中不是 Gemini，则强制切换
    if (!overrideModelId && (modelId.includes('Qwen') || modelId.includes('DeepSeek'))) {
        console.log(`⚠️  Detected non-Gemini model in config. Switching to flagship Gemini as per user request.`);
        modelId = 'gemini-2.0-flash'; // 降级到稳定旗舰或用户偏好
    }

    const modelConfig = MODELS.find((m) => m.id === modelId.split('@')[0]);
    const isGoogle = modelConfig?.provider === 'google' || modelId.startsWith('gemini-');

    console.log(`🤖 Using model: ${modelId} (Google: ${isGoogle}, Thinking: ${enableThinking})`);

    let successCount = 0;
    let failCount = 0;
    let emptyDatesCount = 0;

    // 从旧到新生成
    const sortedMissingDates = [...missingDates].sort((a, b) => a.localeCompare(b));

    for (let i = 0; i < sortedMissingDates.length; i++) {
        const date = sortedMissingDates[i];
        console.log(`\n⏳ [${i + 1}/${sortedMissingDates.length}] Processing date: ${date}`);

        try {
            // 计算当天的 UTC 范围（上海时间 UTC+8）
            const startIso = new Date(`${date}T00:00:00+08:00`).toISOString();
            const endIso = new Date(`${date}T23:59:59.999+08:00`).toISOString();

            const { data: rawArticles, error: articleError } = await supabase
                .from('articles_view')
                .select('title, summary, tldr, highlights, critiques, "marketTake"')
                .gte('n8n_processing_date', startIso)
                .lte('n8n_processing_date', endIso);

            if (articleError) {
                console.error(`  ❌ Failed to fetch articles for ${date}:`, articleError);
                failCount++;
                continue;
            }

            const articleList = (rawArticles || []).map((a: any) => ({
                title: a.title,
                summary: a.summary,
                tldr: a.tldr,
                highlights: a.highlights,
                critiques: a.critiques,
                marketTake: a.marketTake,
            }));

            if (articleList.length === 0) {
                console.log(`  ℹ️ No articles found for ${date}, skipping.`);
                emptyDatesCount++;
                continue;
            }

            console.log(`  📄 Found ${articleList.length} articles. Generating script...`);

            const totalCount = articleList.length;
            const promptText = promptTemplate
                .replace('{{articleList}}', JSON.stringify(articleList, null, 2))
                .replace('{{date}}', date)
                .replace('{{totalCount}}', totalCount.toString());

            const aiMessages = [{ role: 'user', content: promptText }];
            let script = '';

            if (isGoogle) {
                const { generateGemini } = await import('../src/domains/intelligence/services/gemini');
                script = await generateGemini(aiMessages, modelId, 8000, undefined, enableThinking);
            } else {
                const { generateSiliconFlow } = await import('../src/domains/intelligence/services/siliconflow');
                script = await generateSiliconFlow(aiMessages, modelId, 4000, false, enableThinking);
            }

            if (!script || script.trim() === '') {
                console.error(`  ❌ Generated script is empty for ${date}.`);
                failCount++;
                continue;
            }

            console.log(`  ✅ Script generated (${script.length} chars). Saving to database...`);

            const existingRecord = existingPodcasts?.find((p) => p.date === date);

            let dbError;
            if (existingRecord?.id) {
                const { error } = await supabase
                    .from('daily_podcasts')
                    .update({
                        script_content: script,
                        model_id: modelId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingRecord.id);
                dbError = error;
            } else {
                const { error } = await supabase.from('daily_podcasts').insert({
                    date: date,
                    language: 'zh',
                    script_content: script,
                    audio_url: '',
                    model_id: modelId,
                    updated_at: new Date().toISOString(),
                });
                dbError = error;
            }

            if (dbError) {
                console.error(`  ❌ Failed to save to database for ${date}:`, dbError);
                failCount++;
            } else {
                console.log(`  💾 Successfully saved script for ${date}.`);
                successCount++;
            }

        } catch (error: any) {
            console.error(`  💥 Fatal error for ${date}:`, error.message, error.cause ? String(error.cause) : '');
            failCount++;
        }

        if (i < sortedMissingDates.length - 1) {
            console.log(`  💤 Sleeping for ${delayMs / 1000}s...`);
            await sleep(delayMs);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Podcast backfill completed!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`ℹ️ Empty dates (skipped): ${emptyDatesCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('='.repeat(60));
}

backfillPodcasts().catch(console.error);
