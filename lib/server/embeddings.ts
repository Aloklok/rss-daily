import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateEmbedding(
  text: string,
  taskType: string = 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();

  const genAI = new GoogleGenerativeAI(apiKey);
  // 迁移至下一代模型 gemini-embedding-001
  // 该模型原生支持多语言且解决了 004 版本的中文短语 Identical Vector Bug，不再需要 [ZH] 补丁。
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  try {
    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }], role: 'user' },
      taskType: taskType as any,
      // 利用 Matryoshka 技术输出 768 维，保持精度同时兼容现有数据库结构
      outputDimensionality: 768,
    } as any);
    const embedding = result.embedding;
    return embedding.values;
  } catch (error: any) {
    console.error('Gemini Embedding Generation Failed:', error.message);
    throw error;
  }
}
