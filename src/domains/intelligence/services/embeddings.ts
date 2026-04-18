/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Embedding 向量生成服务（基于 Vercel AI SDK）
 *
 * 已从原生 @google/genai SDK 迁移至 Vercel AI SDK，
 * 与 gemini.ts / siliconflow.ts 统一底层抽象。
 */
import { embed } from 'ai';
import { createGoogleProvider } from './google-provider';

export async function generateEmbedding(
  text: string,
  taskType: string = 'RETRIEVAL_QUERY',
  purpose: 'search' | 'ai' = 'search',
): Promise<number[]> {
  // Key 路由：AI 助手优先用 CHENG30，普通搜索用默认 Key
  const keyAlias = purpose === 'ai' ? undefined : 'alok';
  const google = createGoogleProvider(keyAlias);

  const sanitizedText = text.replace(/\n/g, ' ').trim();

  try {
    const { embedding } = await embed({
      model: google.embedding('gemini-embedding-001'),
      value: sanitizedText,
      providerOptions: {
        google: {
          taskType,
          outputDimensionality: 768,
        },
      },
    });
    return embedding;
  } catch (error: any) {
    const keyLabel = purpose === 'ai' ? 'CHENG30/Auto' : 'ALOK';
    console.error(
      `[generateEmbedding Error] Key: ${keyLabel} | Task: ${taskType} | Text Snippet: "${text.slice(0, 50)}..."`,
    );
    console.error('Full Error:', error.message);
    throw new Error(`向量生成失败 (Key: ${keyLabel}): ${error.message}`);
  }
}
