# Briefing Hub 项目文档

## 项目概述

Briefing Hub 是一个基于 React 和 TypeScript 构建的现代化 RSS 阅读器前端，它使用 Supabase 作为文章详情的数据源，使用 FreshRSS 作为 RSS 订阅和状态管理的核心服务。应用提供了一个简洁、高效的界面来浏览每日简报、管理文章分类和标签，并支持全文阅读和渐进式 Web 应用（PWA）功能。

## 核心特性

- **统一数据视图**：无论是浏览每日简报、分类、标签还是收藏夹，所有文章数据都经过融合处理，确保信息完整一致。
- **响应式状态管理**：应用状态在所有组件间实时同步，在一个地方收藏文章，侧边栏的收藏列表和标签数量会立即更新，无需重新加载。
- **高性能数据获取**：利用缓存、后台刷新和原子化状态更新，消除不必要的 API 调用和组件渲染，提供流畅、快速的浏览体验。
- **渐进式 Web 应用 (PWA)**：支持离线访问和快速加载，提供接近原生应用的体验。
- **工作流集成**：支持以天为单位标记简报的完成状态，帮助用户追踪阅读进度。
- **安全访问控制**：通过 Vercel Edge Middleware 实现无密码认证，确保项目私密性的同时提供无缝的访问体验。
- **统一常量管理**：将关键标签常量（如 READ_TAG 和 STAR_TAG）统一管理在 `constants.ts` 中，消除魔法字符串，提高代码可维护性。

## 用户界面 (UI) 交互

- **每日进度标记**：在日历视图中，每个日期前都有一个状态图标，用户可以点击将其标记为“已完成”，以便追踪每日简报的阅读进度。
- **全局侧边栏切换**：在移动设备上，侧边栏可以通过屏幕顶部的按钮进行展开和折叠。在桌面视图中，侧边栏始终可见，但其宽度可根据折叠状态调整。
- **文章列表增强**：在分类/标签的文章列表中，每篇文章现在会直观地显示其收藏状态（通过星形图标）和所有关联的用户标签，提供更丰富的信息概览。
- **统一阅读体验 (Unified Modal)**：
  - 点击任何视图（简报列表、分类列表、搜索结果）中的文章，都会弹出一个**统一的模态框**。
  - **双模式切换**：用户可以在顶部一键切换 **“📊 智能简报”**（基于 Supabase 的 AI 分析摘要）和 **“📄 原文阅读”**（基于 FreshRSS 的清洗全文）。
  - **按需加载**：在分类或搜索视图中，默认只加载基础信息；当用户进入“智能简报”模式时，系统会自动检测并按需拉取 AI 分析数据，如果数据尚未生成，会显示友好的提示。
  - **浮动操作**：右下角提供便捷操作：
    - **返回首页**：快速返回到每日简报视图。
    - **添加/编辑标签**：管理当前文章的自定义标签。
    - **收藏/取消收藏**：将文章添加到收藏夹或从中移除。
- **趋势工具集成**：侧边栏提供“趋势”入口，点击后在主视图展示 NotebookLM、GitHub Trending、ThoughtWorks Radar 和 Cloudflare Radar 等常用工具的快捷入口，采用响应式卡片设计。

## 技术栈

- **核心框架**: React, TypeScript, Vite
- **样式**: Tailwind CSS
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责管理所有与后端 API 的交互。
  - **客户端状态**: Zustand - 充当所有文章数据和大部分UI状态的“单一数据源”。
- **边缘计算**: Vercel Edge Middleware - 用于在网络边缘层实现安全访问控制。
- **后端 API**: Vercel Serverless Functions
- **后端服务**:
  - **Supabase**: 提供文章的核心内容和自定义元数据。
  - **FreshRSS**: 提供 RSS 订阅管理、文章状态（已读/收藏）和标签。

## 前端架构

项目采用分层、职责清晰的现代架构模式，将数据获取、业务逻辑、状态管理和 UI 展示完全分离。

### 核心目录结构
- **`components/`**: 存放所有 UI 组件。
  - **`UnifiedArticleModal.tsx`**: 核心阅读组件，整合了简报展示和全文阅读逻辑。
  - **`ArticleCard.tsx`**: 用于展示简报风格的文章卡片。
  - **`Sidebar.tsx`**: 侧边栏导航与过滤器。
  - **`TrendsView.tsx`**: 趋势工具展示组件。
- **`src/constants.ts`**: 存放前端全局常量定义。
- **`api/_constants.ts`**: 存放后端全局常量定义（与前端分离，避免构建问题）。
- **`hooks/`**: 存放与 UI 逻辑和状态管理连接相关的自定义 React Hooks。
- **`services/`**: 存放与外部世界交互的服务模块。
- **`store/`**: 存放 Zustand 全局状态管理的定义。

---

### **核心数据模型与数据源**

应用的**核心挑战与解决方案**在于融合两个独立的数据源（Supabase 和 FreshRSS），以创建一个统一的 `Article` 对象模型。

#### 1. Supabase 数据源 (`public.articles` 表)

这是文章**核心内容和分析数据**的来源，主要用于填充文章卡片和详情页。

```sql
CREATE TABLE public.articles (
  id text NOT NULL PRIMARY KEY, -- 文章ID，与 FreshRSS 中的 ID 对应
  title text,
  link text,
  sourceName text,
  published timestamptz,
  category text,                
  keywords jsonb,
  verdict jsonb,
  summary text,
  highlights text,
  critiques text,
  marketTake text,
  tldr text,
  n8n_processing_date timestamptz -- 用于按日期筛选简报
);
```

#### 2. FreshRSS 数据源

这是文章**状态和分类体系**的来源，由 FreshRSS API 提供，包含 `annotations` (状态), `categories` (分类/标签ID), `tags` (标签文本) 等字段。

#### 3. 统一的 `Article` 对象

前端通过**数据融合**，将上述两个数据源的信息合并成一个统一的 `Article` 对象，其 `tags` 数组是融合模型的集中体现，混合了多种“标签类”信息。

#### 4. 统一常量管理

为了消除代码中的“魔法字符串”并提高可维护性，关键的标签常量（如 `READ_TAG` 和 `STAR_TAG`）现在统一定义在 `constants.ts` 文件中。这些常量在需要的地方通过导入使用，确保了代码的一致性和易维护性。当需要修改标签格式时，只需在 `constants.ts` 中进行一处更改即可。

---

### 状态与数据流架构

#### 1. `services/api.ts` - 原始 API 层
- **职责**: 作为最底层的通信模块，只负责与后端 API 端点进行原始的 `fetch` 通信，对返回的数据不做任何处理。此外，它也包含一些客户端辅助函数，如 `getCurrentTimeSlotInShanghai`，用于处理时区相关的计算。

#### 2. `services/articleLoader.ts` - 数据加载与融合层
- **职责**: **核心业务逻辑层**。它封装了所有复杂的数据融合与转换过程。
  - **数据融合**: 例如，`fetchStarredArticles` 函数会先从 `api.ts` 调用 `getStarredArticles` 获取 FreshRSS 数据，再调用 `getArticlesDetails` 获取 Supabase 数据，然后将两者合并成一个完整的 `Article` 对象数组。
  - **数据转换**: 例如，`fetchBriefingArticles` 函数会将从 Supabase 返回的 `verdict.importance` 字段（如 "重要新闻"）映射到前端 `Article` 模型中统一的 `briefingSection` 字段，确保文章可以在 UI 中被正确分组。
- **优点**: 将业务逻辑与 React Hooks 解耦，使其变得可独立测试和复用。

#### 3. `hooks/useArticles.ts` - 服务器状态连接层 (React Query)
- **职责**: 作为连接“数据加载器”与 React 世界的桥梁。
- **`use...Query` Hooks**: 调用 `articleLoader.ts` 中的函数，通过 `react-query` 管理缓存、加载状态，并将成功获取的数据存入 Zustand Store。
- **`use...Mutation` Hooks**: 负责处理所有“写”操作（如更新文章状态、标记每日进度），并内置了乐观更新/非乐观更新、状态回滚和用户反馈逻辑。
- **`useFilters.ts`**: 作为核心业务逻辑 Hook，它负责计算和触发 `activeFilter` 和 `timeSlot` 的原子化更新，确保数据请求的准确性并消除冗余调用。

#### 4. `store/articleStore.ts` - 客户端状态中心 (Zustand)
- **职责**: 应用的**“单一事实来源”**与**客户端业务逻辑中心**。
  - **统一状态存储**: 它存储了所有经过融合的、完整的文章数据 (`articlesById`)，以及关键的 UI 状态（如 `activeFilter`、`timeSlot`、`selectedArticleId`、`modalArticleId`）和元数据（如 `availableFilters`）。
  - **智能状态更新**: Store 内的 Actions (如 `updateArticle`) 封装了核心的客户端业务逻辑。例如，当一篇文章状态被更新时，该 action 不仅会更新这篇文章本身，还会**自动同步更新** `starredArticleIds` 列表，并**动态计算**受影响标签的 `count` 数量。这保证了所有派生状态的一致性，并避免了不必要的 API 调用。


#### 5. `App.tsx` 与 UI 组件 - 消费与渲染层
- **职责**: `App.tsx` 现在主要负责应用的整体布局和顶层协调。它从 `articleStore` 订阅必要的全局状态（如 `activeFilter`、`selectedArticleId`、`modalArticleId`），并根据这些状态决定渲染哪个主视图组件（如 `Briefing`、`ArticleList`）以及是否显示 `UnifiedArticleModal`。
- **解耦**: 各个子组件（如 `Sidebar`, `UnifiedArticleModal`）**直接从 `articleStore` 订阅它们所需的数据和 actions**。例如，`Sidebar` 不再需要通过 props 接收回调，而是直接调用 store 的 `setSelectedArticleId` action。这种模式最大限度地减少了 props-drilling，实现了组件间的彻底解耦和高效渲染。

## 后端 API (Vercel Serverless Functions)

后端 API 位于 `api/` 目录下，作为 Vercel Serverless Functions 部署。

- **`api/_utils.ts`**: 包含 `getSupabaseClient` 和 `getFreshRssClient` 的辅助函数。
- **`api/get-briefings.ts`**: 核心数据接口。支持按 `date` 和 `slot` 查询（源: Supabase），也支持按 `articleIds` 数组查询（用于数据融合）。
- **`api/articles-categories-tags.ts`**: 获取特定分类/标签/收藏夹的文章列表（源: FreshRSS）。已优化，会合并 FreshRSS 的 `categories` 和 `annotations` 字段。
- **`api/get-article-states.ts`**: 根据文章 ID 列表，批量获取它们在 FreshRSS 中的状态。已优化，会合并 `categories` 和 `annotations`。
- **`api/list-categories-tags.ts`**: 获取所有可用的分类和标签列表，并包含文章数量 (`count`)。
- **`api/update-state.ts`**: 通用的文章状态更新接口，处理所有“写”操作。
- **`api/articles.ts`**: 获取单篇文章的“干净”内容，用于阅读器模式。
- **`api/get-available-dates.ts`**: 获取有文章的可用日期列表。
- **`api/get-daily-statuses.ts`**: 批量获取每日简报的完成状态。
- **`api/update-daily-status.ts`**: 更新某一天的简报完成状态。
- **`api/search-articles.ts`**: 基于 Supabase 的关键词搜索接口。

## 环境变量
- `VITE_SUPABASE_URL` - Supabase 项目 URL (用于前端客户端)
- `VITE_SUPABASE_ANON_KEY` - Supabase 匿名密钥 (用于前端客户端)
- `SUPABASE_URL` - Supabase 项目 URL (用于 Vercel Serverless Functions 后端)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥 (用于 Vercel Serverless Functions 后端)
- `FRESHRSS_API_URL` - FreshRSS API 基础 URL (用于 Vercel Serverless Functions 后端)
- `FRESHRSS_AUTH_TOKEN` - FreshRSS 认证令牌 (用于 Vercel Serverless Functions 后端)
- `ACCESS_TOKEN` - 用于 Middleware 访问控制的秘密令牌。

## 开发命令

- `npm install` - 安装项目依赖
- `npm run build` - 构建生产版本
- `npm run preview` - 本地预览生产版本
- `vercel dev` - 启动开发服务器 (推荐，以模拟 Vercel 环境)
- `npm run lint` - 运行 ESLint 检查


## 安全与部署

- **访问控制**: 项目根目录下的 `middleware.ts` 文件通过 Vercel Edge Middleware 实现。它使用环境变量中存储的秘密令牌，通过“秘密 URL”和 Cookie 的方式实现无密码认证，保护整个网站不被公开访问。
- 部署流程保持不变，推荐部署在 Vercel 平台。
- `npm install -g vercel`
- `vercel login`
- `vercel link`
- 在 Vercel 项目设置中配置所有必要的环境变量。
- `vercel --prod` 部署到生产环境。