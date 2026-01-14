import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateEmbedding(
  text: string,
  taskType: string = 'RETRIEVAL_QUERY',
  purpose: 'search' | 'ai' = 'search',
): Promise<number[]> {
  // 分流逻辑：AI 助手强制优先用 CHENG30，普通搜索强制只用原 KEY
  let apiKey: string | undefined;
  let apiKeyName: string;

  if (purpose === 'ai') {
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30;
    apiKeyName = 'GOOGLE_GENERATIVE_AI_API_KEY_CHENG30';
    // 如果没有配置 CHENG30，则尝试用默认 KEY (作为配置层面的兜底，非运行时 Fallback)
    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      apiKeyName = 'GOOGLE_GENERATIVE_AI_API_KEY';
    }
  } else {
    apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    apiKeyName = 'GOOGLE_GENERATIVE_AI_API_KEY';
  }

  if (!apiKey) {
    throw new Error(`${apiKeyName} is not defined`);
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  try {
    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }], role: 'user' },
      taskType: taskType as any,
      outputDimensionality: 768,
    } as any);
    const embedding = result.embedding;
    return embedding.values;
  } catch (error: any) {
    // 移除自动降级策略：不再在运行时自动切换 KEY，确保配额错误能准确反馈到对应的账号上
    console.error(
      `[generateEmbedding Error] Key: ${apiKeyName} | Task: ${taskType} | Text Snippet: "${text.slice(0, 50)}..."`,
    );
    console.error('Full Error:', error.message);
    throw new Error(`向量生成失败 (Key: ${apiKeyName}): ${error.message}`);
  }
}
