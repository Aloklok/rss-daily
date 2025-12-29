# SEO 深度优化策略

Briefing Hub 作为一个内容聚合平台，SEO 是其核心增长引擎。我们实施了全方位的 SEO 优化策略。

## 1. 渲染架构对 SEO 的支持

| 页面类型          | 渲染策略       | SEO 优势                                                |
| :---------------- | :------------- | :------------------------------------------------------ |
| **首页 / 简报**   | **阻塞式 SSR** | HTML 包含完整正文，解决 No-JS 环境抓取问题。            |
| **文章详情**      | **SSR**        | 服务端直出内容，确保爬虫获取非 JS 渲染的纯文本。        |
| **Stream / 标签** | **ISR (7天)**  | 将 AI 分析与 RSS 列表融合，打造高质量聚合页，长效缓存。 |

## 2. 增长引擎

- **AI RSS Feed**: `/feed.xml` 自动分发经过 AI 清洗和点评的内容（非原文），吸引自然反向链接。
- **动态标题进化 (Title Party)**: 根据文章权重 (`重要新闻` > `必知要闻`) 自动提取当日 **Top 2 核心头条** 生成 Title，提升 SERP 点击率。

## 3. 技术 SEO (Technical SEO)

- **Canonical 保护**: 强制统一为 `https://www.alok-rss.top`，消除重复内容。
- **自动提交**: 集成 IndexNow API，新内容发布秒级推送给 Bing/Yandex。
- **Sitemap 策略**:
  - **混合频率**: 当日页面 `hourly` 频率，历史页面 `weekly`，优化爬虫配额。
  - **自动化**: 自动将所有分类和活跃 Top 50 标签推送到 `sitemap.xml`。

## 4. 结构化数据 (Structured Data)

- **NewsArticle**: 每日简报页面包含 AI 生成的 "一句话精华摘要"。
- **CollectionPage**: 首页作为历史归档的集合页面。
- **Deep Content Rich Snippets**: 在 `ListItem` 中注入全量 AI 摘要，而非简单标题，提升信息密度。

## 5. 关键词策略

- **自动提取**: 服务器分析文章内容，提取高频关键词 (e.g., "GPT-4")。
- **智能注入**: 自动注入到 Metadata 的 `keywords` 和 `description` 中。
