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
    apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30 || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    apiKeyName = process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30
      ? 'GOOGLE_GENERATIVE_AI_API_KEY_CHENG30'
      : 'GOOGLE_GENERATIVE_AI_API_KEY';
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
    console.error(
      `[generateEmbedding Error] Key: ${apiKeyName} | Task: ${taskType} | Text Snippet: "${text.slice(0, 50)}..."`,
    );
    console.error('Full Error:', error.message);
    throw new Error(`向量生成失败 (Key: ${apiKeyName}): ${error.message}`);
  }
}
