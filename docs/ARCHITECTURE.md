# 架构与技术栈详情

本文档详细介绍了 Briefing Hub 的技术架构、后端集成及数据模型。

## 1. 核心架构

- **核心框架**: Next.js 16 (App Router), React 19, TypeScript
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责客户端数据交互。
  - **客户端状态**: Zustand - 管理 UI 状态和行为更新。
  - **文章核心 (Article Core)**: [articleStore.ts](../src/domains/article/store/articleStore.ts) - 文章数据归一化存储与状态。
  - **全局共享 (Shared)**: [uiStore.ts](../src/shared/store/uiStore.ts) - 侧边栏折叠、筛选器状态及全局 UI 标志。
- **Hooks (逻辑下放)**: 遵循领域边界，实现读写分离。
  - **读取 (Reading)**: 详情见 [READING_LOGIC.md](../src/domains/reading/READING_LOGIC.md)。
  - **交互 (Interaction)**: 详情见 [INTERACTION_STORE.md](../src/domains/interaction/INTERACTION_STORE.md)。

## 1.1 领域驱动设计 (Domain-Driven Design)

本项目采用 **物理分层 + 领域驱动设计 (DDD)** 的架构模式，将业务逻辑按职责划分到独立的"领域"目录中，实现高内聚、低耦合。

### 目录结构

```
src/
├── domains/                  # 业务领域层
│   ├── article/              # 📄 文章核心领域 (状态存储、常量、ID 工具)
│   │   ├── store/            #    - Zustand Store (articleStore)
│   │   ├── hooks/            #    - 元数据派生 (useArticleMetadata)
│   │   ├── utils/            #    - ID 转换工具 (idHelpers)
│   │   └── ARTICLE.md        #    - 领域技术文档
│   ├── intelligence/         # 🧠 智能领域 (AI 对话、RAG、向量检索、翻译逻辑)
│   │   ├── components/       #    - AI 相关组件
│   │   ├── prompts/          #    - Prompt 模板
│   │   └── INTELLIGENCE.md   #    - 领域技术文档
│   ├── system/               # ⚙️ 系统领域 (Webhook 编排、Revalidate、自动化生命周期)
│   │   ├── services/         #    - 系统核心服务
│   │   └── SYSTEM.md         #    - 领域技术文档
│   ├── reading/              # 📖 阅读领域 (文章渲染、日期逻辑、筛选)
│   │   ├── components/       #    - 简报、侧边栏、文章卡片等
│   │   ├── hooks/            #    - 查询类 Hooks (useArticles, useFilters...)
│   │   ├── services/         #    - 客户端 API (readingClient, articleLoader)
│   │   └── READING_LOGIC.md  #    - 领域技术文档
│   └── interaction/          # ❤️ 交互领域 (收藏、已读、标记)
│       ├── hooks/            #    - 修改类 Hooks (useArticleMutations...)
│       ├── services/         #    - 客户端 API (interactionClient)
│       └── INTERACTION_STORE.md # - 领域技术文档
├── shared/                   # 🏗️ 跨领域共享层
│   ├── components/           #    - 全局布局、公共 UI 组件
│   ├── hooks/                #    - 公共 Hooks (useAppToast, dom/)
│   ├── infrastructure/       #    - 基础设施 (Supabase, FreshRSS, apiClient)
│   ├── store/                #    - 全局 Store (uiStore, toastStore)
│   ├── types/                #    - 全局类型定义
│   └── utils/                #    - 公共工具函数
└── app/                      # 📄 Next.js App Router (页面与路由)
```

### 领域职责划分

| 领域             | 核心职责                              | Hooks 类型        | 关键服务                               |
| ---------------- | ------------------------------------- | ----------------- | -------------------------------------- |
| **article**      | 文章数据归一化存储、核心常量、ID 工具 | —                 | `articleStore.ts`, `idHelpers.ts`      |
| **intelligence** | AI 对话、RAG 召回、语义搜索、编排调度 | —                 | `chat-orchestrator.ts`, Gemini API     |
| **reading**      | 文章列表渲染、日期筛选、简报业务聚合  | **Query** (读)    | `reading/services.ts`, `articleLoader` |
| **interaction**  | 收藏、已读、标签同步、状态水合        | **Mutation** (写) | `interactionClient.ts`                 |
| **shared**       | 全局 UI、基础设施客户端、公共工具     | 公共工具          | Supabase (Server/Browser), FreshRSS    |

### 设计原则

1. **核心领域优先**: `article` 作为核心领域，被 `reading` 和 `interaction` 依赖。
2. **读写分离 (CQRS 思想)**: Query Hooks 在 `reading`，Mutation Hooks 在 `interaction`。
3. **领域自治**: 每个领域拥有自己的 `components/`, `hooks/`, `services/`。
4. **文档就近**: 领域技术文档 (`*.md`) 放在领域根目录，与代码共存。
5. **绝对路径**: 全部使用 `@/` 别名，消除相对路径维护成本。

## 1.2 国际化架构 (Internationalization)

项目采用 **路径路由 (Path-based Routing)** 与 **数据隔离** 相结合的国际化策略：

- **路由策略**:
  - `/(zh)`: 默认中文环境（根路径）。
  - `/en`: 英文环境。
  - **实现模式**: 采用“壳页面”模式。`/en/page.tsx` 仅负责注入 `lang="en"` 和 `dict={en}`，核心逻辑完全复用。
- **数据隔离与双表模型**:
  - **数据隔离与双表模型**:
  - **分层存储 (Lean Translation Architecture)**:
    - **主表 (`articles`)**: 存储所有原始中文数据 + 物理元数据（链接、发布时间、上海处理时间、AI 评分与重要性）。这是元数据的 **单一事实来源 (Single Source of Truth)**。
    - **翻译表 (`articles_en`)**: 物理上仅存储翻译后的文本内容（Title, Summary, MarketTake 等）和任务元数据（Model ID）。不再冗余存储原始链接和时间列。
  - **展现层视图 (`articles_view_en`)**: 通过数据库视图实时 `JOIN` 主表与翻译表。英文版前端请求始终指向该视图，确保元数据（如评分修订、日期调整）在双语环境下能够自动、绝对地同步。
- **元数据动态本地化**:
  - 系统在物理层保留原始中文标识符（如 `sourceName` 和 `verdict.type`），通过 `label-display.ts` 在 UI 渲染层实时调用字典进行多语言转换。这避免了因字典微调而导致的数据库刷表需求。
- **统一简报服务**:
  - `fetchBriefingData` 已被重构为全站统一的简报聚合服务。它通过 `lang` 参数驱动底层物理表/视图映射（ZH -> `articles_view`, EN -> `articles_view_en`）。
- **统一缓存验证**:
  - 即使数据表物理分配，但验证逻辑已统一。`RevalidateService` 会自动处理英文版缺失物理日期字段的情况，通过回溯主表补齐，确保 ISR 刷新正常。
- **全链路自动化工作流 (Full-link Automation)**:
  - 详情请查阅系统领域文档：[SYSTEM.md](../src/domains/system/SYSTEM.md)。

---

## 4. 混合搜索架构 (Hybrid Search)

系统采用 **混合搜索 (Hybrid Search)** 策略，结合了传统关键词匹配与语义理解：

- **技术栈**: Supabase `pgvector` + Gemini `gemini-embedding-001` (2026 新一代模型)。
- **多语言现状**:
  - **中文**: 启用全量向量生成与检索。
  - **英文**: 目前采用 **关键词 (ILIKE)** 模式，暂时禁用了自动 Embedding 生成（但表结构中保留 `embedding` 字段以便未来扩展）。

## 4. 渲染与缓存策略

项目采用 **ISR (Incremental Static Regeneration)** 与 **Dynamic Rendering** 混合的策略，以平衡性能与实时性。

### 4.1 页面渲染模式

| **首页 / 简报** | `/` | **ISR (7d)** | Webhook 精准清除 | 极速访问，支持缓存自愈与定时重验 |
| **日期简报** | `/date/[date]` | **ISR (7d)** | Webhook 精准清除 | 适合静态化以实现极速加载 |
| **归档中心** | `/archive` | **SSR** | 流量索引模式 | 全站历史入口，核心 SEO 推点 |
| **源列表** | `/sources` | **Dynamic (ISR 7d)** | 包装于 `<Suspense>` | 解决 `useSearchParams` 在构建时的预渲染需求，兼顾灵活与缓存 |
| **文章详情** | `/article/[id]` | **ISR** | 长期缓存正文 | 正文内容稳定，客户端单独补充用户状态 |

### 4.2 统一缓存策略 (Scheme C: 状态分离)

**核心理念**: SSR 仅渲染静态内容,用户状态完全由客户端异步获取

- **缓存周期**: 7 天 ISR (首页、日期页、筛选页统一)
- **重验机制**: Webhook/Server Action 智能判断,仅在**文章内容变更**时清除缓存
- **状态分离**: SSR 层**不再**合并 FreshRSS 状态(已读/星标)
- **客户端补齐**: 页面加载后通过 `useArticleStateHydration` 异步获取状态（顶级客户端入口组件必须调用）。
- **首屏效果**: 极速 HTML (SEO 友好),用户状态在 ~1s 后渐入显示
- **一致性保证**: 状态与缓存解耦,爬虫永远获取 <600ms 的纯净 HTML

#### 缓存清除触发场景

| 场景                     | 触发机制         | 清除首页      | 清除日期页    |
| ------------------------ | ---------------- | ------------- | ------------- |
| n8n 新增今日文章         | Supabase Webhook | ✅            | ✅            |
| n8n 新增历史文章         | Supabase Webhook | ❌            | ✅ (对应日期) |
| 管理员生成今日简报       | Server Action    | ✅            | ✅            |
| 管理员生成历史简报       | Server Action    | ❌            | ✅ (对应日期) |
| **管理员批量生成简报**   | Server Action    | ✅ (若含今日) | ✅ (对应日期) |
| 用户修改状态 (收藏/已读) | ❌ **不再触发**  | ❌            | ❌            |

**关键改进**: 用户状态变更不再触发缓存清除,减少 95% 的无效 ISR 重新生成。

### 4.2.1 首页 (Homepage) 特殊渲染逻辑

为消除构建后或跨天访问时的内容闪烁（Flickering），首页 (`/`) 采用 **强制今日 (Force Today)** 策略：

- **SSR 阶段**: 无论数据库最新文章是哪一天，服务端始终以**上海时间今日**作为 `initialDate` 进行渲染。
  - 若今日有数据：直接显示今日简报。
  - 若今日无数据：显示“今日 - 暂无简报”空状态。
- **优势**: 保证 SSR HTML 与客户端 Hydration 逻辑（默认取今日）完全一致，彻底解决了“先显示昨天内容 -> 客户端跳变至今天”的视觉抖动问题。
- **侧边栏同步**: 首页自动激活侧边栏中的“今天”日期，确保 UI 选中状态与页面展示内容物理对齐。
- **背景图**: 始终预加载今日的背景图，避免滞后。

### 4.3 批量处理与后台任务 (Batch Processing)

Admin 后台采用 **Server Actions** 处理长耗时任务（如批量 AI 简报生成）：

- **无超时限制**: 利用 Next.js Server Actions 绕过传统 API Route 的超时限制。
- **实时反馈**: 通过流式日志或分批次返回结果 (`Promise<{ saved, titles... }>`) 实现前端进度条与日志更新。
- **错误透传**: 集成 API 状态码提取逻辑 (e.g., 429/500)，确保前端能够区分业务错误与系统故障。

### 4.4 `/article/[id]` 缓存策略

- **缓存周期**: 长期 ISR(文章正文内容稳定)
- **状态获取**: **客户端单独从 FreshRSS 获取**
- **设计原因**: 文章正文(来自 Supabase)需要长期缓存以保证性能,若在 SSR 阶段合并用户状态,会将个性化数据写入公共缓存,破坏缓存的普适性

### 4.4 客户端状态同步 (Store-First 策略)

当用户在页面上进行交互后,采用 **Store-First** 策略保护本地状态:

1.  **本地优先**: 若 Zustand Store 中已存在该文章(说明用户在交互),则拒绝使用 SSR 数据覆盖
2.  **确认更新**: 用户点击收藏后,API 返回成功即视为已确认,本地状态不会被后台刷新覆盖
3.  **领域 Hook 隔离**:
    - **Query Hooks**: 位于 `src/domains/reading/hooks/`，仅限获取数据。
    - **Mutation Hooks**: 位于 `src/domains/interaction/hooks/` (如 `useArticleMutations`)，专注于状态变更与同步。
4.  **后台对账**: 仅在必要时(初始加载/多端同步)发起后台请求修正数据

> [!TIP]
> **直白理解缓存逻辑**:
> 除非手动操作(收藏、已读、重新生成)触发刷新,否则 7 天内访问日期页面都是毫秒级响应的静态 HTML。针对“重新生成简报”，系统采用 `setQueryData` 手动更新缓存，并配合 API 层的 `_t` 时间戳参数实现物理级缓存击碎，确保新生成的分析内容立即呈现且不回滚。

### 4.5 侧边栏数据策略

| 数据类型              | 来源            | 缓存策略                     | 说明                                                                                      |
| :-------------------- | :-------------- | :--------------------------- | :---------------------------------------------------------------------------------------- |
| **日期列表** (Dates)  | Supabase RPC    | `unstable_cache` (7d + tags) | 边缘缓存 7 天（对齐页级 ISR）；webhook 触发 `available-dates` tag 刷新，新章节即时更新    |
| **封面图片** (Images) | Supabase/Picsum | `unstable_cache` (7d + tags) | 缓存 7 天 (`briefing-image`)，消除每次请求的 Storage/Fetch 开销                           |
| **今日数据防护**      | Logic           | **Conditional Throw**        | 若查询“今天”的数据返回空，则抛出异常以阻止 `unstable_cache` 锁定空结果（防止 7 天死锁）。 |
| **过滤器** (Filters)  | FreshRSS API    | `unstable_cache` (7d)        | 7 天强缓存，极少变动，实现秒开                                                            |
| **收藏夹** (Starred)  | FreshRSS API    | **No-Store**                 | 用户一致性优先,实时请求保证刷新即变                                                       |

### 4.7 Layout 与水合边界 (SSR-First + Client Islands)

为降低首屏水合成本并保持 No-JS 可抓取，本项目采用“SSR 骨架 + Client Islands”的布局分层：

- **根布局**: `app/layout.tsx` 负责获取 Sidebar 必需的静态导航数据（Dates/Filters），并渲染主布局壳。
- **主布局壳**: `src/shared/components/layout/MainLayoutServer.tsx` 作为 Server Component 直出 `aside/main` 结构与核心内容容器。
- **布局交互岛**: `src/shared/components/layout/LayoutChromeClient.tsx` 仅负责侧边栏开合/遮罩/折叠等 UI 交互，避免整棵布局树变成 Client Boundary。
- **侧边栏两层输出**:
  - `SidebarNavServer.tsx`: SSR 直出核心 `<a>` 导航（archive/date/stream/sources），保证 No‑JS 仍可发现路径。
  - `SidebarLazyClient.tsx`/`SidebarClientMount.tsx`: JS 环境下懒加载交互侧边栏并替换 SSR 导航，减少首屏必须水合的节点。

### 4.6 侧边栏"分类"数据流

- **获取端点**: `/api/meta/tags` (调用 `domains/reading/services.ts`)
- **FreshRSS 响应分类**:
  - `item.type === 'folder'` → 分类（目录）
  - `item.type === 'tag'` 或其他 → 标签
- **计数字段兼容**:
  - 尝试获取 `count` 字段（文件夹使用）
  - 回退到 `unread_count` 字段（标签使用）
  - 确保不同版本的 FreshRSS 都能正确显示计数
- **过滤规则**:
  - 排除内部系统状态（`/state/com.google/`, `/state/org.freshrss/`）
  - 保留用户创建的自定义分类和标签
  - **排序策略**: 侧边栏保持 FreshRSS API 返回的原始顺序；订阅源浏览页（Source Filter）采用权重置顶策略（核心分类优先展示）
- **展示层适配**: 所有分类、标签、订阅源名称在渲染前必须经过 `label-display.ts` 处理，实现剥离前缀、正则剔除 Emoji 变体符以及多语言字典映射。

### 4.8 缓存预热系统 (Cache Warmup System)

为解决 ISR 首次访问冷启动导致的 404/超时问题，系统部署了全自动预热机制：

- **触发源**: Vercel Cron (周日) + GitHub Actions (部署后)。
- **操作**: 调用 `/api/system/warmup` 并发生成最近 7 天的简报页。
- **安全**: 利用 `Vercel-Internal-Warmup` 白名单机制绕过 403 拦截。

## 5. 性能与 UX 优化

### 5.1 消除内容闪烁

- **全量注入**: 服务端预计算 `initialTimeSlot` 消除首屏跳变
- **同步水合 (Synchronized Hydration)**: 引入 `isSynced` 状态标识，确保在 Store 完成初始化前始终信任服务端预计算状态，消除因 `mounted` 状态引起的竞争条件闪烁
- **选择性水合**: 客户端启动时将 SSR 数据分发至 React Query 缓存
- **数据一致性**: 统一使用 `n8n_processing_date` 作为时段判定标准
- **实时保鲜**: 首页数据设置 10 分钟 `staleTime`
- **跨天数据防护 (Cross-Day Safety)**:
  - **问题**: 客户端可能因状态持久化将 `dateToUse` 计算为“今天”，但 SSR 因缓存或生成延迟返回“昨天”的 `initialArticles`。
  - **防污机制**: 在 `MainContentClient.tsx` 中实施严格校验，只有当 `dateToUse === initialDate` 时才执行 Payload Hydration，防止旧数据污染今日缓存 Key。

### 5.2 API 响应聚合

- **CSR (客户端交互)**: 实现 `include_state` 聚合,一次请求获取"文章内容+用户状态",消除瀑布流
- **`date/[date]/page.tsx`**: **每日简报页** (SSR)。负责获取当日简报数据，并渲染 `BriefingClient`。
- **`archive/page.tsx`**: **内容归档页** (SSR)。提供所有历史简报的静态链接索引，核心 SEO 支撑页。
- **`article/[id]/page.tsx`**: **文章详情页** (SSR)。服务端直出文章内容，利于 SEO。

### 5.3 Core Web Vitals

- **LCP**: 封面图使用 `fetchPriority="high"` + `priority`
- **TBT**: Analytics 脚本迁移至 `next/script` (`afterInteractive`)
- **Bundle Size**: 严格分离服务端库,组件懒加载 (`next/dynamic`)

### 5.4 图片优化

- **自适应代理**: 使用 Weserv.nl (Cloudflare-based) 免费图片服务
- **实现逻辑**: 在 `serverSanitize.ts` 中拦截 `<img>` 标签,重写 `src` 指向 Weserv 代理
- **性能**: 强制 `loading="lazy"`,自动 WebP 压缩

### 5.5 稳定性

- **超时熔断**: 数据库查询内置 10s 超时保护
- **错误边界**: 页面级错误捕获和友好 UI

## 6. 权限验证 (Authentication)

- **权限赋予**: 验证通过后,前端动态解锁管理功能

### 6.1 管理员异步鉴权机制 (Admin Async Authentication)

> [!IMPORTANT]
> **开发必读：管理员权限校验**
>
> 本项目的所有管理员功能（如 `/admin/briefing`, `/admin/dashboard`）必须严格遵循以下鉴权流程：
>
> 1. **异步校验端点**: `/api/auth/check`
> 2. **工作原理**:
>    - 该 API 会对比 Cookie 中的 `site_token` 与环境变量 `ACCESS_TOKEN`。
>    - 核心逻辑位于: `src/shared/infrastructure/auth.ts` (如有) 或直接在路由处理程序中判断。
> 3. **前端实现模式**:
>    - 严禁在 SSR 渲染阶段阻塞式判定权限（会导致静态缓存失效）。
>    - 必须在客户端组件的 `useEffect` 中异步调用 `/api/auth/check`。
>    - 在校验完成前显示 `Loading` 状态，校验失败则重定向或显示 `403`。
>
> 这样设计的目的是为了让页面保持 **100% 静态化 (ISR Friendly)**，同时通过客户端“补水”来解锁管理条。

### 6.2 SSR 性能与静态优化 (SSR Performance & Static Optimization)

为了保证首页极速加载，项目遵循 **"Layout 静态化"** 原则：

- **禁止同步阻塞**: 严禁在 `layout.tsx` 或其引用的服务端组件中直接调用以下 **动态 API (Dynamic APIs)**，除非该页面明确需要每用户感知的实时动态性：
  - `cookies()`: 读取 Cookie 状态。
  - `headers()`: 读取请求头。
  - `searchParams`: 页面组件中的查询参数（仅限 Page，Layout 无法直接获取但底层逻辑若受其影响也会触发）。
  - `unstable_noStore()`: 显式声明不缓存。
  - `fetch(URL, { cache: 'no-store' })`: 显式禁用 fetch 缓存。
  - `export const dynamic = 'force-dynamic'`: 强制动态路由。
- **动态性后置**: 所有与用户身份相关的 UI 逻辑必须在**客户端组件**中，利用 Zustand Store 的异步状态进行条件化渲染。
- **脚本加载优化**: Google Analytics、Microsoft Clarity 等分析脚本必须通过客户端组件包装，在挂载且确认非管理员后才开始载入。

> [!CAUTION]
> **性能杀手 (Dynamic Opt-out)**:
> 在 App Router 中，如果你在根布局（Root Layout）中读取 Cookie，会导致 Next.js 强制将**整个站点**的所有路由降级为动态渲染（Dynamic Rendering），无法生成静态 HTML 缓存，从而导致 SSR 响应延迟显著增加。

## 7. 视觉设计规范 (Visual Design System)

项目采用了一套特殊的暗黑模式方案，开发者在修改 UI 组件时**必须**遵循以下原则，以确保对比度：

### 7.1 背景色参考

请始终关注 `globals.css` 中定义的背景变量：

- **主内容区 (`midnight-bg`)**: 它是主阅读区域的背景。开发时请务必查看其当前的颜色定义（可能为极浅色或深色），并据此决定文字颜色。
- **侧边栏/导航区 (`midnight-sidebar`)**: 这是完全独立的侧边栏色域。

### 7.2 适配原则 (Contrast Check)

在进行 UI 开发时，**禁止**盲目使用 `dark:text-white`，必须遵循以下逻辑：

1.  **容器识别**:
    - 辨别当前组件是放置在 `midnight-bg` (主内容) 还是 `midnight-sidebar` (侧边栏) 中。
2.  **变量优先**:
    - **文字颜色**: 请优先使用 `var(--color-midnight-text-primary)`、`var(--color-midnight-text-title)` 等语义化变量。这些变量在 `globals.css` 中会跟随背景色的变化而调整，确保始终有足够的对比度。
    - **避免硬编码**: 尽量避免手动写死 `dark:text-gray-XXX`，除非你非常确定该颜色在当前的 `midnight-bg` 下是清晰可见的。
3.  **对比度检查**:
    - 如果你修改了 `midnight-bg`，请务必同时检查并更新 `midnight-text-*` 系列变量，以维持 WCAG 对比度标准。
