import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { generateSiliconFlow } from '@/domains/intelligence/services/siliconflow';
import { generateEdgeTTSAudio } from '@/domains/intelligence/services/edge-tts';
import { generateGemini } from '@/domains/intelligence/services/gemini';
import { fetchBriefingData } from '@/domains/reading/services';
import { MODELS } from '@/domains/intelligence/constants';

// Force dynamic execution
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 mins

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await req.json();
    const {
      date,
      forceRegenerate,
      modelId: requestedModelId,
      enableThinking: requestedEnableThinking,
    } = body;

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
          audioUrl: existingPodcast.audio_url || '',
          fromCache: true,
        });
      }
    }

    const briefingData = await fetchBriefingData(date, 'zh');

    // 纵向集成：每篇文章携带全部维度信息，由 AI 自主聚类和筛选
    const articleList = Object.values(briefingData)
      .flat()
      .map((a) => ({
        title: a.title,
        summary: a.summary, // DB 字段：summary（深度摘要，描述文章性质和结论）
        tldr: a.tldr, // DB 字段：tldr（≤20 字客观事实摘要）
        highlights: a.highlights, // DB 字段：highlights（技术洞察 → 阶段一解释机制）
        critiques: a.critiques, // DB 字段：critiques（犀利点评 → 阶段二深度素材）
        marketTake: a.marketTake, // DB 字段：marketTake（市场观察 → 阶段二素材）
      }));

    // 从 app_config 读取 Prompt 模板和模型配置
    const { data: configRows } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [
        'gemini_podcast_prompt',
        'gemini_podcast_model',
        'gemini_podcast_enable_thinking',
      ]);

    const configMap = (configRows || []).reduce(
      (acc: any, row: any) => ({ ...acc, [row.key]: row.value }),
      {},
    );

    const defaultPrompt = '请为您生成一份播客脚本：\n\n{{articleList}}';

    const promptTemplate = configMap['gemini_podcast_prompt'] || defaultPrompt;
    const modelId = requestedModelId || configMap['gemini_podcast_model'] || 'Qwen/Qwen3-8B';
    const enableThinking =
      requestedEnableThinking !== undefined
        ? requestedEnableThinking
        : configMap['gemini_podcast_enable_thinking'] === 'true';
    const totalCount = articleList.length;

    const promptText = promptTemplate
      .replace('{{articleList}}', JSON.stringify(articleList, null, 2))
      .replace('{{date}}', date)
      .replace('{{totalCount}}', totalCount.toString());

    console.log(
      `[Podcast] Generating script for ${date} using ${modelId} (Thinking: ${enableThinking})`,
    );

    // 智能分发：根据 MODELS 配置的 provider 决定调用路径
    const modelConfig = MODELS.find((m) => m.id === modelId.split('@')[0]);
    const isGoogle = modelConfig?.provider === 'google' || modelId.startsWith('gemini-');

    let script = '';
    const aiMessages = [{ role: 'user', content: promptText }];

    if (isGoogle) {
      console.log(`[Podcast] Routing to Google Gemini API for ${modelId}`);
      script = await generateGemini(aiMessages, modelId, 4000);
    } else {
      console.log(`[Podcast] Routing to SiliconFlow API for ${modelId}`);
      script = await generateSiliconFlow(
        aiMessages,
        modelId,
        2000,
        false,
        enableThinking,
      );
    }

    if (!script || script.trim() === '') {
      return Response.json({ error: '生成的播客文稿为空' }, { status: 500 });
    }

    console.log(`[Podcast] Script generated (${script.length} characters)`);

    // Edge TTS: 生成 MP3 音频（失败不阻塞，前端会降级到 Web Speech API）
    let audioUrl = '';
    try {
      console.log('[Podcast] Generating Edge TTS audio...');
      const audioBuffer = await generateEdgeTTSAudio(script);
      console.log(`[Podcast] Edge TTS audio generated (${audioBuffer.length} bytes)`);

      // 上传到 Supabase Storage
      const fileName = `podcast-${date}-zh-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('podcasts')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('podcasts').getPublicUrl(fileName);
        audioUrl = urlData.publicUrl;
        console.log(`[Podcast] Audio uploaded: ${audioUrl}`);
      } else {
        console.error('[Podcast] Storage upload error:', uploadError);
      }
    } catch (ttsError: any) {
      console.error(
        '[Podcast] Edge TTS failed, frontend will fallback to Web Speech:',
        ttsError.message,
      );
    }

    // Check for existing ID and old audio URL to clean up storage
    const { data: existingCheck } = await supabase
      .from('daily_podcasts')
      .select('id, audio_url')
      .eq('date', date)
      .eq('language', 'zh')
      .maybeSingle();

    // Clean up old audio file if it exists and we're regenerating
    if (existingCheck?.audio_url && audioUrl && existingCheck.audio_url !== audioUrl) {
      try {
        const oldFileName = existingCheck.audio_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('podcasts').remove([oldFileName]);
          console.log(`[Podcast] Old audio deleted: ${oldFileName}`);
        }
      } catch (err) {
        console.warn('[Podcast] Failed to delete old audio file:', err);
      }
    }

    let dbError;
    if (existingCheck?.id) {
      const result = await supabase
        .from('daily_podcasts')
        .update({
          script_content: script,
          audio_url: audioUrl,
          model_id: modelId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCheck.id);
      dbError = result.error;
    } else {
      const result = await supabase.from('daily_podcasts').insert({
        date: date,
        language: 'zh',
        script_content: script,
        audio_url: audioUrl,
        model_id: modelId,
        updated_at: new Date().toISOString(),
      });
      dbError = result.error;
    }

    if (dbError) {
      console.error('DB Insert/Update Error:', dbError);
    }

    return Response.json({ script, audioUrl });
  } catch (error: any) {
    console.error('[Podcast] API Generation Error:', error, 'CAUSE:', error.cause);
    return Response.json(
      {
        error: error.message || '生成失败，请稍后重试',
        cause: error.cause ? String(error.cause) : null,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
