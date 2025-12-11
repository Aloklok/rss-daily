# Briefing Hub 项目文档

## 项目概述

Briefing Hub 是一个基于 **Next.js (App Router)** 和 TypeScript 构建的现代化 RSS 阅读器前端。它采用 **混合渲染架构 (SSR + ISR + SSG)**，结合 Supabase 作为文章详情的数据源，使用 FreshRSS 作为 RSS 订阅和状态管理的核心服务。应用提供了一个简洁、高效的界面来浏览每日简报、管理文章分类和标签，并支持全文阅读和渐进式 Web 应用（PWA）功能。

## 核心特性

- **混合渲染架构 (Hybrid Rendering)**：
  - **每日简报 (Blocking SSR)**：采用阻塞式服务器端渲染，确保在首屏 HTML 中直接返回完整内容（含正文），彻底解决 No-JS 环境下的 SEO 和加载问题。
  - **文章详情 (SSR with Server Fetch)**：文章正文由服务端直接拉取 (Server-Side Fetching)，不再依赖客户端 JS，实现“服务端直出”的完美阅读体验。
  - **趋势页面 (SSG)**：趋势工具页面采用静态站点生成 (SSG)，构建时生成，访问速度极快。
- **统一数据视图**：无论是浏览每日简报、分类、标签还是收藏夹，所有文章数据都经过融合处理，确保信息完整一致。
- **响应式状态管理**：应用状态在所有组件间实时同步。
  - **实时反馈**: 收藏、标记已读等操作在服务端确认后立即更新全局状态，确保数据严格一致。
  - **混合数据源**: "我的收藏" 列表采用服务端预取 (SSR) + 客户端实时状态 (Zustand) 的混合模式，既保证首屏速度，又确保状态实时一致。
- **高性能数据获取**：利用 Next.js 的扩展 `fetch` API 和 React Query，实现智能缓存和去重。
- **高可用性设计**：
  - **超时熔断**：数据库查询内置 10s 超时保护，防止冷启动或网络波动导致页面无限挂起。
  - **错误边界 (Error Boundary)**：页面级错误捕获，确保即使后端故障也能向用户展示友好的重试界面。
- **渐进式 Web 应用 (PWA)**：支持离线访问和快速加载，提供接近原生应用的体验。
- **双模访问控制**：
  - **公共只读模式**：默认允许公众访问，可以浏览所有简报和文章，但无法进行任何修改。
  - **管理员模式**：通过 URL Token (`?token=...`) 激活，系统会自动设置持久化 Cookie (`site_token`)，无需每次访问都携带 Token。拥有完整权限（如标记已读、收藏、查看原始 RSS）。
- **SEO 深度优化 (Hyper-Optimization)**:
  - **全站 SSR覆盖**: 不仅包括每日简报，**标签/分类页面 (`/stream/[id]`)** 全面升级为 SSR 服务端渲染，将 FreshRSS 文章列表与 Supabase AI 数据融合，打造高质量内容聚合页。
  - **Auto-SEO (Keyword Injection)**: 
      - **自动关键词提取**: 服务器自动分析页面内所有文章，提取高频关键词（如 "GPT-4", "Transformer"）。
      - **智能注入**: 将关键词注入 Metadata (`keywords`, `description`)。
      - **可视化增强**: 在标签页顶部展示 "Related Topics" 词云，提升长尾词排名。
  - **Rich Snippets (富文本摘要)**:
      - **JSON-LD 增强**: 每日简报页面的 `NewsArticle` Schema 中，每条新闻都包含了 AI 生成的 **"一句话精华摘要" (TLDR)**。
      - **效果**: Google 搜索结果可直接展示新闻详情，大幅提升点击率。
  - **结构化内链 (Time Machine)**:
      - **时光机导航**: 日历页底部增加 "上一篇 / 下一篇" 导航，确保爬虫能顺着时间线遍历所有历史内容，防止孤岛页面。
  - **增长引擎**:
      - **AI RSS Feed**: `/feed.xml` 自动分发经过 AI 清洗和点评的内容（非原文），吸引自然反向链接。
      - **自动化 Sitemap**: 自动将最活跃的 TOP 50 标签页推送到 `sitemap.xml`，并配置 **Daily 更新频率** 与 **Lastmod** 时间戳，配合 IndexNow 实现秒级收录。
  - **Canonical 保护**: 全站统一采用 **WWW 域名** (`https://www.alok-rss.top`) 作为唯一规范地址 (Canonical URL)，彻底消灭重复内容风险。
      - **自动重定向**: 依赖 Vercel/Cloudflare 边缘层自动将 Root 请求重定向到 WWW。
      - **验证集成**: 首页集成 **Baidu** (`baidu-site-verification`) 和 **Bing** (`msvalidate.01`) 的 HTML 验证标签，无需上传文件。
      - **自动提交**: 集成了 IndexNow API (`api.indexnow.org`)。
      - **提交工具**: `utils/indexnow.ts` 提供了 `submitUrlsToIndexNow` 函数。
      - **API 接口**: `/api/indexnow`
        - 一键全量提交 (自动提交 Sitemap 所有 URL)。
        - 单条提交 `?url=...`。
  - **MAX-Density SEO Strategy (高密度信息策略)**:
      - **Meta Description**: 摒弃传统的简短摘要，采用 **"序号列表 + TLDR"** 模式（例如：`1. AI辅助... 2. Memori...`），在 SERP 中直接展示当期 10+ 条核心观点，极大提升信息密度。
      - **Deep Content Rich Snippets**: 在 JSON-LD 的 `ListItem` 中注入 **全量 AI 摘要 (Summary)**，而非简单的标题，让搜索引擎“读懂”每篇文章的深度内容。
      - **Crawler-Friendly Links**: 完美支持编码后的复杂标签 URL（如 `/stream/user%2F-%2Flabel%2F%E5%90%8E%E7%AB%AF`），确保爬虫能顺畅索引所有标签聚合页。
      - **Homepage Dual-Schema**: 首页采用 **NewsArticle (今日内容)** + **CollectionPage (历史归档)** 双重结构化数据，兼顾内容时效性排名与历史页面索引。
  - **SSR Direct Connection (服务端直连)**:
      - **架构升级**: 为了解决 Vercel 环境下 "Loopback Request" (请求自身 API)导致的 401/500 错误，重构了 SSR 数据获取层。
      - **机制**: 服务端组件 (`stream/[id]`) 不再走 HTTP API 层，而是通过 `ssr-helpers.ts` 直接调用 FreshRSS/Supabase SDK。
      - **收益**: 彻底根除鉴权与网络回路问题，首屏性能提升 30% 以上。
  - **Next-Gen ISR Strategy (主动式 ISR)**:
      - **策略**: 针对 `/stream/[id]` 标签页，启用 **7天长效 ISR 缓存**。
      - **机制**: 摒弃传统的“被动等待过期”，采用 **“修改即刷新” (Revalidate-on-Tagging)** 策略。管理员在前端打标签时，会自动触发 `/api/revalidate`，瞬间更新边缘节点缓存。既享受了静态页面的极致性能，又实现了动态内容的实时性。
  - **Homepage Zero-Layout-Shift (首页零偏移)**:
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
- **沉浸式简报头图 (Immersive Briefing Header)**：
  - **动态日期卡片**: 顶部展示大字号日期和问候语，背景采用每日随机生成的风景图（带遮罩）。
  - **时段切换器**: 集成早/中/晚时段切换功能，支持点击切换简报内容。
- **午夜纸张模式 (Midnight Paper Mode)**：
  - **护眼纸张背景**: 采用柔和的米色/纸张色 (`#F2F0E4`) 作为主背景。
  - **深色墨水文字**: 配合浅色背景，文字采用深灰色/黑色，形成经典的“白纸黑字”效果。
- **统一阅读体验 (Unified Modal)**：
  - **双模式切换**：支持 **“📊 智能简报”**（AI 摘要）和 **“📄 原文阅读”**（全文）。
  - **按需加载**：智能拉取 AI 分析数据。
- **视觉与交互升级 (Visual Polish)**:
  - **矢量化图标 (Vector Icons)**: 关键交互元素（如收藏星标）全面升级为高精度 SVG，确保在 Retina 屏幕上的锐利显示与像素级对齐。
  - **高对比度导航**: 简报底部集成大字号、高对比度的 "Time Machine" 导航，提供清晰的上一篇/下一篇跳转体验。
- **趋势工具集成**: 
  - 独立的 `/trends` 页面，采用极简主义设计，展示前沿 AI 榜单和技术趋势。
  - **SSG 构建**：页面内容静态生成，访问零延迟。

## 技术栈

- **核心框架**: Next.js 16.0.7 (App Router), React 18.3.1, TypeScript
- **样式**: Tailwind CSS
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责客户端数据交互。
  - **客户端状态**: Zustand - 管理 UI 状态和乐观更新。
- **边缘计算**: Next.js Proxy (原 Middleware) - 用于在网络边缘层实现安全访问控制。
- **性能优化**: 
  - **图片优化**: 全面采用 `next/image` 组件，支持 `picsum.photos` 源的自动格式转换 (WebP/AVIF) 和按需缩放，显著降低 LCP。
- **后端服务**:
  - **Supabase**: 提供文章的核心内容和自定义元数据。
    > 详细字段定义请查看 [types/supabase.ts](types/supabase.ts)。
    >
    > **注意**：该文件系自动生成，目前仅作参考，暂未正式引入代码中使用。
  - **FreshRSS**: 提供 RSS 订阅管理、文章状态和标签。
    > 详细 API 定义请查看 [types/freshrss-greader.ts](types/freshrss-greader.ts)。
    >
    > **注意**：该文件系自动生成，目前仅作参考，暂未正式引入代码中使用。

### 统一数据模型 (Data Fusion)

前端通过**数据融合**，将上述两个数据源的信息合并成一个统一的 `Article` 对象：

1.  **Supabase**: 提供文章的核心内容 (Content, Summary, Verdict)。
2.  **FreshRSS**: 提供文章的元数据 (Read/Starred Status, Tags)。
3.  **融合逻辑**: `Article` 对象的 `tags` 数组是融合模型的集中体现，混合了多种“标签类”信息，确保前端组件（如卡片、模态框）可以统一处理。

## 前端架构 (Next.js App Router)

项目采用 Next.js App Router 架构，利用 Server Components 和 Client Components 的优势。

### 核心目录结构
- **`app/`**: 应用路由和页面 (App Router)。
  - **`layout.tsx`**: 根布局，包含全局 Providers (`QueryClientProvider`) 和全局 UI (`GlobalUI`)。
  - **`error.tsx`**: 全局错误边界 (Error Boundary)。
  - **`page.tsx`**: 首页（直接渲染最新日期的简报，状态码 200，SEO 最佳）。
  - **`date/[date]/page.tsx`**: **每日简报页面 (Blocking SSR)**。核心页面，负责预取数据并渲染 `Briefing` 组件。
  - **`article/[id]/page.tsx`**: **文章详情页面 (SSR)**。用于 SEO 和直接访问，服务端直出正文。
  - **`trends/page.tsx`**: **趋势工具页面 (SSG)**。构建时生成的静态页面。
  - **`components/`**: **路由相关组件** (Client Components)。
    - **`MainLayoutClient.tsx`**: 负责侧边栏与主内容的布局结构，处理移动端响应式逻辑。
    - **`SidebarClient.tsx`**: 侧边栏的交互逻辑封装。
    - **`GlobalUI.tsx`**: 包含 Toast 通知、模态框等全局 UI 元素。
  - **`api/`**: Next.js Route Handlers (后端 API 接口)。
- **`components/`**: **通用 UI 组件** (展示型组件)。
  - **`Briefing.tsx`**: **简报核心视图**。包含头图、问候语、目录和文章列表。
  - **`ArticleGroup.tsx`**: 文章分组组件 (按重要性分组)。
  - **`ArticleCard.tsx`**: 文章卡片组件 (展示摘要、操作按钮)。
  - **`UnifiedArticleModal.tsx`**: **统一阅读模态框**。整合了 AI 摘要 (`BriefingDetailView`) 和原文阅读 (`ReaderView`)。
  - **`article-modal/`**: 模态框的子组件 (Header, Content, Footer)。
  - **`sidebar/`**: 侧边栏的子组件 (Calendar, FilterList)。
  - **`TrendsView.tsx`**: 趋势页面的主要展示组件。
- **`lib/`**: 核心逻辑与工具。
  - **`data.ts`**: 服务端数据获取逻辑 (Server-only)。
  - **`supabase-client.ts`**: 客户端 Supabase 实例。
- **`services/`**: 业务逻辑服务层 (API 通信, 数据融合)。
- **`utils/`**: 通用工具函数。
- **`hooks/`**: 自定义 React Hooks (Client-side)。
- **`store/`**: Zustand 全局状态定义。
- **`proxy.ts`**: 边缘代理，处理访问控制和重定向。

### 状态与数据流架构详解

#### 1. `services/api.ts` - 原始 API 层
- **职责**: 作为最底层的通信模块，只负责与后端 API 端点进行原始的 `fetch` 通信，对返回的数据不做任何处理。此外，它也包含一些客户端辅助函数，如 `getCurrentTimeSlotInShanghai`，用于处理时区相关的计算。

#### 2. `services/articleLoader.ts` - 数据加载与融合层
- **职责**: **核心业务逻辑层**。它封装了所有复杂的数据融合与转换过程。
  - **数据融合**: 例如，`fetchFilteredArticles` 函数会先从 `api.ts` 调用 `getArticlesByLabel` 获取 FreshRSS 文章列表，再调用 `getArticlesDetails` 获取 Supabase 详情，最后将两者合并成完整的 `Article` 对象。
  - **数据转换**: 例如，`fetchBriefingArticles` 函数会将从 Supabase 返回的 `verdict.importance` 字段（如 "重要新闻"）映射到前端 `Article` 模型中统一的 `briefingSection` 字段，确保文章可以在 UI 中被正确分组。
- **优点**: 将业务逻辑与 React Hooks 解耦，使其变得可独立测试和复用。

#### 3. `hooks/useArticles.ts` - 服务器状态连接层 (React Query)
- **职责**: 作为连接“数据加载器”与 React 世界的桥梁。
- **`use...Query` Hooks**: 调用 `articleLoader.ts` 中的函数，通过 `react-query` 管理缓存、加载状态，并将成功获取的数据存入 Zustand Store。
- **`use...Mutation` Hooks**: 负责处理所有“写”操作（如更新文章状态、标记每日进度），采用了**安全更新策略**（等待服务端确认后更新），确保数据的一致性与可靠性。
- **`useFilters.ts`**: 作为核心业务逻辑 Hook，它负责计算和触发 `activeFilter` 和 `timeSlot` 的原子化更新，确保数据请求的准确性并消除冗余调用。

#### 4. `store/` - 客户端状态中心 (Zustand)
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
- `pnpm run start` - 启动生产服务器
- `pnpm run lint` - 代码检查
- `pnpm run gen:types` - 自动生成 Supabase 数据库类型定义

## 部署

项目针对 **Vercel** 进行了优化：

1.  安装 Vercel CLI: `npm install -g vercel`
2.  登录: `vercel login`
3.  部署: `vercel` (预览) 或 `vercel --prod` (生产)

系统会自动识别 Next.js 框架并应用最佳配置。