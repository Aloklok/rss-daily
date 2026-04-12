import * as crypto from 'crypto';

/**
 * 计算播客文稿的哈希值（用于校验音频一致性）
 * @param script 播客文稿内容
 * @returns 16位 MD5 哈希字符串
 */
export function getPodcastHash(script: string): string {
  if (!script) return '';
  return crypto.createHash('md5').update(script).digest('hex').substring(0, 16);
}

/**
 * 校验音频 URL 是否与文稿哈希一致
 * @param script 播客文稿内容
 * @param audioUrl 音频 URL
 * @returns 是否一致
 */
export function isAudioConsistent(script: string, audioUrl: string | null | undefined): boolean {
  if (!script || !audioUrl) return false;
  const hash = getPodcastHash(script);
  return audioUrl.includes(hash);
}
