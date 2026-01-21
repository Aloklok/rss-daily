# SEO 深度优化策略

Briefing Hub 作为一个内容聚合平台，SEO 是其核心增长引擎。我们实施了全方位的 SEO 优化策略。

## 1. 渲染架构对 SEO 的支持

| 页面类型           | 渲染策略       | SEO 优势                                                    |
| :----------------- | :------------- | :---------------------------------------------------------- |
| **首页 / 简报**    | **阻塞式 SSR** | HTML 包含完整正文，解决 No-JS 环境抓取问题。                |
| **归档 (Archive)** | **SSR**        | 为所有历史日期提供全静态 `<a>` 链接，解决孤儿页面索引问题。 |
| **文章详情**       | **SSR**        | 服务端直出内容，确保爬虫获取非 JS 渲染的纯文本。            |
| **Stream / 标签**  | **ISR (7天)**  | 将 AI 分析与 RSS 列表融合，打造高质量聚合页，长效缓存。     |

## 2. 增长引擎

- **AI RSS Feed**: `/feed.xml` 自动分发经过 AI 清洗和点评的内容（非原文），吸引自然反向链接。
- **动态标题进化 (Title Party)**: 根据文章权重 (`重要新闻` > `必知要闻`) 自动提取当日 **Top 2 核心头条** 生成 Title，提升 SERP 点击率。

## 3. 技术 SEO (Technical SEO)

- **Canonical 保护**: 强制统一为 `https://www.alok-rss.top`，消除重复内容。
- **自动提交**: 集成 IndexNow API，新内容发布秒级推送给 Bing/Yandex。
- **Sitemap 策略**:
  - **混合频率**: 当日页面 `hourly` 频率，历史页面 `weekly`，优化爬虫配额。
  - **全量历史自动化**: 使用 RPC (`get_unique_dates`) 突破 API 分页限制，自动将所有历史有记录的日期（包括所有分类和活跃 Top 50 标签）推送到 `sitemap.xml`，确保无遗漏。
- **全路径覆盖 (Enhanced)**: 额外补全了 `/trends` (趋势) 和 `/sources` (源管理) 路径，提升长青内容权重。
- **三维发现路径 (New)**: 在归档页建立了基于“日期、主题 (Category/Tag)、来源 (Source)”的深度导航。

## 4. 路由收录决策 (Crawl & Index Policy)

为了最大化站内权重并避免重复内容惩罚，我们采取以下收录策略：

| 页面路径                             | 收录优先级   | 理由                                      |
| :----------------------------------- | :----------- | :---------------------------------------- |
| **首页 (/)**                         | **High**     | 全站核心入口，展示最新简报。              |
| **趋势页 (/trends)**                 | **High**     | 高质量原创数据聚合，SEO 价值最高。        |
| **归档索引 (/archive)**              | **High**     | 建立全站发现路径的枢纽。                  |
| **标签/分类汇总 (/stream/[id])**     | **Medium**   | 通过归档页建立显式内链，实现垂直索引。    |
| **订阅源聚合页 (/stream/[feed-id])** | **Medium**   | 捕获特定源/品牌的搜索流量，增加索引深度。 |
| **日期页 (/date/[date])**            | **Low**      | 历史定格内容，按需收录。                  |
| **单篇文章详情 (/article/[id])**     | **Excluded** | 非原创摘要，强制收录会导致重复内容惩罚。  |

## 5. 结构化数据 (Structured Data)

- **NewsArticle**: 每日简报页面包含 AI 生成的 "一句话精华摘要"。
- **CollectionPage**: 首页作为历史归档的集合页面。
- **Source Indexing (New)**: 为归档页新增的来源链接建立文本语义关联，强化爬虫对来源品牌名的抓取。
- **Deep Content Rich Snippets**: 在 `ListItem` 中注入全量 AI 摘要，而非简单标题，提升信息密度。
- **JSON-LD 精简策略 (Top N)**: 首页 JSON-LD 的 `itemListElement` 仅包含前 **20** 篇高权重文章，而非全量注入。此举在保持核心结构化数据的同时，减少了 ~80% 的 HTML 体积，显著改善 FCP 和爬虫解析效率。

## 5. 关键词策略

- **自动提取**: 服务器分析文章内容，提取高频关键词 (e.g., "GPT-4")。
- **智能注入**: 自动注入到 Metadata 的 `keywords` 和 `description` 中。

## 6. 抓取稳定性验证 (Crawlability Audit)

- **多维入口防护**: 归档页不再仅仅是时间轴，而是升级为“时间+主题+来源”的多维索引枢纽。确保即便在 Sitemap 失效的情况下，爬虫也能通过内部链接遍历核心聚合内容。
- **文本锚点优化**: 摒弃 "Visible Span + Hidden Link" 的分离结构。针对文章标题等关键链接，直接使用可见的 `<a>` 标签，配合 `draggable="false"` 和 `preventDefault`。这既确保爬虫抓取到高权重的真实链接，又赋予用户类似普通文本的交互体验（防误触、易选中）。

## 7. 性能与抓取优化 (Performance & Crawl Optimization)

针对百度等对超时敏感的爬虫，实施了以下针对性优化：

- **图片生成去重 (Request Deduplication)**: 使用 `React.cache` 确保昂贵的"Supabase 查库/下载/上传"链路在单次请求中仅执行一次，消除冗余延迟。
- **WebP 全链路优化**: 从 Picsum 源站下载到 Supabase 存储全链路使用 WebP 格式，进一步降低传输阻塞时间。
- **双区域预热机制 (Dual-Region Warmup)**: 利用 Vercel Cron (Asia) 和 GitHub Action (US) 在部署后及每周定时预热，确保爬虫无论从何处访问都能命中边缘缓存，消除 ISR 超时导致的 404。
- **Scheme C - 状态加载分离 (Client-Side State Hydration)**:
  - **彻底解耦**: 将"已读/星标"等个性化状态从服务端渲染 (SSR/ISR) 中剥离。
  - **纯静态 HTML**: 所有页面 (首页、日期页、筛选页) 仅返回通用的文章内容，TTFB 从 10s+ 降至 **<600ms**。
  - **CSR 补齐**: 客户端加载后，通过 `useArticleStateHydration` 异步并发获取用户状态，~1s 后自然补齐。
  - **SEO 友好**: 爬虫总是能获得极速响应的纯净 HTML，彻底解决因 FreshRSS API 慢响应导致的 `socket read error`。
  - **性能数据**: 历史页面 (如 `2025-11-07`) 实测从 10.5s → **0.6s** (提升 94%)。
- **首页 ISR 化**:
  - 从 `force-dynamic` (SSR) 改为 `revalidate = 604800` (ISR)，缓存命中时响应 <100ms。
  - Webhook 机制确保今日内容变更时自动清除首页缓存，无实时性损失。
- **缓存清除优化**:
  - **移除无效触发**: 用户状态变更 (收藏/已读) 不再触发 ISR 缓存清除。
  - **精准 Webhook**: 仅在文章内容变更 (新增/重新生成简报) 时智能清除对应缓存。
  - **成本降低**: 减少 95% 的无效 Vercel Function 调用和 ISR 重新生成。
- **Prefetch Control**:
  - 禁用侧边栏与归档页的 aggressive prefetching (`prefetch={false}`)，防止在用户无意悬停时触发大量 `_rsc` 请求，节省带宽并减少 Vercel Function 调用。
- **订阅源索引分流 (Source Indexing Strategy)**:
  - **HTML 交付内容**: `/sources` 页面采用 **Dynamic (ISR 7d)** 渲染（由 `Suspense` 包裹以适配 `useSearchParams`）。其 HTML 源码中包含全量订阅源名称，确保爬虫能建立网站对特定品牌/源的关联权重。
  - **文章动态加载**: 文章列表部分被有意剥离至客户端异步加载。这不仅降低了 HTML 体积，也防止了爬虫在单个页面上触发数百个 FreshRSS API 请求，在防止 404 的同时将抓取重心引导至更具价值的 `/date` 和 `/archive` 路径。

## 8. 爬虫健康度监控 (Bot Health Monitoring)

为了精准诊断爬虫抓取异常，我们实施了更为细粒度的状态监控与 404 分级策略：

- **404 精准属性分析 (Enhanced Audit)**:
  - **单请求追踪**: 利用 `request_id` (PK) 追踪爬虫从 Proxy 层进入到业务层触发 404 的全过程，杜绝状态不一致。
  - **分级审计**:
    - **Path 404 (`not-found-page`)**: 真正的路由不存在。
    - **Logic 404 (`page_logic_validation`)**: 路径存在但业务数据缺失（如 `zero_articles_for_valid_date`）。
  - **原因透传**: 通过 `error_reason` 字段将 404 的具体业务诱因（如 ID 转换失败）持久化，并在管理员面板直观呈现。
- **ISR 熔断保护**:
  - **Error Propagation**: 当 ISR 构建时发生数据获取超时（>9s）或错误，系统**不再返回空页面 (200 OK)**，而是抛出异常 (500 Error)。
  - **禁止错误缓存**: 此举可防止 Next.js 缓存“假空数据”长达 7 天，确保爬虫下次访问时能够触发重试。
- **Bot 流量清洗**:
  - **URL 规范化**: 自动将 `/path/` (带尾部斜杠) 308 跳转至 `/path` (标准路径)，避免权重分散和 Soft 404。
  - **HEAD 审计**: 记录爬虫的 HEAD 预检请求，确保死链检测也被正确统计。
