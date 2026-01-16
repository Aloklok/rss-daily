import { generateSiliconFlow } from './siliconflow';
import { ENABLE_AI_ROUTER, ROUTER_MODEL_ID } from '../constants';

/**
 * AI Router Intents
 */
export enum RouterIntent {
  DIRECT = 'DIRECT', // Chat, Greetings, Logic Puzzles (No External Data)
  RAG_LOCAL = 'RAG_LOCAL', // Questions about specific articles, "yesterday's news", summary of X
  SEARCH_WEB = 'SEARCH_WEB', // Real-time facts, stock prices, weather, "who is X"
}

export interface RouterResult {
  intent: RouterIntent;
  reasoning: string;
  modifiedQuery?: string; // Optional: Router might refine the query for the downstream model
}

const ROUTER_PROMPT = `
你是一个 AI 助手的高速流量路由器。
你的唯一任务是将用户的查询分类为以下三种意图之一。

### 意图分类 (Intents)
1. "DIRECT": 闲聊、问好、逻辑谜题、代码问题、创意写作，或者关于**你（AI）自身**的问题（如身份、版本、能力、训练数据）。
   - 示例: "你好", "写个 python 脚本", "1+1等于几？", "你是 GPT-4 吗？", "你的训练数据截止到哪？"
2. "RAG_LOCAL": 用户询问**本地 RSS 订阅源 / 数据库**中的内容。包括关于"文章"、"新闻"、"摘要"的提问，或具体的科技话题。
   - 示例: "总结最新的 AI 新闻" -> Intent: RAG_LOCAL, Modified: "最新 AI 新闻总结"
   - 示例: "DeepSeek 最近有什么动态？" -> Intent: RAG_LOCAL, Modified: "DeepSeek 动态"
   - 示例: "现在的倒排索引技术流行什么？" -> Intent: RAG_LOCAL, Modified: "倒排索引 流行技术"
3. "SEARCH_WEB": 用户询问**实时的外部信息**，RSS 库里肯定没有的具体事实，或明确要求上网搜索。
   - 示例: "英伟达现在的股价", "东京今天天气"。

### 输出格式 (严格 JSON)
{
  "intent": "DIRECT" | "RAG_LOCAL" | "SEARCH_WEB",
  "reasoning": "简短解释（< 10字）",
  "modifiedQuery": "针对向量搜索优化的查询词。重要：必须使用与用户查询相同的语言。严禁翻译专有名词（如 'SiliconFlow', 'DeepSeek', '倒排索引'），除非用户明确要求。"
}

### 用户查询
{{QUERY}}

### 最近对话历史 (参考上下文)
{{HISTORY}}
`;

/**
 * Classifies the user's intent using a lightweight model.
 * Default: deepseek-ai/DeepSeek-V3 (SiliconFlow Free) or Flash-Lite
 */
export async function classifyIntent(query: string, history: any[] = []): Promise<RouterResult> {
  // 1. Feature Flag Check
  if (!ENABLE_AI_ROUTER) {
    return { intent: RouterIntent.RAG_LOCAL, reasoning: 'Router Disabled (Config)' };
  }

  const cleanQuery = query.trim();

  // 2. Fast Path: Heuristics (Optional Rules)
  // If query is very short ('hi', 'test', '你好'), skip LLM to save time and avoid R1 overthinking
  if (cleanQuery.length < 5) {
    console.log('[AI Router] Fast Path: DIRECT (Short query)');
    return { intent: RouterIntent.DIRECT, reasoning: 'Short query heuristic' };
  }

  // 3. LLM Classification for complex queries
  // Use DeepSeek-V3 or R1-Distill-7B as the router.
  // Ideally use the fastest available. Let's default to a fast one.
  const ROUTER_MODEL = ROUTER_MODEL_ID;

  // Use last 2 turns for context (User + Assistant + User...)
  // We only need the text context for ambiguity resolution.
  // Exclude the current query from history if it's already there (it might be passed in history by caller)
  // The caller (route.ts) passes `messages` which includes the current user message at the end.
  // We want the *previous* context.
  const previousHistory = history.length > 1 ? history.slice(0, -1).slice(-4) : [];
  const historyText =
    previousHistory.length > 0
      ? previousHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
      : 'None';

  const systemPrompt = ROUTER_PROMPT.replace('{{QUERY}}', cleanQuery).replace(
    '{{HISTORY}}',
    historyText,
  );

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: cleanQuery },
  ];

  try {
    // Force non-streaming for JSON parsing
    const responseText = await generateSiliconFlow(messages, ROUTER_MODEL);

    // 1. Strip <think> tags (DeepSeek R1 specific)
    const cleanText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // 2. Extract JSON object (find first { and last })
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleanText;

    // 3. Clean potential markdown code blocks if still present
    const finalJsonStr = jsonStr.replace(/```json|```/g, '').trim();

    const result = JSON.parse(finalJsonStr);

    // Validate
    if (
      ![RouterIntent.DIRECT, RouterIntent.RAG_LOCAL, RouterIntent.SEARCH_WEB].includes(
        result.intent,
      )
    ) {
      throw new Error(`Invalid intent: ${result.intent}`);
    }

    console.log(`[AI Router] Classified: ${result.intent} | Reasoning: ${result.reasoning}`);
    return result as RouterResult;
  } catch (error) {
    console.warn(`[AI Router] Classification Failed:`, error);
    // Fallback: Safe Default.
    // If classification fails, usually it's "Direct" or "RAG".
    // For "Hello" (if it bypassed heuristic), we don't want to search.
    // But safely, let's default to RAG_LOCAL as specificied before,
    // OR DIRECT if the query looks simple? No, stick to RAG_LOCAL to be safe,
    // but since we upgraded heuristics, fallback usually implies complex query failure.
    return { intent: RouterIntent.RAG_LOCAL, reasoning: 'Fallback on Error' };
  }
}
