/**
 * Google AI Provider 配置
 * 基于 Vercel AI SDK 的 Google Generative AI Provider
 *
 * 使用 @ai-sdk/google 创建统一的 Google provider 实例，
 * 支持多 API Key 路由（Cheng30 / Alok / Auto）。
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * 创建 Google AI Provider 实例
 * @param keyAlias - API Key 别名：'cheng30' | 'alok' | undefined (Auto)
 */
export function createGoogleProvider(keyAlias?: string) {
  let apiKey: string | undefined;

  if (keyAlias === 'alok') {
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  } else if (keyAlias === 'cheng30') {
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30;
  } else {
    // 默认优先使用 CHENG30，其次使用 Default
    apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30 ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }

  if (!apiKey) {
    throw new Error(`Google API Key for ${keyAlias || 'Default'} is not defined`);
  }

  return createGoogleGenerativeAI({ apiKey });
}
