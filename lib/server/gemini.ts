import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { cleanGeminiJson } from '../../utils/contentUtils';
import { generateEmbedding } from './embeddings';

// Init Supabase Client (Admin Access required for reading app_config if RLS is tight,
// using Service Key is safest for server-side operations)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function getSystemPrompt(): Promise<string> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'gemini_briefing_prompt')
    .single();

  if (error || !data) {
    console.warn('⚠️ Failed to fetch prompt from Supabase, using fallback.');
    throw new Error('System prompt not found in app_config');
  }

  return data.value;
}

export async function generateBriefingWithGemini(articleData: any) {
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 1. Fetch Prompt
  const systemPromptTemplate = await getSystemPrompt();

  // 2. Hydrate Prompt (Replace {{payload}})
  // The N8N prompt expects a JSON string of an array of articles in 'payload'
  // We mimic this structure: payload = [article]
  const payloadStr = JSON.stringify([articleData]);

  // NOTE: If the prompt uses {{payload}}, we replace it.
  // If the user didn't update the prompt yet, this might fail or produce weird results.
  // We assume the prompt is compliant as per previous instructions.
  const fullPrompt = systemPromptTemplate.replace('{{payload}}', payloadStr);

  // 3. Call Gemini
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  // metadata removed as it was unused

  // 4. Parse Result
  const cleanJson = cleanGeminiJson(text);

  try {
    const parsed = JSON.parse(cleanJson);
    // Expecting an array with 1 item
    const briefing = Array.isArray(parsed) ? parsed[0] : parsed;

    // 4.5 生成向量 (语义指纹) - 包含分类与关键词以增强检索维度
    const keywordsStr = Array.isArray(briefing.keywords) ? briefing.keywords.join(' ') : '';
    const contentToEmbed =
      `${briefing.title || articleData.title || ''} ${briefing.category || ''} ${keywordsStr} ${briefing.summary || ''} ${briefing.tldr || ''}`.trim();
    let embedding = null;
    try {
      embedding = await generateEmbedding(contentToEmbed, 'RETRIEVAL_DOCUMENT');
    } catch (e) {
      console.error('Failed to generate embedding during briefing:', e);
    }

    return {
      briefing: {
        ...briefing,
        embedding,
      },
      metadata: {
        usageMetadata: response.usageMetadata,
        safetyRatings: response.candidates?.[0]?.safetyRatings,
        finishReason: response.candidates?.[0]?.finishReason,
        citationMetadata: response.candidates?.[0]?.citationMetadata,
      },
    };
  } catch (error: any) {
    console.error('====================================================');
    console.error('GEMINI JSON PARSE FAILED');
    console.error('--- ERROR MESSAGE ---');
    console.error(error.message);
    console.error('--- CLEANED OUTPUT (attempted) ---');
    console.error(cleanJson);
    console.error('--- TOTAL LENGTH ---');
    console.error(text.length);
    console.error('--- RAW TEXT ---');
    console.log(text); // Use console.log for large blobs, sometimes error handles it differently
    console.error('====================================================');

    throw new Error(`Gemini JSON 解析失败: ${error.message}. 请检查 Vercel 日志获取原始输出。`);
  }
}
