# 组件架构目录

本文档详细描述了 Briefing Hub 项目的前端组件架构。项目采用了 **Feature-Based**（基于功能）的架构模式，将业务逻辑高度内聚，同时保证了路由层 (`app/`) 的轻量化。

## 1. 核心目录结构概览

```
.
├── app/                  # Next.js App Router 路由定义 (Pages, Layouts, API)
├── components/           # 所有 UI 组件与业务组件
│   ├── common/           # 通用基础组件 (UI Kit, Providers)
│   ├── features/         # 业务功能模块 (Article, Stream, Briefing 等)
│   └── layout/           # 全局与结构布局 (Sidebar, Global Wrappers)
├── hooks/                # 自定义 React Hooks
├── lib/                  # 核心库与工具 (Data fetching, Supabase client)
├── services/             # 业务服务层 (API 封装, 数据转换)
├── store/                # 全局状态管理 (Zustand)
├── types/                # TypeScript 类型定义
└── utils/                # 纯函数工具库
```

---

## 2. 详细目录说明

### `app/`

负责定义应用的路由结构、服务端数据预取 (SSR) 和页面元数据 (Metadata)。**不包含复杂的 UI 实现。**

- **`layout.tsx`**: 全局根布局。定义了 `<html>`, `<body>`，引入了全局样式和 `Providers`。
- **`page.tsx`**: 首页路由。重定向或渲染最新日期的页面。
- **`date/[date]/page.tsx`**: **每日简报页** (SSR)。负责获取当日简报数据，并渲染 `BriefingClient`。
- **`article/[id]/page.tsx`**: **文章详情页** (SSR)。服务端直出文章内容，利于 SEO。
- **`stream/[id]/page.tsx`**: **流视图页** (ISR)。用于展示分类或标签下的文章列表。
- **`sources/page.tsx`**: **按源浏览页** (Dynamic SSR)。提供基于订阅源维度的文章筛选入口。
- **`trends/page.tsx`**: **趋势页** (SSG)。静态生成的趋势分析页面。
- **`api/`**: 后端 API 路由 (Next.js Route Handlers)。

### `components/features/`

业务逻辑的核心所在。每个子目录对应一个具体的业务领域。

#### `briefing/` (每日简报)

- **`BriefingClient.tsx`**: 简报页面的逻辑容器。处理数据 Hydration、状态同步。
- **`BriefingView.tsx`**: 简报页面的纯 UI 展示。
- **`BriefingGroup.tsx`**: 按重要性分组的文章列表展示。
- **`BriefCard.tsx`**: 简报场景下的专用文章卡片。

#### `stream/` (文章流)

- **`StreamContainer.tsx`**: 流视图的逻辑容器。处理分页加载、无限滚动逻辑。
- **`StreamView.tsx`**: 流视图的 UI 展示，使用通用 List 组件。
- **`StreamHeader.tsx`**: 流视图顶部的标题区域（展示标签名、相关话题）。
- **`StreamListItem.tsx`**: 流视图专用的横向文章卡片。

#### `article/` (文章详情)

- **`ArticlePage.tsx`**: 文章详情页的 UI 展示（非模态框模式）。
  - _Note_: 全文阅读组件之一（独立页面版）。使用 ID `#article-detail-content`。
- **`ArticleDetailClient.tsx`**: 文章详情页的客户端逻辑封装。
- **`ArticleTitleStar.tsx`**: 带收藏功能的标题组件。
- **`modal/`**: 模态框相关组件。
  - **`ArticleBriefingView.tsx`**: 智能简报模式视图 (AI 摘要)。
- **`ArticleReaderView.tsx`**: 原文阅读模式视图 (纯净阅读器)。
  - _Note_: 全文阅读组件之二（弹窗版）。使用 ID `#article-reader-content`。拥有与独立页面版一致的样式覆盖。
  - **`ArticleModalActions.tsx`**: 模态框底部的操作栏 (收藏、打标签)。
  - **`UnifiedArticleModal.tsx`**: 统一的模态框入口，根据状态切换简报/原文视图。

#### `search/` (搜索与过滤)

- **`SearchList.tsx`**: 搜索结果列表展示。
- **`SourceFilterClient.tsx`**: 按订阅源浏览的过滤页面。支持按分类分组和无限滚动。

#### `trends/` (趋势)

- **`TrendsPage.tsx`**: 趋势页面的主视图。

### `components/layout/`

负责应用的整体骨架。

- **`MainLayoutClient.tsx`**: 主布局容器。处理侧边栏的响应式切换、主内容区域的滚动。
- **`GlobalUI.tsx`**: 全局挂载的 UI 元素（如 Toast 容器、模态框挂载点）。
- **`FloatingActionButtons.tsx`**: 右下角的悬浮操作按钮组 (回到顶部、标记已读等)。
- **`Sidebar/`**: 侧边栏模块。
  - **`SidebarContainer.tsx`**: 侧边栏逻辑容器。
  - **`SidebarContent.tsx`**: 侧边栏主体内容。
  - **`SidebarCalendar.tsx`**: 日历导航组件。
  - **`SidebarBriefing.tsx`**: 简报导航项。

### `components/common/`

跨业务复用的基础组件。

- **`Providers.tsx`**: 全局 Context Providers 封装 (QueryClient, Theme 等)。
- **`ui/`**: 通用 UI 组件库。
  - **`EmptyState.tsx`**: 标准空状态展示。
  - **`LoadMoreButton.tsx`**: 标准加载更多按钮。
  - **`Spinner.tsx`**: 加载中转圈动画。
  - **`TagPopover.tsx`**: 标签管理气泡弹窗。
  - **`Toast.tsx`**: 全局通知提示。

---

## 3. 设计原则

1.  **关注点分离 (Separation of Concerns)**:
    - `app/` 专注路由与服务端数据。
    - `components/features/` 专注具体业务实现。
    - `components/common/` 专注通用 UI 抽象。

2.  **容器/视图模式 (Container/View Pattern)**:
    - 对于复杂页面（如 Briefing, Stream），严格区分 `Client` (数据/逻辑) 和 `View` (UI 渲染) 组件。
    - 例子: `BriefingClient.tsx` vs `BriefingView.tsx`.

3.  **组合优先 (Composition over Inheritance)**:
    - 尽量通过 Props (如 `children`, `renderProps`) 组合组件，而非深层继承。

4.  **就近原则 (Co-location)**:
    - 仅被某个 Feature 独享的组件（如 `ArticleModalActions`），直接放在该 Feature 目录下，而非提升到全局 Common。
