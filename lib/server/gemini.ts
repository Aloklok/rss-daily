import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { cleanGeminiJson } from '../../utils/contentUtils';

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
  // The prompt asks for a JSON array `[...]`.
  // We need to extract the JSON from the text (it might be wrapped in ```json ... ```)
  const cleanJson = cleanGeminiJson(text);

  try {
    const parsed = JSON.parse(cleanJson);
    // Expecting an array with 1 item
    const briefing = Array.isArray(parsed) ? parsed[0] : parsed;

    return {
      briefing,
      metadata: {
        usageMetadata: response.usageMetadata,
        safetyRatings: response.candidates?.[0]?.safetyRatings,
        finishReason: response.candidates?.[0]?.finishReason,
        citationMetadata: response.candidates?.[0]?.citationMetadata,
      },
    };
  } catch (error) {
    console.error('Failed to parse Gemini response:', text, error);
    throw new Error('Invalid JSON response from Gemini');
  }
}
