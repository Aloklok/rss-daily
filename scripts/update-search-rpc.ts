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
-- 0. 确保扩展已开启
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- 1. 创建 PGroonga 专用索引 (修复多列索引不支持 JSONB 的问题)
-- 拆分为两个索引：
-- 索引 A: 文本字段 (Text)
CREATE INDEX IF NOT EXISTS ix_articles_pgroonga_content 
ON articles USING pgroonga (title, summary, category);

-- 索引 B: JSONB 字段 (Keywords)
CREATE INDEX IF NOT EXISTS ix_articles_pgroonga_keywords 
ON articles USING pgroonga (keywords);

-- 2. 重建 RPC 函数
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
-- 明确设置 search_path，确保无论 extension 在哪个 schema 都能被找到
SET search_path = public, extensions
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
      -- 1. PGroonga 全文匹配 (Rank 1)
      WHEN (
        a.title &@~ query_text 
        OR a.summary &@~ query_text
        -- 注意：PGroonga 支持直接搜索 JSONB，不需要 cast ::text，否则无法走索引
        OR a.keywords &@~ query_text
      ) THEN 1
      
      -- 2. 向量高相似度 (Rank 2)
      WHEN (query_embedding IS NOT NULL AND (1 - (a.embedding <=> query_embedding) > 0.80)) THEN 2
      
      -- 3. 向量中等相似度 (Rank 3)
      WHEN (query_embedding IS NOT NULL) THEN 3
      
      ELSE 4
    END AS match_priority
  FROM articles a
  WHERE 
    -- 混合筛选
    (
      a.title &@~ query_text 
      OR a.summary &@~ query_text
      OR a.keywords &@~ query_text
    )
    OR 
    (query_embedding IS NOT NULL AND (1 - (a.embedding <=> query_embedding) > ${CONFIG.semantic_threshold}))
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
