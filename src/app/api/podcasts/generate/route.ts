import { NextRequest, after } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { generateSiliconFlow } from '@/domains/intelligence/services/siliconflow';
import { generateEdgeTTSAudio } from '@/domains/intelligence/services/edge-tts';
import { generateGemini } from '@/domains/intelligence/services/gemini';
import { fetchBriefingData } from '@/domains/reading/services';
import { MODELS } from '@/domains/intelligence/constants';
import { getPodcastHash, isAudioConsistent } from '@/shared/utils/podcastUtils';

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
      language: requestedLanguage,
    } = body;

    const lang = requestedLanguage || 'zh';

    if (!date) {
      return Response.json({ error: 'Date is required' }, { status: 400 });
    }

    let script = '';
    let isReusingScript = false;

    if (!forceRegenerate) {
      const { data: existingPodcast } = await supabase
        .from('daily_podcasts')
        .select('*')
        .eq('date', date)
        .eq('language', lang)
        .maybeSingle();

      if (existingPodcast?.script_content) {
        const cachedScript = existingPodcast.script_content;
        const audioUrl = existingPodcast.audio_url;

        // 核心修复：只有当文稿存在且音频也一致时，才允许返回缓存
        if (isAudioConsistent(cachedScript, audioUrl)) {
          console.log(`[Podcast] Cache hit & consistent for ${date} (${lang}).`);
          return Response.json({
            script: cachedScript,
            audioUrl: audioUrl || '',
            fromCache: true,
            status: 'ready',
          });
        }
        
        // 关键改进：如果用户没有强制重新生成讲稿，我们复用现有的讲稿，直接进入 TTS 合成环节
        console.log(`[Podcast] ♻️ Reusing existing script for ${date} (${lang}) due to stale audio. skipping Gemini.`);
        script = cachedScript;
        isReusingScript = true;
      }
    }

    if (!script) {
      console.log(`[Podcast] 🆕 Generating new script for ${date} (${lang})...`);
      const briefingData = await fetchBriefingData(date, lang as 'zh' | 'en');

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
      script = await generateSiliconFlow(aiMessages, modelId, 2000, false, enableThinking);
    }

    if (!script || script.trim() === '') {
      return Response.json({ error: '生成的播客文稿为空' }, { status: 500 });
    }

      console.log(`[Podcast] Script generated (${script.length} characters)`);
    }

    // Check for existing ID and old audio URL early to clean up storage later
    const { data: existingCheck } = await supabase
      .from('daily_podcasts')
      .select('id, audio_url')
      .eq('date', date)
      .eq('language', lang)
      .maybeSingle();

    // 0. Pre-load checking for Hash-based duplicates in Storage
    let useExistingAudio = false;
    let expectedAudioUrl = '';
    const textHash = getPodcastHash(script);
    // English files get an _en suffix
    const fileName =
      lang === 'en'
        ? `podcast-${date}-en-${textHash}_en.mp3`
        : `podcast-${date}-zh-${textHash}.mp3`;

    try {
      const { data: existingFiles } = await supabase.storage.from('podcasts').list();
      if (existingFiles?.some((f) => f.name === fileName)) {
        console.log(
          `[Podcast] 🎉 Hash match found in Storage. Bypassing Edge TTS API: ${fileName}`,
        );
        useExistingAudio = true;
        // Retrieve public URL quickly without uploading
        const { data: qData } = supabase.storage.from('podcasts').getPublicUrl(fileName);
        expectedAudioUrl = qData.publicUrl;
      }
    } catch (err) {
      console.warn('[Podcast] ⚠️ Pre-load check failed, continuing normal process:', err);
    }

    // 1. 立即更新数据库文稿（使用 upsert 原子操作，确保稳定写入）
    console.log(`[Podcast] 📦 Persisting script to DB... [${date} (${lang})]`);
    const { data: upsertData, error: dbError } = await supabase
      .from('daily_podcasts')
      .upsert(
        {
          date: date,
          language: lang,
          script_content: script,
          audio_url: useExistingAudio ? expectedAudioUrl : '', // 只有命中缓存才保留地址，否则清空
          model_id: modelId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'date,language' } // 基于日期和语言防重
      )
      .select('id')
      .single();

    let activeId = upsertData?.id;

    if (dbError) {
      console.error('[Podcast] ❌ DB Upsert Error:', dbError.message, dbError.details);
      // 如果文稿存不进去，我们就没法进行下一步语音关联，直接抛出，让前端感知到
      throw new Error(`数据库写入失败: ${dbError.message}`);
    }

    console.log(`[Podcast] ✅ Script persisted. (Record ID: ${activeId})`);

    // 2. 定义高可靠后台任务
    const runBackgroundTask = async (targetId: string | number | undefined, targetDate: string, targetLang: string, targetScript: string) => {
      console.log(`[Podcast-BG] >>> 🚀 Background Worker Started for ${targetDate}`);
      
      // 在任务内部建立独立的数据库连接，防止主连接随请求关闭
      const internalSupabase = getSupabaseClient();
      let finalAudioUrl = '';

      try {
        if (!useExistingAudio) {
          console.log(`[Podcast-BG] [Step 1/4] Generating Edge TTS...`);
          const audioBuffer = await generateEdgeTTSAudio(targetScript);
          console.log(`[Podcast-BG] [Step 2/4] TTS Done (${audioBuffer.length} bytes), uploading...`);

          const { error: uploadError } = await internalSupabase.storage
            .from('podcasts')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = internalSupabase.storage.from('podcasts').getPublicUrl(fileName);
            finalAudioUrl = urlData.publicUrl;
            console.log(`[Podcast-BG] [Step 3/4] Uploaded. URL: ${finalAudioUrl}`);
          } else {
            console.error('[Podcast-BG] ❌ Upload Error:', uploadError.message);
          }
        } else {
          console.log(`[Podcast-BG] Using existing audio cache.`);
          finalAudioUrl = expectedAudioUrl;
        }

        if (finalAudioUrl) {
          console.log(`[Podcast-BG] [Step 4/4] Finalizing DB... ID: ${targetId}`);
          
          let updateQuery = internalSupabase
            .from('daily_podcasts')
            .update({
              audio_url: finalAudioUrl,
              updated_at: new Date().toISOString(),
            });

          if (targetId) {
            updateQuery = updateQuery.eq('id', targetId);
          } else {
            updateQuery = updateQuery.eq('date', targetDate).eq('language', targetLang);
          }

          const { error: urlUpdateError } = await updateQuery;

          if (urlUpdateError) {
            console.error('[Podcast-BG] ❌ DB Final Update Error:', urlUpdateError.message);
          } else {
            console.log(`[Podcast-BG] ✅ MISSION ACCOMPLISHED. Polling should see it now.`);
          }
        }
      } catch (fatalErr: any) {
        console.error('[Podcast-BG] ❌ Fatal Background Error:', fatalErr.message);
      }
    };

    // 立即触发任务（使用 after 确保 Vercel 在响应返回后继续执行后台进程）
    after(async () => {
      const startTime = Date.now();
      console.log(`[Podcast-BG] [${new Date().toISOString()}] >>> 🚀 Background Worker Triggered for ${date}`);
      try {
        await runBackgroundTask(activeId, date, lang, script);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Podcast-BG] [${new Date().toISOString()}] <<< 🎉 All Background Tasks Finished in ${duration}s`);
      } catch (err: any) {
        console.error(`[Podcast-BG] [${new Date().toISOString()}] ❌ Unhandled Background Exception:`, err.message);
      }
    });

    // 4. 返回状态
    return Response.json({
      script,
      audioUrl: useExistingAudio ? expectedAudioUrl : '',
      status: useExistingAudio ? 'ready' : 'processing',
      reusedScript: isReusingScript,
    });
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
