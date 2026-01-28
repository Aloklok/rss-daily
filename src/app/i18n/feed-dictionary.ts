// src/app/i18n/feed-dictionary.ts

export type DictionaryValue = string | { label: string; slug: string };

export const categoryEmojis: Record<string, string> = {
  基础设施: '☁️',
  图: '🌏',
  播客: '🎙️',
  架构设计: '🏗️',
  工程实践: '📦',
  前端: '🖥',
  'AI 大数据': '🤖',
  AI: '🤖',
  未分类: '📂',
};

// 1. 分类翻译 (Keys 应与数据库一致，即不带 Emoji)
export const categoryTranslations: Record<string, DictionaryValue> = {
  基础设施: '☁️ Infrastructure',
  图: '🌏 Daily Picks',
  播客: '🎙️ Podcasts',
  架构设计: '🏗️ Architecture',
  工程实践: '📦 Engineering',
  前端: '🖥 Frontend',
  'AI 大数据': '🤖 AI & Big Data',
  AI: '🤖 AI',
  未分类: 'Uncategorized',
};

// 2. 标签翻译 (来自 FreshRSS /tag/list)
export const tagTranslations: Record<string, DictionaryValue> = {
  AI: 'AI',
  'PM&数据': 'Product & Data',
  云: 'Cloud',
  前端: 'Frontend',
  后端: 'Backend',
  安全: 'Security',
  架构: 'Architecture',
  案例: 'Case Studies',
  知识点: 'Key Concepts',
  趋势: 'Trends',
};

// 3. 订阅源翻译 (Feed Title Mapping)
// 注意：必须使用订阅源的 *原始标题* 作为 Key
export const feedTranslations: Record<string, DictionaryValue> = {
  // AWS & Cloud
  'AWS 安全': 'AWS - Security',
  'AWS 容器': 'AWS - Containers',
  'AWS 数据库': 'AWS - Databases',
  'AWS 架构': 'AWS - Architecture',
  'Cloudflare 博客': 'Cloudflare Blog',
  CNCF: 'CNCF',
  'InfoQ - 云计算': 'InfoQ - Cloud',
  'Vercel News': 'Vercel News',
  阿里云技术博客: 'Alibaba Cloud Tech',

  // Photography & Daily
  'NASA天文 - 每日一图': 'NASA APOD',
  'Nat Geo Photo of the Day': 'Nat Geo POD',
  每日环球视野: 'Global Vision',

  // Podcasts
  'OnBoard! - 播客': 'OnBoard! Podcast',
  'Web Worker-前端程序员都爱听': 'Web Worker',
  "What's Next｜科技早知道 - 播客": "What's Next Podcast",
  '乱翻书 - 播客': 'Book Flips',
  '内核恐慌 - 播客': 'Kernel Panic',
  '后互联网时代的乱弹 - 播客': 'Post-Internet Talk',
  '硅谷101 - 播客': 'SV101 Podcast',
  科技乱炖: 'Tech Scramble',

  // Architecture & Engineering
  'ACM Queue (资深架构)': 'ACM Queue',
  'ByteByteGo (主流模式)': 'ByteByteGo',
  'ByteByteGo (视频)': 'ByteByteGo Videos',
  'InfoQ - 后端': 'InfoQ - Backend',
  'InfoQ - 架构': 'InfoQ - Architecture',
  'Julia Evans': 'Julia Evans',
  'Martin Fowler (软件设计)': 'Martin Fowler',
  'The Pragmatic Engineer (实用工程师)': 'Pragmatic Engineer',
  'Thoughtworks Engineering': 'Thoughtworks Tech',
  阮一峰的网络日志: 'Ruan YiFeng Blog',
  'Netflix Technology': 'Netflix Tech',
  Thoughtworks: 'Thoughtworks',
  'Uber Blog': 'Uber Tech',
  美团技术团队: 'Meituan Tech',

  // Frontend & Web
  'Fireship (视频)': 'Fireship',
  'InfoQ 话题 - 大前端': 'InfoQ - Frontend',
  'Josh Comeau 博客': 'Josh Comeau Blog',
  'WEB设计 - Smashing Magazine': 'Smashing Magazine',
  前端精读周刊: 'Frontend Weekly',
  掘金前端本周最热: 'Juejin Frontend Hottest',

  // AI & Data
  'Data Engineering Weekly': 'Data Eng Weekly',
  'InfoQ - AI＆大模型': 'InfoQ - AI & LLM',
  'InfoQ 话题 - 大数据': 'InfoQ - Big Data',
};

// 4. 定型分类翻译 (Verdict Type Mapping)
export const verdictTranslations: Record<string, string> = {
  知识洞察型: 'Insight',
  新闻事件型: 'News',
};
