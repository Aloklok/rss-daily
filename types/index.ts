// types.ts

// --- 在这里新增品牌类型定义 ---
type BrandedString<T extends string> = string & { __brand: T };

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export type StateTag = BrandedString<'StateTag'>;
export type FreshRssTag = BrandedString<'FreshRssTag'>;
export type SourceCategory = string;

export interface Verdict {
  type: string;
  score: number;
  importance?: string;
}

export interface Tag {
  id: string;
  label: string;
  count?: number; // 【新增】count 属性，设为可选
}

export interface Article {
  id: string | number;
  created_at: string;
  title: string;
  link: string;
  sourceName: string;
  published: string;
  n8n_processing_date?: string; // time when n8n processed the article
  category: string;
  briefingSection: string;
  keywords: string[];
  verdict: Verdict;
  summary?: string;
  tldr: string;
  highlights: string; // Technical Insight
  critiques: string; // Worth Noting
  marketTake: string; // Market Observation
  tags?: (StateTag | FreshRssTag | SourceCategory)[];
}

export type GroupedArticles = {
  [importance: string]: Article[];
};

export interface BriefingReport {
  id: number;
  title: string;
  articles: GroupedArticles;
}

export interface CleanArticleContent {
  title: string;
  content: string; // Sanitized HTML
  source: string;
}

export interface AvailableFilters {
  categories: Tag[]; // 【修改】使用 Tag 类型，它现在也包含 count
  tags: Tag[]; // 【修改】使用 Tag 类型
}
export type Filter = {
  type: 'date' | 'category' | 'tag' | 'starred' | 'search' | 'trends';
  value: string;
};

export interface FreshRSSItem {
  id: string;
  title: string;
  published: number; // Unix timestamp
  alternate?: { href: string }[];
  origin?: { title: string };
  canonical?: { href: string }[];
  categories?: string[];
  annotations?: { id: string }[];
  summary?: { content: string };
  content?: { content: string };
}

// Module Declarations
declare module '@sparticuz/chromium';
declare module 'puppeteer-core';
