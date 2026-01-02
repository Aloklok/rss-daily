# 架构与技术栈详情

本文档详细介绍了 Briefing Hub 的技术架构、后端集成及数据模型。

## 1. 核心架构

- **核心框架**: Next.js 16 (App Router), React 19, TypeScript
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责客户端数据交互。
  - **客户端状态**: Zustand - 管理 UI 状态和确认更新。
- **安全性**: sanitize-html - 跨端 HTML 清洗与增强。

## 2. 后端服务集成

### Supabase

提供文章的核心内容和自定义元数据。

> 详细字段定义请查看 [types/supabase.ts](../types/supabase.ts)。

### FreshRSS

提供 RSS 订阅管理、文章状态和标签。

> 详细 API 定义请查看 [types/freshrss-greader.ts](../types/freshrss-greader.ts)。

### 统一数据模型

前端通过**数据融合**，将上述两个数据源的信息合并成一个统一的 `Article` 对象：

1.  **Supabase**: 提供文章的核心内容 (Content, Summary, Verdict)。
2.  **FreshRSS**: 提供文章的元数据 (Read/Starred Status, Tags)。
3.  **融合逻辑**: `Article` 对象的 `tags` 数组是融合模型的集中体现，混合了多种"标签类"信息，确保前端组件（如卡片、模态框）可以统一处理。

## 3. 安全性架构

- **HTML 内容清洗**: 采用 **sanitize-html** 进行**服务端统一清洗** (Server-Side Only)。
  - **stripTags**: 用于生成安全的 Metadata Description 和 Title，防止标签闭合攻击。
  - **sanitizeHtml**: 在数据获取层 (`fetchArticleContentServer`) 直接对 HTML 进行清洗。这不仅防止了 XSS 攻击，还显著减少了客户端 bundle 体积。

## 4. 渲染与缓存策略

项目采用 **ISR (Incremental Static Regeneration)** 与 **Dynamic Rendering** 混合的策略，以平衡性能与实时性。

### 4.1 页面渲染模式

| 页面类型        | 路由路径        | 渲染模式     | 缓存策略            | 状态获取               |
| :-------------- | :-------------- | :----------- | :------------------ | :--------------------- |
| **首页 / 简报** | `/`             | **Dynamic**  | Selective Hydration | **SSR 直接合并状态**   |
| **归档中心**    | `/archive`      | **SSR**      | 每日更新            | **直出静态链接**       |
| **日期简报**    | `/date/[date]`  | **ISR (7d)** | 按日期粒度重验      | **SSR 直接合并状态**   |
| **文章详情**    | `/article/[id]` | **ISR**      | 长期缓存正文        | **客户端单独获取状态** |

### 4.2 `/date/[date]` 缓存策略

- **缓存周期**: 7 天 ISR
- **重验机制**: 每次用户操作(收藏/已读)都会触发 `revalidate-date` 清除该日期缓存
- **状态合并**: **直接在 SSR 层将 FreshRSS 状态合并到文章对象中**
- **标签显示**: **SSR 层进行数据清洗，从文章 Tags 中移除文件夹（Folder）ID，确保组件可直接解析用户标签**
- **首屏效果**: 零闪烁,收藏/已读状态、用户标签与文章内容同时渲染
- **一致性保证**: 缓存重建时会重新获取最新状态,无"旧状态被缓存"问题

```
用户点击收藏 → 前端状态立即更新 → 触发 revalidate-date → 缓存清除
下次访问 → SSR 重新获取最新状态 → 清洗 Tags (移除 Folder) → 合并到文章 → 渲染正确的 HTML
```

### 4.3 `/article/[id]` 缓存策略

- **缓存周期**: 长期 ISR(文章正文内容稳定)
- **状态获取**: **客户端单独从 FreshRSS 获取**
- **设计原因**: 文章正文(来自 Supabase)需要长期缓存以保证性能,若在 SSR 阶段合并用户状态,会将个性化数据写入公共缓存,破坏缓存的普适性

### 4.4 客户端状态同步 (Store-First 策略)

当用户在页面上进行交互后,采用 **Store-First** 策略保护本地状态:

1.  **本地优先**: 若 Zustand Store 中已存在该文章(说明用户在交互),则拒绝使用 SSR 数据覆盖
2.  **确认更新**: 用户点击收藏后,API 返回成功即视为已确认,本地状态不会被后台刷新覆盖
3.  **后台对账**: 仅在必要时(初始加载/多端同步)发起后台请求修正数据

> [!TIP]
> **直白理解缓存逻辑**:
> 除非手动操作(收藏、已读、重新生成)触发刷新,否则 7 天内访问日期页面都是毫秒级响应的静态 HTML。针对“重新生成简报”，系统采用 `setQueryData` 手动更新缓存，并配合 API 层的 `_t` 时间戳参数实现物理级缓存击碎，确保新生成的分析内容立即呈现且不回滚。

### 4.5 侧边栏数据策略

| 数据类型             | 来源         | 缓存策略               | 说明                                |
| :------------------- | :----------- | :--------------------- | :---------------------------------- |
| **日期列表** (Dates) | Supabase RPC | `unstable_cache` (24h) | SEO 核心,强制缓存保证爬虫稳定性     |
| **过滤器** (Filters) | FreshRSS API | `unstable_cache` (24h) | 极少变动,强制缓存实现秒开           |
| **收藏夹** (Starred) | FreshRSS API | **No-Store**           | 用户一致性优先,实时请求保证刷新即变 |

### 4.6 侧边栏"分类"数据流

- **获取端点**: `/api/meta/tags` (由 `lib/server/tagFetcher.ts` 提供)
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
  - 按标签名 (label) 按中文排序

## 5. 性能与 UX 优化

### 5.1 消除内容闪烁

- **全量注入**: 服务端预计算 `initialTimeSlot` 消除首屏跳变
- **同步水合 (Synchronized Hydration)**: 引入 `isSynced` 状态标识，确保在 Store 完成初始化前始终信任服务端预计算状态，消除因 `mounted` 状态引起的竞争条件闪烁
- **选择性水合**: 客户端启动时将 SSR 数据分发至 React Query 缓存
- **数据一致性**: 统一使用 `n8n_processing_date` 作为时段判定标准
- **实时保鲜**: 首页数据设置 10 分钟 `staleTime`

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

- **策略**: Client-Side Verification (客户端后置验证)
- **机制**:
  - **静态优先**: 服务端不读取 Cookie,确保所有页面可生成静态缓存
  - **静默升级**: 页面加载后,客户端通过 `/api/auth/status` 异步验证
  - **权限赋予**: 验证通过后,前端动态解锁管理功能
- **优势**: 解决因服务端读取 Cookie 导致全站降级为动态渲染的性能瓶颈

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
