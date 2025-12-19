# Briefing Hub 项目文档

> [!NOTE]
> **SEO 与 渲染架构概览**
>
> | 页面类型          | 路由                | 渲染策略       | 数据获取              | 可爬取性                    |
> | :---------------- | :------------------ | :------------- | :-------------------- | :-------------------------- |
> | **首页 / 简报**   | `/`, `/date/[date]` | **阻塞式 SSR** | 服务端 `fetch` (阻塞) | ✅ 完全 (HTML 包含完整内容) |
> | **文章详情**      | `/article/[id]`     | **SSR**        | 服务端 `fetch` (阻塞) | ✅ 完全 (服务端内容获取)    |
> | **Stream / 标签** | `/stream/[id]`      | **ISR (7天)**  | 按需重验证            | ✅ 完全 (服务端数据水合)    |
> | **趋势**          | `/trends`           | **SSG**        | 构建时生成            | ✅ 完全 (静态 HTML)         |
>
> **核心 SEO 特性:**
>
> - **零客户端内容获取**: 所有文章内容均在服务端获取。
> - **内部链接**: 文章标题链接至 `/article/[id]`，确保深度爬取。
> - **Sitemap**: 全自动生成。分类（每日），标签（活跃 Top 50），简报（每日）。
> - **Canonical**: 强制统一为 `https://www.alok-rss.top`。

## 项目概述

Briefing Hub 是一个基于 **Next.js (App Router)** 和 TypeScript 构建的现代化 RSS 阅读器前端。它采用 **混合渲染架构 (SSR + ISR + SSG)**，结合 Supabase 作为文章详情的数据源，使用 FreshRSS 作为 RSS 订阅和状态管理的核心服务。应用提供了一个简洁、高效的界面来浏览每日简报、管理文章分类和标签，并支持全文阅读和渐进式 Web 应用（PWA）功能。

## 核心特性

- **混合渲染架构**：
  - **每日简报**：采用阻塞式服务器端渲染，确保在首屏 HTML 中直接返回完整内容（含正文），彻底解决 No-JS 环境下的 SEO 和加载问题。
  - **文章详情**：文章正文由服务端直接拉取，不再依赖客户端 JS，实现“服务端直出”的完美阅读体验。
    - **统一数据源**: 文章阅读模态框与 ISR 详情页 (`/article/[id]`) 共享完全相同的 `fetchArticleContentServer` 获取与清洗逻辑，确保无论从何处阅读，内容与缓存策略皆一致。
  - **趋势页面 (SSG)**：趋势工具页面采用静态站点生成，构建时生成，访问速度极快。
- **统一数据视图**：无论是浏览每日简报、分类、标签还是收藏夹，所有文章数据都经过融合处理，确保信息完整一致。
- **响应式状态管理**：应用状态在所有组件间实时同步。
  - **实时反馈**: 收藏、标记已读等操作在服务端确认后立即更新全局状态，确保数据严格一致。
  - **混合数据源**: "我的收藏" 列表采用服务端预取 (SSR) + 客户端实时状态 (Zustand) 的混合模式，既保证首屏速度，又确保状态实时一致。
- **高性能数据获取**：利用 Next.js 的扩展 `fetch` API 和 React Query，实现智能缓存和去重。
- **高可用性设计**：
  - **超时熔断**：数据库查询内置 10s 超时保护，防止冷启动或网络波动导致页面无限挂起。
  - **错误边界**：页面级错误捕获，确保即使后端故障也能向用户展示友好的重试界面。
- **渐进式 Web 应用 (PWA)**：支持离线访问和快速加载，提供接近原生应用的体验。
- **双模访问控制**：
  - **公共只读模式**：默认允许公众访问，可以浏览所有简报和文章，但无法进行任何修改。
  - **管理员模式**：通过 URL Token (`?token=...`) 激活，系统会自动设置持久化 Cookie (`site_token`)，无需每次访问都携带 Token。拥有完整权限（如标记已读、收藏、查看原始 RSS）。
- **第三方嵌入支持**:
  - **Widget 集成**: 提供了专门的 Widget 路由 (如 `/widget/clock.html`)，配置了宽松的 CSP (`frame-ancestors *`)，支持将组件无缝嵌入到 Notion, start.me 等效率工具仪表盘中。
- **SEO 深度优化**:
  - **全站 SSR/ISR 覆盖**: 不仅包括每日简报，**标签/分类页面 (`/stream/[id]`)** 全面升级为 ISR 增量静态再生（7天缓存），将 FreshRSS 文章列表与 Supabase AI 数据融合，打造高质量内容聚合页。
  - **自动关键词注入**:
    - **自动关键词提取**: 服务器自动分析页面内所有文章，提取高频关键词（如 "GPT-4", "Transformer"）。
    - **智能注入**: 将关键词注入 Metadata (`keywords`, `description`)。
    - **可视化增强**: 重构了 **Stream 列表页头**。智能区分 "分类" (无计数) 与 "标签" (含计数) 的展示逻辑；"Related Topics" 采用清爽的纯文本列表设计，提升阅读体验。
  - **富文本摘要**:
    - **JSON-LD 增强**: 每日简报页面的 `NewsArticle` Schema 中，每条新闻都包含了 AI 生成的 **"一句话精华摘要"**。
    - **效果**: Google 搜索结果可直接展示新闻详情，大幅提升点击率。
  - **结构化内链**:
    - **时光机导航**: 日历页底部增加 "上一篇 / 下一篇" 导航，确保爬虫能顺着时间线遍历所有历史内容，防止孤岛页面。
  - **增长引擎**:
    - **AI RSS Feed**: `/feed.xml` 自动分发经过 AI 清洗和点评的内容（非原文），吸引自然反向链接。
    - **自动化 Sitemap**: 自动将 **所有分类** 和最活跃的 TOP 50 标签页推送到 `sitemap.xml`。针对分类页，配置了 **Daily 更新频率** (免 Lastmod)，确保高频更新内容被搜索引擎及时抓取。配合 IndexNow 实现秒级收录。
  - **Canonical 保护**: 全站统一采用 **WWW 域名** (`https://www.alok-rss.top`) 作为唯一规范地址，彻底消灭重复内容风险。
    - **自动重定向**: 依赖 Vercel/Cloudflare 边缘层自动将 Root 请求重定向到 WWW。
    - **验证集成**: 首页集成 **Baidu** (`baidu-site-verification`) 和 **Bing** (`msvalidate.01`) 的 HTML 验证标签，无需上传文件。
    - **自动提交**: 集成了 IndexNow API (`api.indexnow.org`)。
    - **提交工具**: `utils/indexnow.ts` 提供了 `submitUrlsToIndexNow` 函数。
    - **API 接口**: `/api/indexnow`
      - 一键全量提交 (自动提交 Sitemap 所有 URL)。
      - 单条提交 `?url=...`。
  - **高密度信息策略**:
    - **Meta Description**: 摒弃传统的简短摘要，采用 **"序号列表 + TLDR"** 模式（例如：`1. AI辅助... 2. Memori...`），在 SERP 中直接展示当期 10+ 条核心观点，极大提升信息密度。
    - **Deep Content Rich Snippets**: 在 JSON-LD 的 `ListItem` 中注入 **全量 AI 摘要**，而非简单的标题，让搜索引擎“读懂”每篇文章的深度内容。
    - **Crawler-Friendly Links**: 完美支持编码后的复杂标签 URL（如 `/stream/user%2F-%2Flabel%2F%E5%90%8E%E7%AB%AF`），确保爬虫能顺畅索引所有标签聚合页。
    - **Homepage Dual-Schema**: 首页采用 **NewsArticle (今日内容)** + **CollectionPage (历史归档)** 双重结构化数据，兼顾内容时效性排名与历史页面索引。
  - **动态标题进化 (Title Party)**:
    - **策略**: 摒弃死板的 "Daily Briefing" 标题。根据文章权重 (`重要新闻` > `必知要闻` > `常规更新`) 自动提取当日 **Top 2 核心头条** 动态生成 Title (e.g., `2025-12-13 Google Gemini 2.0发布、DeepSeek开源 | RSS Briefing Hub`)。
    - **优势**: 大幅提升 SERP 点击率，让用户在搜索结果页就能看到当天的爆点新闻。
  - **智能 Sitemap 策略**:
    - **混合频率**: 针对 **“今天”** 的页面，配置 `hourly` 频率 + `lastmod` 实时时间戳，迫使爬虫高频回访以抓取“一日三更”的实时更新；针对 **“历史”** 页面，自动降级为 `weekly`，节省爬取配额。
  - **SSR 服务端直连**:
    - **架构升级**: 为了解决 Vercel 环境下 "Loopback Request" (请求自身 API)导致的 401/500 错误，重构了 SSR 数据获取层。
    - **机制**: 服务端组件 (`stream/[id]`) 不再走 HTTP API 层，而是通过 `ssr-helpers.ts` 直接调用 FreshRSS/Supabase SDK。
    - **收益**: 彻底根除鉴权与网络回路问题，首屏性能提升 30% 以上。
  - **主动式 ISR**:
    - **策略**: 针对 `/stream/[id]` 标签页，启用 **7天长效 ISR 缓存**。
    - **机制**: 摒弃传统的“被动等待过期”，采用 **“修改即刷新” (Revalidate-on-Tagging)** 策略。管理员在前端打标签时，会自动触发 `/api/revalidate`，瞬间更新边缘节点缓存。既享受了静态页面的极致性能，又实现了动态内容的实时性。
  - **首页零布局偏移**:
    - **SSR Hydration**: 首页采用“SSR 直出 + 状态水合”双重保障。即使在禁用 JavaScript 的环境下，也能完美渲染首屏简报内容，杜绝 "Loading Spinner" 闪烁，大幅提升 Core Web Vitals 分数。

## 用户界面 (UI) 交互

- **每日进度标记**：在日历视图中，每个日期前都有一个状态图标（**仅管理员可见**），用户可以点击将其标记为“已完成”。
- **全局侧边栏切换**：
  - **品牌标识**：侧边栏顶部新增了品牌 Logo 和彩虹渐变风格的 "Briefing Hub" 标题。
  - **搜索功能**：提供全文搜索能力（**仅管理员可见**）。
  - **响应式设计**: 完美适配移动端。
    - **侧边栏**：移动端支持折叠与自动手势交互。
    - **PWA 工具**：“趋势”页面底部集成 **“重载应用”** 按钮（仅移动端可见），用于一键清理缓存和 Service Worker，解决 PWA 更新问题。
    - **阅读体验**：优化了移动端模态框的按钮布局，防止被遮挡。
- **沉浸式简报头图**：
  - **动态日期卡片**: 顶部展示大字号日期和问候语，背景采用每日随机生成的风景图（带遮罩）。
  - **时段切换器**: 集成早/中/晚时段切换功能，支持点击切换简报内容。
- **午夜纸张模式**：
  - **护眼纸张背景**: 采用柔和的米色/纸张色 (`#F2F0E4`) 作为主背景。
  - **深色墨水文字**: 配合浅色背景，文字采用深灰色/黑色，形成经典的“白纸黑字”效果。
- **统一阅读体验**：
  - **双模式切换**：支持 **“📊 智能简报”**（AI 摘要）和 **“📄 原文阅读”**（全文）。
  - **按需加载**：智能拉取 AI 分析数据。
- **视觉与交互升级**:
  - **矢量化图标**: 关键交互元素（如收藏星标）全面升级为高精度 SVG，确保在 Retina 屏幕上的锐利显示与像素级对齐。
  - **高对比度导航**: 简报底部集成大字号、高对比度的 "Time Machine" 导航，提供清晰的上一篇/下一篇跳转体验。
- **趋势工具集成**:
  - 独立的 `/trends` 页面，采用极简主义设计，展示前沿 AI 榜单和技术趋势。
  - **SSG 构建**：页面内容静态生成，访问零延迟。

## 技术栈

- **核心框架**: Next.js 16 (App Router), React 19, TypeScript
- **样式**: Tailwind CSS
- **代码质量**: ESLint, Prettier, Husky, lint-staged
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责客户端数据交互。
  - **客户端状态**: Zustand - 管理 UI 状态和乐观更新。
  - **安全性**: sanitize-html - 跨端 HTML 清洗与增强。
- **边缘计算**: Next.js Proxy (原 Middleware) - 用于在网络边缘层实现安全访问控制。
- **性能优化**:
  - **图片优化**:
    - **全面采用 `next/image`**: 组件支持 `picsum.photos` 和 `supabase.co` 源的自动格式转换 (WebP/AVIF) 和按需缩放，显著降低 LCP。
      - **Supabase Storage 旁路缓存**:
        - **原理**: 简报头图采用了 **Cache-Aside** 策略。每日首次访问时（Runtime），服务端会自动从 Picsum 抓取高清随机图 (Seed模式) 并上传至 Supabase Storage (`public-assets` Bucket)。
        - **构建优化**: 在 Build/CI 阶段，系统会自动跳过图片抓取与上传，仅生成占位链接，防止构建超时 (Timeouts)。真正的缓存动作推迟到第一个用户请求时触发。
        - **优势**: 彻底消除了 Picsum 的 302 重定向延迟，提供极速的 CDN 静态文件访问 (200 OK)，同时优化了 SEO (爬虫友好)。
        - **自动维护**:
          - **智能清理**: 内置 **Retention Policy**，每次上传新图时会自动清理 30 天前的旧图片。
          - **配置集中**: 图片分辨率（如 `1600x1200`）已提取至 `lib/constants.ts` 统一管理，文件名自动携带分辨率后缀（如 `_1600x1200.jpg`），修改分辨率可自动触发缓存失效。
        - **零配置**: 系统会自动检测并创建 Bucket，无需手动干预。
- **后端服务**:
  - **Supabase**: 提供文章的核心内容和自定义元数据。
    > 详细字段定义请查看 [types/supabase.ts](types/supabase.ts)。
    >
    > **注意**：该文件系自动生成，目前仅作参考，暂未正式引入代码中使用。
  - **FreshRSS**: 提供 RSS 订阅管理、文章状态和标签。
    > 详细 API 定义请查看 [types/freshrss-greader.ts](types/freshrss-greader.ts)。
    >
    > **注意**：该文件系自动生成，目前仅作参考，暂未正式引入代码中使用。

### 统一数据模型

前端通过**数据融合**，将上述两个数据源的信息合并成一个统一的 `Article` 对象：

1.  **Supabase**: 提供文章的核心内容 (Content, Summary, Verdict)。
2.  **FreshRSS**: 提供文章的元数据 (Read/Starred Status, Tags)。
3.  **融合逻辑**: `Article` 对象的 `tags` 数组是融合模型的集中体现，混合了多种“标签类”信息，确保前端组件（如卡片、模态框）可以统一处理。

### 安全性架构

- **HTML 内容清洗**: 采用 **sanitize-html** 进行**服务端统一清洗** (Server-Side Only)。
  - **stripTags**: 用于生成安全的 Metadata Description 和 Title，防止标签闭合攻击。
  - **sanitizeHtml**: 在数据获取层 (`fetchArticleContentServer`) 直接对 HTML 进行清洗。这不仅防止了 XSS 攻击，还显著减少了客户端 bundle 体积（移除了客户端的 sanitization 库）。

## 前端架构 (Next.js App Router)

本项目采用了清晰的 **Feature-Based** 组件架构。

> 📚 **详细文档**: 请参阅 [COMPONENT_CATALOG.md](./COMPONENT_CATALOG.md) 获取完整的组件目录说明。

### 核心分层

- **`app/`**: **路由层**。仅包含路由定义、Metadata 和服务端数据预取 (SSR)。
- **`components/features/`**: **业务层**。包含所有具体功能的实现 (如 `briefing`, `article`, `stream`)。
- **`components/layout/`**: **布局层**。包含侧边栏、全局外壳和布局容器。
- **`components/common/`**: **基础层**。包含通用 UI 组件和 Providers。
- **`lib/server/`**: **服务端核心**。包含所有直接数据库/API访问逻辑 (原 `app/lib/data.ts` 已移动至此)。

这种结构确保了关注点分离，使得路由层保持轻量，业务逻辑高度内聚。

### 状态与数据流架构详解

> 📚 **API 与服务架构详解**: 关于最新的 **API 路由结构**、**Hooks 封装**、**Server/Client 代码拆分**及**数据流向**，请务必阅读 **[API.md](./API.md)**。本节仅介绍客户端内部状态管理。

#### 客户端状态中心 (`store/` - Zustand)

- **职责**: 应用的**“单一事实来源”**与**客户端业务逻辑中心**。
  - **`articleStore.ts`**: 存储所有经过融合的、完整的文章数据 (`articlesById`)，以及元数据（如 `availableFilters`）。
  - **`uiStore.ts`**: 存储纯 UI 状态，如 `activeFilter`、`timeSlot`、`selectedArticleId`、`modalArticleId`。这实现了数据与 UI 的分离，减少了不必要的渲染。
  - **`toastStore.ts`**: 管理全局 Toast 通知状态，消除了 Prop Drilling，并允许在非组件环境（如 API 层）中触发通知。
  - **智能状态更新**: Store 内的 Actions (如 `updateArticle`) 封装了核心的客户端业务逻辑。例如，当一篇文章状态被更新时，该 action 不仅会更新这篇文章本身，还会**自动同步更新** `starredArticleIds` 列表，并**动态计算**受影响标签的 `count` 数量。这保证了所有派生状态的一致性，并避免了不必要的 API 调用。

## 环境变量

请在 `.env.local` 或 Vercel 项目设置中配置：

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_URL` - Supabase 项目 URL (服务端)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥 (服务端)
- `FRESHRSS_API_URL` - FreshRSS API URL
- `FRESHRSS_AUTH_TOKEN` - FreshRSS 认证令牌
- `ACCESS_TOKEN` - 管理员访问令牌

## 开发命令

- `pnpm install` - 安装依赖
- `pnpm run dev` - 启动开发服务器
- `pnpm run build` - 构建生产版本
- `pnpm run analyze` - 构建并分析 Bundle 体积
- `pnpm run start` - 启动生产服务器
- `pnpm run lint` - 代码检查
- `pnpm run format` - 代码自动格式化 (Prettier)
- `pnpm run gen:supabase-types` - 自动生成 Supabase 数据库类型定义
- `pnpm run gen:freshrss-types` - 自动生成 FreshRSS 类型定义

## 部署

项目针对 **Vercel** 进行了优化：

1.  安装 Vercel CLI: `npm install -g vercel`
2.  登录: `vercel login`
3.  部署: `vercel` (预览) 或 `vercel --prod` (生产)

系统会自动识别 Next.js 框架并应用最佳配置。
