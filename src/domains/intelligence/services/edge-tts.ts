import { Communicate } from 'edge-tts-universal';

const VOICE = 'zh-CN-XiaoxiaoNeural';
const RATE = '-20%'; // 调优语速，根据反馈设为 -20%
const PITCH = '+0Hz';

/**
 * 使用 Edge TTS (XiaoxiaoNeural) 将文本转为 MP3 音频
 * 底层调用微软 Edge 浏览器大声朗读的 WebSocket 接口，免费无需 API Key
 * @returns MP3 格式的 Buffer
 */
export async function generateEdgeTTSAudio(text: string, retries = 2): Promise<Buffer> {
  // 清理 Markdown 标记，避免被朗读
  const cleanText = text.replace(/[*_#`~]/g, '');

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const communicate = new Communicate(cleanText, {
        voice: VOICE,
        rate: RATE,
        pitch: PITCH,
      });

      // 收集所有音频 chunk 拼接为完整 Buffer
      const audioChunks: Buffer[] = [];
      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio' && chunk.data) {
          audioChunks.push(chunk.data);
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('[Edge TTS] 未收到任何音频数据');
      }

      console.log(`[Edge TTS] 成功生成音频 (尝试次数: ${attempt + 1})`);
      return Buffer.concat(audioChunks);
    } catch (err: any) {
      attempt++;
      if (attempt > retries) {
        console.error(`[Edge TTS] 最终合成失败: ${err.message}`);
        throw err;
      }
      const delay = 1000 * attempt;
      console.warn(`[Edge TTS] 尝试出错，正在进行第 ${attempt} 次重试，等待 ${delay}ms... (Error: ${err.message})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('[Edge TTS] 未知的合成错误');
}
