import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const lang = url.searchParams.get('lang') || 'zh';

    if (!date) {
      return Response.json({ error: 'Date is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data: existingPodcast } = await supabase
      .from('daily_podcasts')
      .select('script_content, audio_url')
      .eq('date', date)
      .eq('language', lang)
      .maybeSingle();

    if (existingPodcast?.script_content) {
      const script = existingPodcast.script_content;
      const audioUrl = existingPodcast.audio_url || '';
      
      // 指纹校验：确保音频文件名中的哈希与当前文稿内容匹配
      let isConsistent = true;
      if (audioUrl) {
        const textHash = crypto.createHash('md5').update(script).digest('hex').substring(0, 16);
        // 检查 URL 是否包含当前文稿的哈希
        if (!audioUrl.includes(textHash)) {
          console.warn(`[Podcast] Internal consistency check failed for ${date}. Stale audio detected.`);
          isConsistent = false;
        }
      }

      return Response.json({
        script,
        audioUrl: isConsistent ? audioUrl : '',
        status: isConsistent ? 'ready' : 'stale', // 告知前端这是过期数据
      });
    } else {
      return Response.json({ script: null, audioUrl: '' }); // explicitly indicate not found
    }
  } catch (error: any) {
    console.error('[Podcast] Fetch API Error:', error);
    return Response.json({ error: '获取文稿失败' }, { status: 500 });
  }
}
