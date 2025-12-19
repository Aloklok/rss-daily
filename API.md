# API 与服务架构指南

> **注意**: 本项目于 2025 年 12 月进行了重大重构，采用了领域驱动设计 (DDD) 来组织 API 路由，并严格分离了服务端与客户端逻辑。

## 1. 目录结构概览

### API 路由 (`app/api/`)

API 路由按照业务领域进行组织，以提高可维护性和可发现性。

- **`articles/`**: 核心文章管理。
  - `POST /api/articles` - 获取单篇文章的清洗后内容。
  - `GET /api/articles/list` - 获取文章列表 (FreshRSS 源)，支持按分类或标签筛选。
  - `GET /api/articles/search` - 通过 Supabase RPC 进行全文搜索。
  - `POST /api/articles/state` - 统一的文章状态读写端点 (已读/收藏/标签)。
- **`briefings/`**
  - `GET /api/briefings` - 获取每日简报数据 (融合 Supabase + FreshRSS)。
- **`meta/`**
  - `GET /api/meta/available-dates` - 列出有简报的可用日期。
  - `GET /api/meta/tags` - 列出所有可用的分类和标签。
- **`system/`**
  - `GET|POST /api/system/indexnow` - 通过 IndexNow 提交 URL 给搜索引擎。
  - `/api/system/revalidate` - (规划中) 按需重验证钩子。
  - `/api/system/refresh` - (规划中) 系统刷新钩子。

### 服务层 (`services/` & `lib/server/`)

我们要强制执行 **客户端** (浏览器/水合) 代码与 **服务端** (Node.js/SSR/ISR) 代码之间的严格分离。

#### A. 客户端服务 (`services/`)

这些模块可以安全地在客户端组件 (`'use client'`) 中导入。

- **`services/clientApi.ts`** (原 `api.ts` 重命名)
  - **角色**: 纯粹的数据访问层。负责验证并向内部 API 路由 (`/api/*`) 发起 HTTP `fetch` 请求。
  - **原则**: **不包含 UI 逻辑** (如 Toast 弹窗)。所有 UI 反馈由调用方 (如 Hooks) 处理。
  - **用途**: 被 `hooks/useArticles.ts` 和 UI 组件使用。
  - **核心函数**: `getCleanArticleContent`, `markAllAsRead`, `getBriefingReportsByDate`, `fetchSearchResults` (调用 Supabase RPC)。

- **`services/articleLoader.ts`**
  - **角色**: 领域逻辑层。
  - **优化**: 提供 `fetchFilteredArticles`，默认**关闭客户端融合** (FreshRSS 标签 + Supabase AI) 以提升列表页加载速度。
  - **用途**: 主要被 `hooks/useArticles.ts` (React Query) 使用。

#### C. 核心 Hooks (`hooks/`)

封装了数据获取与状态管理，是 UI 层与 Service 层的桥梁。

- **`useArticleContent.ts`**: 获取文章原文，支持 5 分钟缓存。
- **`useBriefingDetails.ts`**: 获取/融合单篇文章的 AI 简报详情与标签。
- **`useArticles.ts`**:
  - `useFilteredArticles`: 无限滚动列表 (优化: 仅 FreshRSS 数据)。
  - `useSearchResults`: 全文搜索 (优化: Supabase 直出 AI 数据)。
  - `useUpdateArticleState`: 处理收藏/标签变动，**包含成功/失败的 Toast 反馈**。
- **`useDailyStatus.ts`**: 管理简报完成状态打卡，包含 Toast 反馈。

#### D. 服务端库 (`lib/server/`)

这些模块 **必须仅** 在服务端组件、API 路由或 `getStaticProps/generateMetadata` 中导入。在客户端代码中导入它们会导致构建错误。

- **`lib/server/dataFetcher.ts`** (从 `app/lib/data.ts` 移动)
  - **角色**: 直接数据库访问。在 SSR 期间绕过 HTTP 层以提升性能。
  - **用途**: 被 `app/page.tsx`, `app/date/[date]/page.tsx`, `feed.xml` 使用。
  - **核心函数**: `fetchBriefingData`, `fetchAvailableDates`, `fetchArticleContentServer`。

- **`lib/server/apiUtils.ts`** (从 `app/lib/api-utils.ts` 移动)
  - **角色**: Supabase 和 FreshRSS 客户端的单例初始化器。管理员验证辅助函数。

- **`lib/server/mappers.ts`** (新增)
  - **角色**: 数据映射与转换层。将外部 API (FreshRSS) 的数据结构转换为内部领域模型 (`Article`)。
  - **原则**: DRY (Don't Repeat Yourself)，确保 API 路由和 SSR 使用相同的转换逻辑。
  - **核心函数**: `mapFreshItemToMinimalArticle`。

### 工具库 (`utils/`)

- **`utils/dateUtils.ts`**: 共享的日期逻辑 (如 `getTodayInShanghai`)。客户端和服务端均可安全使用。
- **`utils/imageUtils.ts`**: 图片 URL 解析与缓存层。实现了 **Supabase Storage Cache-Aside** 策略，负责每日自动从 Picsum 抓取并缓存头图。
- **`utils/contentUtils.ts`**: HTML 清洗和字符串处理。

## 2. 数据流示例

### 场景 A: 渲染首页 (SSR)

1. **服务端组件** (`app/page.tsx`) 调用 `lib/server/dataFetcher` 中的 `fetchBriefingData`。
2. `dataFetcher` 直接查询 Supabase (0ms 网络延迟开销)。
3. 数据作为 props 传递给客户端组件 (`BriefingClient`)。
4. 在此过程中 **不会命中任何 API 路由**。

### 场景 B: 点击“阅读更多” (客户端交互)

1. **客户端组件** (`ArticleDetailClient`) 调用 `services/clientApi` 中的 `getCleanArticleContent`。
2. `clientApi` 发起 `POST /api/articles` 请求。
3. **API 路由** (`app/api/articles/route.ts`) 接收请求。
4. 路由调用 `lib/server/dataFetcher` 中的 `fetchArticleContentServer`。
5. `dataFetcher` 调用 FreshRSS API 获取内容。
6. 响应回流: API -> ClientApi -> Component。

## 3. 关键重构变更 (迁移指南)

如果您正在维护旧代码，请注意以下变化：

| 旧位置                   | 新位置                            | 说明                      |
| :----------------------- | :-------------------------------- | :------------------------ |
| `services/api.ts`        | `services/clientApi.ts`           | 重命名以避免歧义。        |
| `app/api/get-briefings`  | `app/api/briefings/route.ts`      | 移动到领域文件夹。        |
| `app/api/article-states` | `app/api/articles/state/route.ts` | 与 `update-state` 合并。  |
| `app/lib/data.ts`        | `lib/server/dataFetcher.ts`       | **严格服务端专用**。      |
| `resolveBriefingImage`   | `utils/imageUtils.ts`             | 与 `articleLoader` 解耦。 |

## 4. 最佳实践

1. **导入**:
   - 服务端专用逻辑始终使用 `@/lib/server/...`。
   - 浏览器逻辑始终使用 `@/services/clientApi`。
2. **别名**:
   - 使用绝对导入 (`@/...`) 代替相对导入 (`../../`)，以避免文件移动时路径断裂。
3. **环境**:
   - API 路由在 Vercel (Serverless) 的 Node.js 环境中运行。
   - 确保 `process.env` 密钥可访问。
