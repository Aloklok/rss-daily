/**
 * 简报生成的结构化 Schema 定义
 * 使用 Zod 约束 AI 输出格式，配合 generateObject 实现零容错 JSON 生成
 */
import { z } from 'zod';

/**
 * 单篇文章简报 Schema
 */
export const BriefingItemSchema = z.object({
  articleId: z
    .union([z.string(), z.number()])
    .optional()
    .describe('原始文章 ID（可选，批量模式下由 AI 返回用于匹配）'),
  title: z.string().describe('文章标题（中文）'),
  summary: z.string().describe('文章摘要，200-300 字'),
  tldr: z.string().describe('一句话总结，不超过 50 字'),
  category: z.string().describe('分类标签'),
  keywords: z.array(z.string()).describe('关键词列表，3-5 个'),
  highlights: z.string().describe('技术亮点与创新点'),
  critiques: z.string().describe('犀利点评与不足'),
  marketTake: z.string().describe('市场/行业观点与影响'),
  verdict: z
    .object({
      score: z.number().min(1).max(10).describe('综合评分 1-10'),
      type: z.enum(['知识洞察型', '新闻事件型']).describe('分类类型：知识洞察型 或 新闻事件型'),
      importance: z
        .enum(['必知要闻', '重要新闻', '常规更新'])
        .describe('重要性级别：必知要闻、重要新闻 或 常规更新'),
    })
    .describe('评分与重要性判定'),
});

/**
 * 批量简报结果 Schema（数组）
 */
export const BriefingArraySchema = z.array(BriefingItemSchema);

/**
 * Re-Rank 结果 Schema
 */
export const ReRankResultSchema = z.object({
  selected_ids: z.array(z.string()).describe('筛选后的文章 ID 列表，按相关性排序'),
});

export type BriefingItem = z.infer<typeof BriefingItemSchema>;
