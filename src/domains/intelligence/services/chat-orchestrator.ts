import { getSupabaseClient } from '@/shared/infrastructure/supabase';
import { generateEmbedding } from './embeddings';
import { reRankArticles, chatWithGemini, getChatSystemPrompt } from './gemini';
import { CHAT_CONTEXT_PROMPT_TEMPLATE } from '../constants';
import { classifyIntent, RouterIntent } from './router';
import { Article } from '@/shared/types';

export interface ChatRequest {
  messages: any[];
  useSearch?: boolean;
  model: string;
  isSmallTalkMode?: boolean;
}

export interface ChatOrchestrationResult {
  stream: any;
  intent: RouterIntent;
  finalArticles: Article[];
  model: string;
  isSiliconFlow: boolean;
}

/**
 * Orchestrates the AI Chat RAG pipeline.
 * Moves complex decision logic and retrieval outside of the API route.
 */
export async function orchestrateChat(request: ChatRequest): Promise<ChatOrchestrationResult> {
  const { messages, useSearch = true, model: requestedModel, isSmallTalkMode = false } = request;

  // 1. Model & Provider Normalization
  const [requestedId, keyAlias] = (requestedModel || 'gemini-2.0-flash').split('@');
  let model = requestedId === 'gemini-3-flash' ? 'gemini-2.0-flash' : requestedId;

  const looksLikeSiliconFlow = model.includes('/');
  if (!model.startsWith('gemini-') && !model.startsWith('gemma-') && !looksLikeSiliconFlow) {
    model = 'gemini-2.0-flash';
  }

  const isSiliconFlow = looksLikeSiliconFlow;
  const lastUserMessage = messages[messages.length - 1]?.content;

  if (!lastUserMessage) {
    throw new Error('Message is required');
  }

  // 2. Intent Classification
  let intent = RouterIntent.RAG_LOCAL;
  if (isSmallTalkMode) {
    intent = RouterIntent.DIRECT;
  } else {
    try {
      const routerResult = await classifyIntent(lastUserMessage, messages);
      intent = routerResult.intent;
    } catch (e) {
      console.warn('Router failed, falling back to RAG_LOCAL', e);
    }
  }

  // 3. Retrieval & Reranking (if needed)
  let finalArticles: any[] = [];
  if (intent === RouterIntent.RAG_LOCAL) {
    const supabase = getSupabaseClient();
    const queryEmbedding = await generateEmbedding(lastUserMessage, 'RETRIEVAL_QUERY', 'ai');

    const { data: searchResults, error: rpcError } = await supabase.rpc('hybrid_search_articles', {
      query_text: lastUserMessage.trim(),
      query_embedding: queryEmbedding,
      match_count: 50,
    });

    if (rpcError) throw rpcError;

    const initialCandidates = (searchResults || []).filter((a: any) => (a.similarity || 0) > 0.5);
    const targetLimit = model.startsWith('gemini-') ? 30 : 10;

    if (initialCandidates.length > targetLimit) {
      const selectedIds = await reRankArticles(
        initialCandidates,
        lastUserMessage,
        undefined,
        keyAlias,
        targetLimit,
      );
      finalArticles = initialCandidates.filter((a: any) => selectedIds.includes(a.id));
      if (finalArticles.length === 0) finalArticles = initialCandidates.slice(0, targetLimit);
    } else {
      finalArticles = initialCandidates;
    }
  }

  // 4. Effective Feature Flags
  let effectiveUseSearch = useSearch;
  if (intent === RouterIntent.DIRECT) effectiveUseSearch = false;
  if (intent === RouterIntent.SEARCH_WEB) effectiveUseSearch = true;

  // 5. Provider Execution
  let stream;
  if (isSiliconFlow) {
    const { streamSiliconFlow } = await import('./siliconflow');
    let enrichedMessages = [];

    if (intent === RouterIntent.DIRECT) {
      const SIMPLE_SYSTEM_PROMPT = `你是一名 Base 中国大陆的 **首席架构师/产品总监**。\n你的风格：犀利、工程化、接地气、拒绝公关黑话。\n请直接回答用户问题，不要使用 [N] 引用格式，也不要进行背景核对。`;
      enrichedMessages = [{ role: 'system', content: SIMPLE_SYSTEM_PROMPT }, ...messages];
    } else {
      const chatSystemPromptRaw = await getChatSystemPrompt();
      const chatSystemPrompt = chatSystemPromptRaw.replace(
        /{{COUNT}}/g,
        finalArticles.length.toString(),
      );

      const articleList =
        finalArticles.length > 0
          ? finalArticles
              .map((a: any, i: number) => {
                const dateStr = new Date(a.published).toLocaleDateString();
                return `【文章索引：[${i + 1}]】\n标题: ${a.title}\n来源: ${a.sourceName || 'Unknown'}\n日期: ${dateStr}\nTLDR: ${a.tldr || '无'}\n摘要: ${a.summary || '无'}\n技术亮点: ${a.highlights || '无'}\n犀利点评: ${a.critiques || '无'}\n市场观点: ${a.marketTake || '无'}`;
              })
              .join('\n\n---\n\n')
          : '（未匹配到相关本地文章）';

      const contextPrompt = CHAT_CONTEXT_PROMPT_TEMPLATE.replace(
        /{{COUNT}}/g,
        finalArticles.length.toString(),
      )
        .replace('{{ARTICLE_LIST}}', articleList)
        .replace('{{QUERY}}', lastUserMessage);

      enrichedMessages = [
        { role: 'system', content: chatSystemPrompt },
        ...messages.slice(0, -1),
        { role: 'user', content: contextPrompt },
      ];
    }
    stream = streamSiliconFlow(enrichedMessages, model, effectiveUseSearch);
  } else {
    stream = await chatWithGemini(
      messages,
      finalArticles,
      lastUserMessage,
      effectiveUseSearch,
      model,
      keyAlias,
    );
  }

  return {
    stream,
    intent,
    finalArticles,
    model,
    isSiliconFlow,
  };
}
