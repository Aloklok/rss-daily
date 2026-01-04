import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// --- 搜索算法调优配置 (修改以下数值后运行此脚本同步至数据库) ---
const CONFIG = {
  // 1. 过滤门槛
  semantic_threshold: 0.65, // 提高到 0.65：过滤掉那些“沾点边但完全不相关”的噪音（如天文图片）。

  // 2. 排序权重 (数字越小，在搜索结果中排得越靠前)
  rank_keyword_match: 1, // 场景 A: 标题、分类或核心关键词命中。
  rank_high_similarity: 2, // 场景 B: 语义极度相关 (相似度 > 0.75)。
  rank_normal_similarity: 3, // 场景 C: 语义基本相关 (相似度 > 0.65)。

  // 3. 数量限制
  match_count: 20, // 最终返回多少条结果
};
// ---------------------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRPC() {
  console.log(
    `🚀 Updating Supabase RPC with Threshold: ${CONFIG.semantic_threshold}, Match Count: ${CONFIG.match_count}...`,
  );

  const sql = `
-- 先删除旧函数，防止因为返回类型变动导致的 42P13 错误
DROP FUNCTION IF EXISTS hybrid_search_articles(text, vector, integer);

CREATE OR REPLACE FUNCTION hybrid_search_articles(
  query_text TEXT,
  query_embedding VECTOR(768),
  match_count INT DEFAULT ${CONFIG.match_count}
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  "sourceName" TEXT,
  published TIMESTAMPTZ,
  category TEXT,
  summary TEXT,
  tldr TEXT,
  link TEXT,
  highlights TEXT,
  critiques TEXT,
  "marketTake" TEXT,
  verdict JSONB,
  keywords JSONB,
  similarity FLOAT,
  match_priority INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a."sourceName",
    a.published,
    a.category,
    a.summary,
    a.tldr,
    a.link,
    a.highlights,
    a.critiques,
    a."marketTake",
    a.verdict,
    a.keywords,
    (CASE WHEN query_embedding IS NOT NULL THEN 1 - (a.embedding <=> query_embedding) ELSE 0 END) AS similarity,
    CASE 
      WHEN 
        a.title ILIKE '%' || query_text || '%'      -- 命中了标题
        OR a.category ILIKE '%' || query_text || '%'   -- 命中了 AI 分类
        OR a.keywords::text ILIKE '%' || query_text || '%' -- 命中了 AI 关键词 (jsonb cast)
      THEN ${CONFIG.rank_keyword_match} 
      WHEN (query_embedding IS NOT NULL AND (1 - (a.embedding <=> query_embedding) > 0.75)) THEN ${CONFIG.rank_high_similarity} -- 极度相关
      WHEN (query_embedding IS NOT NULL) THEN ${CONFIG.rank_normal_similarity} -- 普通语义相关
      ELSE 4 -- 兜底：仅在语义失败且没命中关键词时（理论上 WHERE 会过滤掉，但保留以防万一）
    END AS match_priority
  FROM articles a
  WHERE 
    a.title ILIKE '%' || query_text || '%'
    OR a.category ILIKE '%' || query_text || '%'
    OR a.keywords::text ILIKE '%' || query_text || '%'
    OR (query_embedding IS NOT NULL AND (1 - (a.embedding <=> query_embedding) > ${CONFIG.semantic_threshold}))
  ORDER BY match_priority ASC, similarity DESC
  LIMIT match_count;
END;
$$;
    `;

  try {
    const { error } = await supabase.rpc('execute_sql', { query: sql });
    if (error) throw error;
    console.log('✅ Search RPC updated successfully via execute_sql!');
  } catch (_err: any) {
    console.error('❌ Could not update RPC directly (this is normal for security reasons).');
    console.log(
      '👉 Please COPY the SQL above and PASTE it into your Supabase SQL Editor to finish the update.',
    );
  }
}

updateRPC();
