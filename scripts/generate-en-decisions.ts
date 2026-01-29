import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Standard fetch might be available in node 18+, but using node-fetch if needed. Actually Node 18 globals.

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GUIJI_API_KEY;

if (!API_KEY) {
  console.error('Missing GUIJI_API_KEY in .env.local');
  // Check if we can fall back to the one used in code
  // process.exit(1);
}

// const MODEL_ID = 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B'; // Free & Fast
const MODEL_ID = 'Qwen/Qwen2.5-14B-Instruct'; // High quality instruction following, typically free or cheap on SF

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

const PROMPT_TEMPLATE = `
You are an expert tech editor. The following text fields have excessive bolding (Markdown **bold**).
Your goal is to SELECT which bolded terms should REMAIN bolded, and which should be un-bolded (converted to plain text).

**Rules for Retention (Keep Bold):**
1.  **Proper Nouns**: Product names (e.g., "iPhone 16"), Company names (e.g., "OpenAI"), People (e.g., "Sam Altman").
2.  **Critical Metrics**: Key numbers (e.g., "$500M", "120Hz").
3.  **Technical Terms**: Specific technologies or concepts (e.g., "Transformer", "allocator").

**Rules for Removal (Un-bold):**
1.  **Generic Emphasis**: Adjectives or verbs used for emphasis (e.g., "**massive** growth", "**improves** performance", "**key** feature").
2.  **Full Sentences**: Entire sentences or long phrases.
3.  **Clutter**: If there are too many bold items in a short paragraph, be more aggressive in removal to improve readability.

**Input:**
ID: {{id}}
Title: {{title}}
Fields with excessive bolding:
{{fields}}

**Output:**
Return a JSON object where keys are the field names (e.g., "highlights", "critiques") and values are ARRAYS of strings.
Each string must be an EXACT copy of the visible text inside the bold markers (without the **).
Only include the strings that should be KEPT bolded.
If a field has no terms worth keeping bolded, returns an empty array for it.

Output ONLY the JSON object. Do not include markdown code fences like \`\`\`json.

Example Output:
{
  "highlights": ["OpenAI", "GPT-4"],
  "summary": ["$10B valuation"]
}
`;

async function callSiliconFlow(prompt: string) {
  if (!API_KEY) throw new Error('No API Key');

  const body = {
    model: MODEL_ID,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
    temperature: 0.1, // Lower temp for more deterministic JSON
    response_format: { type: 'json_object' }, // Force JSON
  };

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`API Error ${response.status}: ${txt}`);
  }

  const data: any = await response.json();
  return data.choices[0].message.content;
}

async function generateDecisions() {
  const candidatesPath = path.resolve(process.cwd(), 'bolding_candidates_en.json');
  if (!fs.existsSync(candidatesPath)) {
    console.error('bolding_candidates_en.json not found!');
    return;
  }

  const candidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf-8'));
  console.log(
    `🚀 Processing ${candidates.length} English candidates via SiliconFlow (${MODEL_ID})...`,
  );

  const results: any[] = [];
  let processed = 0;

  for (const article of candidates) {
    processed++;
    console.log(`[${processed}/${candidates.length}] Processing ${article.id}...`);

    const fieldsContent = Object.entries(article.fields)
      .map(([key, val]) => {
        return `${key}: ${JSON.stringify(val)}`;
      })
      .join('\n');

    const prompt = PROMPT_TEMPLATE.replace('{{id}}', article.id)
      .replace('{{title}}', article.title)
      .replace('{{fields}}', fieldsContent);

    try {
      const text = await callSiliconFlow(prompt);

      let decision;
      try {
        // Remove thinking block if present (DeepSeek models)
        const cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const jsonText = cleanText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        decision = JSON.parse(jsonText);
      } catch (_jsonErr) {
        console.warn(`JSON Parse Error for ${article.id}:`, text.slice(0, 100));
        // Try fuzzy extraction or skip
        continue;
      }

      results.push({
        id: article.id,
        title: article.title,
        fields: decision,
      });

      // Rate limit protection
      await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5s delay
    } catch (e: any) {
      console.error(`❌ Failed to process ${article.id}:`, e.message);
    }
  }

  fs.writeFileSync('bolding_decisions_en.json', JSON.stringify(results, null, 2));
  console.log(`✅ Completed! Saved ${results.length} decisions to bolding_decisions_en.json`);
}

generateDecisions().catch(console.error);
