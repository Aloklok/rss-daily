# API 与服务架构指南

> **注意**: 本项目于 2025 年 12 月进行了深度重构，引入了“智能数据策略”并严格分离了服务端与客户端逻辑。

## 1. 核心数据策略

我们在后端数据获取上做了针对性的性能分层：

| 数据类型      | 获取方式              | 策略 (Complexity)   | 缓存 (Cache)  | 优势                                                                                                                     |
| :------------ | :-------------------- | :------------------ | :------------ | :----------------------------------------------------------------------------------------------------------------------- |
| **可用日期**  | **Supabase RPC**      | **O(1) / O(log N)** | **无 (实时)** | 数据库层直接聚合 `get_unique_dates`，利用 **Index Only Scan** 避免全表扫描，0ms 延迟，**彻底解决跨天数据更新滞后问题**。 |
| **标签/分类** | **FreshRSS API**      | O(N)                | **1小时**     | 使用 `unstable_cache` 包裹。Tag 列表变化不频繁，容忍 1 小时延迟以换取极速加载。                                          |
| **文章内容**  | **SSR Fetch**         | O(1)                | **动态**      | 文章详情页走 SSR 直出，保证 SEO。                                                                                        |
| **向量搜索**  | **Gemini + pgvector** | **768 维降维**      | **无**        | 采用 768 维度兼顾检索速度与内存消耗，支持语义相似度检索。                                                                |

## 2. 目录结构概览

### API 路由 (`app/api/`)

API 路由按照业务领域进行组织：

- **`articles/`**: 核心文章管理。
  - `POST /api/articles`: 获取单篇文章的清洗后内容。
  - `GET /api/articles/list`: 获取文章列表 (只走 FreshRSS, 去除 Supabase 融合以提速)。
  - `GET /api/articles/search`: **[混合搜索]** 同时调用 Gemini 生成向量并执行 Supabase RPC `hybrid_search_articles`。
  - `POST /api/articles/state`: 统一的文章状态读写 (已读/收藏/标签)。
- **`briefings/`**: 获取每日简报数据 (融合 Supabase + FreshRSS)。
- **`meta/`**: 元数据服务。
  - `GET /api/meta/available-dates`: **[优化]** 调用 RPC 获取实时日期。
  - `GET /api/meta/tags`: **[缓存]** 获取缓存的分类标签列表。

### 服务层 (`services/` & `lib/server/`)

我们强制执行 **Client/Server 分离**：

#### A. 客户端服务 (`services/clientApi.ts`)

纯净的数据访问层，供 UI 组件 (`'use client'`) 使用。

- **职责**: 仅负责 `fetch` 数据，**绝对不包含**复杂的业务逻辑或 UI 反馈（如 Toast）。
- **主要方法**: `getCleanArticleContent`, `markAllAsRead`, `fetchSearchResults`。

#### B. 服务端核心 (`lib/server/dataFetcher.ts`)

**只能**在 Server Components 或 API Routes 中使用。

- **职责**: 直接与数据库 (Supabase) 或外部 API (FreshRSS) 通信。
- **优化**:
  - `fetchAvailableDates`: 调用 RPC。
  - `getAvailableFilters`: 使用 `next/cache` 的 `unstable_cache` 进行边缘缓存。

## 3. 关键重构变更

| 旧逻辑                              | 新逻辑                    | 收益                                    |
| :---------------------------------- | :------------------------ | :-------------------------------------- |
| `select * from articles` (获取日期) | `rpc('get_unique_dates')` | 查询时间从 500ms -> 10ms，且数据实时。  |
| 每次请求都拉取 FreshRSS Tags        | `unstable_cache` (1h)     | 消除 FreshRSS API 抖动影响，提升 TTFB。 |
| Store 监听所有文章更新              | `StreamListItem` 独立订阅 | 列表渲染性能大幅提升，消除无意义重绘。  |

## 4. 智能缓存碎冰

为了保证简报数据的实时性并最大程度降低后端 FreshRSS 压力，系统实现了“精准碎冰”策略：

### A. 全自动化 Webhook 刷新

- **端点**: `POST /api/system/revalidate`
- **逻辑**: 当 n8n 推送新文章到 Supabase 时，Webhook 会自动触发此接口。
- **智能特性**:
  - **自动日期检测**: API 会自动从 Webhook 的 Body 中提取文章日期，并**仅刷新该日期**对应的页面。
  - **自动防抖**: 内置 10 秒刷新频率限制，即使 n8n 逐行推送，服务器也只会对 FreshRSS 发起一次对账请求。

### B. 按需手动刷新 (Targeted Date)

- **端点**: `POST /api/system/revalidate-date`
- **用途**: 当用户点击“重新生成简报”或通过 Hook 修改文章状态（已读/收藏）时调用。

### C. 缓存标签规范

- `briefing-data-YYYY-MM-DD`: 对应日期的专属数据标签。

---

> [!NOTE]
> 关于**三级状态同步**与**缓存自愈**的宏观架构，请参阅 [ARCHITECTURE.md](./ARCHITECTURE.md)；关于具体的数据流实现，请参阅 [STORE.md](./STORE.md)。
