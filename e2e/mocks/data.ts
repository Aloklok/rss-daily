export const REAL_ID = '1001';

export const MOCK_ARTICLE = {
  id: REAL_ID,
  title:
    '超越 IP 列表：机器人和代理的注册表格式 - Beyond IP lists: a registry format for bots and agents',
  link: 'https://blog.cloudflare.com/agent-registry/',
  sourceName: 'Cloudflare 博客',
  published: '2025-01-01T04:00:00+08:00',
  n8n_processing_date: '2025-01-01T04:00:00+08:00',
  category: 'AI与前沿科技',
  keywords: ['加密认证', '机器人注册表', 'AI代理', 'Web Bot Auth', 'Cloudflare'],
  verdict: {
    type: '知识洞察型',
    score: 8,
    importance: '重要新闻',
  },
  summary:
    '这篇文章提出了一个解决机器人和AI代理身份认证和发现的**行业标准新方向**。Cloudflare正尝试通过“Web Bot Auth”协议和配套的注册表格式，让网站运营者能更可靠地识别和管理流量。',
  content:
    '<p>这是真实抓取的文章内容模拟。Cloudflare 提出的 <strong>Web Bot Auth</strong> 协议旨在解决 AI 时代的机器人识别问题。</p><p>核心技术包括：</p><ul><li>加密签名</li><li>元数据注册表</li><li>速率控制策略</li></ul>',
  highlights: '核心是**从脆弱的IP/User-Agent识别转向加密认证**。',
  critiques: '这玩意儿要真正普及起来，需要**整个生态的共同努力**。',
  marketTake: '机器流量的识别与管理将成为未来两年的核心挑战。',
  tldr: 'Cloudflare提出机器人和代理的加密认证注册表格式。',
  briefingSection: '重要新闻',
  tags: [],
};

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
