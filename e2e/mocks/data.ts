export const REAL_ID = '1001';

// 基础模板
const BASE_ARTICLE = {
  sourceName: 'Cloudflare 博客',
  category: 'AI与前沿科技',
  keywords: ['加密认证', '机器人注册表', 'AI代理', 'Web Bot Auth'],
  summary: 'Cloudflare 提出的 Web Bot Auth 协议旨在解决 AI 时代的机器人识别问题。',
  content: '<p>这是真实抓取的文章内容模拟。</p>',
  highlights: '核心是**从脆弱的IP/User-Agent识别转向加密认证**。',
  critiques: '需要生态共同努力。',
  marketTake: '机器流量管理是未来挑战。',
  // 必须包含 tags 数组
  tags: [],
};

// 辅助函数：生成不同时段和类型的文章
const createArticle = (
  id: string,
  slot: 'morning' | 'afternoon' | 'evening',
  type: 'insight' | 'news',
) => {
  // 映射时间 (假设测试日期为 2025-01-01)
  // Morning: 08:00, Afternoon: 14:00, Evening: 20:00 (CST)
  const timeMap = {
    morning: '2025-01-01T08:00:00+08:00',
    afternoon: '2025-01-01T14:00:00+08:00',
    evening: '2025-01-01T20:00:00+08:00',
  };

  const verdictMap = {
    insight: { type: '知识洞察型', score: 8, importance: '深度关注' },
    news: { type: '时事新闻与更新', score: 5, importance: '常规更新' },
  };

  return {
    ...BASE_ARTICLE,
    id: id,
    title: `[${slot.toUpperCase()}] ${type === 'insight' ? '深度洞察' : '时事新闻'}: 文章标题示例`,
    link: `https://example.com/${id}`,
    published: timeMap[slot],
    n8n_processing_date: timeMap[slot],
    verdict: verdictMap[type],
    briefingSection: type === 'insight' ? '深度知识与洞察' : '时事新闻与更新',
    tldr: `这是 ${slot} 的 ${type} 文章 TLDR。`,
  };
};

export const MOCK_ARTICLES_POOL = {
  // Morning
  morning_insight: createArticle('id-morning-insight', 'morning', 'insight'),
  morning_news: createArticle('id-morning-news', 'morning', 'news'),

  // Afternoon
  afternoon_insight: createArticle('id-afternoon-insight', 'afternoon', 'insight'),
  afternoon_news: createArticle('id-afternoon-news', 'afternoon', 'news'),

  // Evening
  evening_insight: createArticle('id-evening-insight', 'evening', 'insight'),
  evening_news: createArticle('id-evening-news', 'evening', 'news'),
};

// 保持向下兼容 (很多旧测试用了 MOCK_ARTICLE)
export const MOCK_ARTICLE = MOCK_ARTICLES_POOL.morning_insight;

/**
 * 真实 FreshRSS API 返回的数据样本 (2025-12-29 抓取，ID: 000646f2c89c729a)
 * 验证了 "tags" 字段的存在及其与 "categories" 的区别。
 *
 * 关键观察：
 * 1. "tags": ["架构", "前端"] - 仅包含纯文本标签名，这是真正的用户标签。
 * 2. "categories" 包含混杂数据：
 *    - 用户标签全名: "user/-/label/架构", "user/-/label/前端"
 *    - 文件夹/分类: "user/-/label/🖥 前端" (注意它不在 tags 数组中，说明它是文件夹！), "AI编程", "Vue.js"
 *    - 系统状态: "user/-/state/..."
 *
 * 结论：使用 FreshRSS 返回的 `tags` 数组是最准确区分 Tag 和 Folder 的方法，无需额外 API 调用。
 */
export const REAL_FRESHRSS_EXAMPLE = {
  'frss:id': '1766858421990042',
  id: 'tag:google.com,2005:reader/item/000646f2c89c729a',
  crawlTimeMsec: '1766858421990',
  timestampUsec: '1766858421990042',
  published: 1766733139,
  title: '【AI 编程实战】第 5 篇：Pinia 状态管理 - 从混乱代码到优雅架构',
  canonical: [
    {
      href: 'https://juejin.cn/post/7587738151658881024',
    },
  ],
  alternate: [
    {
      href: 'https://juejin.cn/post/7587738151658881024',
    },
  ],
  categories: [
    'user/-/state/com.google/reading-list',
    'user/-/label/🖥 前端',
    'user/-/state/org.freshrss/main',
    'user/-/state/com.google/read',
    'user/-/label/架构',
    'user/-/label/前端',
    '前端',
    'Vue.js',
    'AI编程',
  ],
  origin: {
    streamId: 'feed/6',
    htmlUrl: 'https://juejin.im/frontend?sort=weekly_hottest',
    title: '掘金前端本周最热',
  },
  author: 'HashTang',
  tags: ['架构', '前端'],
  annotations: [
    {
      id: 'user/-/state/com.google/read',
    },
  ],
};

/**
 * 真实 FreshRSS /tag/list API 返回的数据 (2025-12-30 抓取)
 * 用于测试侧边栏"分类"和"标签"的获取与展示
 *
 * 数据结构说明：
 * - type === 'folder': 文件夹（分类），通常无 count/unread_count
 * - type === 'tag': 标签，通常有 unread_count
 * - 系统状态（/state/com.google/ 和 /state/org.freshrss/）已在客户端过滤
 */
export const MOCK_FRESHRSS_TAG_LIST = {
  tags: [
    // 系统状态（应被过滤掉）
    {
      id: 'user/-/state/com.google/starred',
    },
    {
      id: 'user/-/state/com.google/reading-list',
    },
    {
      id: 'user/-/state/org.freshrss/main',
    },
    {
      id: 'user/-/state/org.freshrss/important',
    },
    // 用户创建的分类（文件夹）
    {
      id: 'user/-/label/未分类',
      type: 'folder',
    },
    {
      id: 'user/-/label/☁️ 基础设施',
      type: 'folder',
    },
    {
      id: 'user/-/label/🌏 图',
      type: 'folder',
    },
    {
      id: 'user/-/label/🎙️ 播客',
      type: 'folder',
    },
    {
      id: 'user/-/label/🏗️ 架构设计',
      type: 'folder',
    },
    {
      id: 'user/-/label/📦 工程实践',
      type: 'folder',
    },
    {
      id: 'user/-/label/🖥 前端',
      type: 'folder',
    },
    {
      id: 'user/-/label/🤖 AI 大数据',
      type: 'folder',
    },
    // 用户创建的标签
    {
      id: 'user/-/label/AI',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/PM&数据',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/云',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/前端',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/后端',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/安全',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/架构',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/案例',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/知识点',
      type: 'tag',
      unread_count: 0,
    },
    {
      id: 'user/-/label/趋势',
      type: 'tag',
      unread_count: 0,
    },
  ],
};
