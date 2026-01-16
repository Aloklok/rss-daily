# 组件架构目录

本文档详细描述了 Briefing Hub 项目的前端组件架构。项目采用了 **Feature-Based**（基于功能）的架构模式，将业务逻辑高度内聚，同时保证了路由层 (`app/`) 的轻量化。

## 1. 核心目录结构概览

```
.
├── src/
│   ├── app/                  # Next.js App Router 路由定义 (Pages, Layouts, API)
│   ├── domains/              # 业务领域层 (intelligence, reading, interaction)
│   │   └── [domain]/
│   │       ├── components/   #    - 领域专属业务组件
│   │       ├── hooks/        #    - 领域专属逻辑 Hooks
│   │       └── services/     #    - 领域专属服务 (API/逻辑)
│   └── shared/               # 跨领域共享层
│       ├── components/       #    - 全局布局、公共 UI Kit
│       ├── infrastructure/   #    - 基础设施 SDK (Supabase, FreshRSS)
│       └── utils/            #    - 纯函数工具库
└── public/                   # 静态资源
```

---

## 2. 详细目录说明

### `app/`

负责定义应用的路由结构、服务端数据预取 (SSR) 和页面元数据 (Metadata)。**不包含复杂的 UI 实现。**

- **`layout.tsx`**: 全局根布局。定义了 `<html>`, `<body>`，引入了全局样式和 `Providers`。
- **`page.tsx`**: 首页路由。重定向或渲染最新日期的页面。
- **`date/[date]/page.tsx`**: **每日简报页** (SSR)。负责获取当日简报数据，并渲染 `BriefingClient`。
- **`archive/page.tsx`**: **内容归档页** (SSR)。全站历史入口，核心 SEO 推理页。
- **`article/[id]/page.tsx`**: **文章详情页** (SSR)。服务端直出文章内容，利于 SEO。
- **`stream/[id]/page.tsx`**: **流视图页** (ISR)。用于展示分类或标签下的文章列表。
- **`sources/page.tsx`**: **按源浏览页** (Dynamic SSR)。提供基于订阅源维度的文章筛选入口。
- **`trends/page.tsx`**: **趋势页** (SSG)。静态生成的趋势分析页面。
- **`admin/briefing/page.tsx`**: **简报管理后台** (CSR)。用于手动触发批量补录、监控生成状态。
- **`api/`**: 后端 API 路由 (Next.js Route Handlers)。

### `src/domains/` (业务领域层)

业务逻辑的核心所在。每个子目录对应一个具体的业务领域。

#### `reading/` (阅读领域)

- **`components/briefing/`**: 简报页面的逻辑容器与 UI。处理数据 Hydration、状态同步。
- **`components/stream/`**: 流视图的逻辑容器。处理分页加载、无限滚动逻辑。
- **`components/article/`**: 文章详情页的 UI 展示与模态框。封装了简报摘要视图与原文阅读器。
- **核心服务**: `services/services.ts` 负责全量简报聚合逻辑。

#### `intelligence/` (智能领域)

- **`components/ai/`**: AI 聊天窗口、模型选择器及引用展示。
- **核心服务**: `services/chat-orchestrator.ts` 负责 RAG 编排、意图路由及跨 Provider 调度。

#### `interaction/` (交互领域)

- **核心存储**: `store/articleStore.ts` 负责客户端的“文章数据库”与状态同步。

### `src/shared/` (共享层)

- **`components/layout/`**: 负责应用的整体骨架（侧边栏、全局 Layout、浮动按钮）。
- **`components/ui/`**: 跨业务复用的基础 UI 组件库。
- **`infrastructure/`**: 基础设施 SDK 封装（Supabase 客户端、FreshRSS 客户端）。

---

## 3. 设计原则

1.  **领域自治 (Domain Autonomy)**:
    - 业务逻辑必须留在 `domains/`。禁止在 `app/` 层编写复杂的业务计算。
    - 跨领域引用应通过 `shared/` 或明确的服务接口进行。

2.  **表现层瘦身 (Thin Presentation)**:
    - `app/` 路由仅作为“接线员”，负责解析请求参数并调用对应的领域服务。

3.  **容器/视图模式 (Container/View Pattern)**:
    - 复杂组件严格区分 `Client` (逻辑) 和 `View` (渲染) 组件。

4.  **容器/视图模式 (Container/View Pattern)**:
    - 对于复杂页面（如 Briefing, Stream），严格区分 `Client` (数据/逻辑) 和 `View` (UI 渲染) 组件。
    - 例子: `BriefingClient.tsx` vs `BriefingView.tsx`.

5.  **组合优先 (Composition over Inheritance)**:
    - 尽量通过 Props (如 `children`, `renderProps`) 组合组件，而非深层继承。

6.  **就近原则 (Co-location)**:
    - 仅被某个 Feature 独享的组件（如 `ArticleModalActions`），直接放在该 Feature 目录下，而非提升到全局 Common。
