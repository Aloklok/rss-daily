# 项目目录索引 (Project Catalog)

本文档映射了 Briefing Hub 核心目录的功能职责，帮助开发者快速定位代码。

## 1. 核心应用入口 (`app/`)

采用 Next.js App Router 架构，负责路由定义、SSR 数据获取及 API。

- **`layout.tsx`**: 全局根布局，包含 Providers 和全局 UI。
- **`page.tsx`**: 首页入口（Force Dynamic），处理时段预选。
- **`date/[date]/page.tsx`**: 每日简报页（ISR 7d）。
- **`article/[id]/page.tsx`**: 文章详情页（ISR）。
- **`archive/page.tsx`**: 归档索引页（SSR）。
- **`sources/page.tsx`**: 订阅源浏览页（Force Dynamic）。
- **`admin/`**: 管理后台。
  - `briefing/`: 简报补录面板。
- **`stream/`**: 分类与标签列表页。
- **`api/`**: 路由处理程序 (Route Handlers)。
  - `articles/search/`: 混合向量搜索接口。
  - `briefings/`: 简报数据接口。
  - `system/revalidate/`: 自动化缓存碎冰接口。

## 2. 业务功能组件 (`components/features/`)

按领域内聚的业务逻辑组件。

- **`article/`**: 文章交互核心。
  - `ArticlePage.tsx`: 独立页阅读器。
  - `ArticleReaderView.tsx`: 弹窗式阅读器。
  - `UnifiedArticleModal.tsx`: 统一文章模态框容器。
- **`briefing/`**: 简报渲染核心。
  - `BriefingClient.tsx`: 客户端逻辑与同步。
  - `BriefingView.tsx`: 渲染 UI 布局。
- **`search/`**: 搜索与过滤组件。
- **`search/`**: 搜索与过滤组件。
- **`stream/`**: 无限滚动列表组件。
- **`admin/`**: 后台管理组件。
  - `BackfillPanel.tsx`: 简报批量生成与状态监控。

## 3. 全局布局与基础 (`components/`)

- **`layout/`**: 应用骨架。
  - `MainLayoutClient.tsx`: 响应式侧边栏容器。
  - `Sidebar/`: 包含日历、分类树导航。
  - `FloatingActionButtons.tsx`: 全局悬浮组件。
- **`common/`**: 通用 UI 基座。
  - `Providers.tsx`: Context 聚合。
  - `ui/`: 标准原子组件（Button, Spinner, Toast 等）。

## 4. 逻辑与数据层

- **`store/`**: Zustand 全局状态。
  - `articleStore.ts`: 文章领域模型与归一化缓存。
  - `uiStore.ts`: 交互状态（选中项、侧边栏开关）。
- **`lib/`**: 核心库实现。
  - `server/`: 仅限服务端的工具（Data Fetcher, Embeddings）。
- **`services/`**: API 抽象层。
  - `clientApi.ts`: 供客户端调用的 Fetch 封装。
- **`utils/`**: 纯函数工具库（具体见 [UTILS.md](./UTILS.md)）。

## 5. 配置与工具

- **`e2e/`**: Playwright 测试用例与 Mock 数据。
- **`scripts/`**: 维护脚本（如向量数据回填 backfill）。
- **`.agent/`**: AI 助手的工作流定义。
- **`docs/`**: 项目详细技术文档（本项目文档中心）。

---

> [!NOTE]
> 详细的技术架构请参考 [ARCHITECTURE.md](./ARCHITECTURE.md)；状态同步细节请参考 [STORE.md](./STORE.md)。
