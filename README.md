# Briefing Hub (RSS 阅读器)

<div align="center">
  <img src="public/computer_cat_180.jpeg" alt="Briefing Hub Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">

  <h3>基于 AI 的现代化 RSS 每日简报平台</h3>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16">
    <img src="https://img.shields.io/badge/React-19-blue" alt="React 19">
    <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript">
  </p>
</div>

---

**Briefing Hub** 是一个基于 **Next.js App Router** 构建的现代化阅读器。它不只是简单的 RSS 聚合，而是通过 **混合渲染架构 (SSR/ISR)** 和 **AI 增强**，将碎片化的信息重组为高质量的“每日简报”。

## 📚 文档中心 (Documentation)

### 👋 新开发者？ → 从这里开始

1. **[AGENT.md](./AGENT.md)** - AI/开发者快速导航卡片（5分钟定向）
2. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - 理解整体架构

### 📖 按专题深入学习

我们将详细的技术文档拆分为了以下专题，方便深入查阅：

| 专题                                           | 描述                                                                 |
| :--------------------------------------------- | :------------------------------------------------------------------- |
| **🏗️ [架构设计](./docs/ARCHITECTURE.md)**      | 技术栈详情、后端服务集成 (Supabase/FreshRSS)、数据模型与安全性设计。 |
| **🔍 [SEO 策略](./docs/SEO.md)**               | 渲染架构对 SEO 的支持、增长引擎、结构化数据与关键词策略。            |
| **🧪 [测试指南](./docs/TESTING.md)**           | 测试金字塔策略、单元测试覆盖率、E2E 测试场景及 CI/CD 流程。          |
| **🧩 [组件目录](./docs/COMPONENT_CATALOG.md)** | 前端组件库分类、设计原则与核心 UI 组件说明。                         |
| **🛠️ [API 架构](./docs/API.md)**               | 服务端路由、Hooks 封装及数据流向详解。                               |
| **📦 [Store 状态](./docs/STORE.md)**           | Zustand 客户端状态管理、分片逻辑与数据同步。                         |
| **🔨 [工具库](./docs/UTILS.md)**               | 通用工具函数说明 (日期处理、HTML 清洗等)。                           |
| **🧠 [AI 架构](./docs/AI.md)**                 | RAG 召回策略、PGroonga 优化与向量化工作流。                          |
| **📝 [任务清单](./docs/TODO.md)**              | 待优化技术点、备选架构方案及历史优化记录。                           |

## ✨ 核心亮点

<details>
<summary><b>🚀 极致性能与渲染架构</b> (点击展开)</summary>

- **混合渲染**: 首页/简报采用 **阻塞式 SSR** 确保首屏内容；标签页采用 **ISR (7天)** 实现极速访问与长效缓存。
- **服务端直出**: 文章详情页不依赖客户端 JS，直接由服务端获取并清洗内容，SEO 满分。
- **高性能**: 图片采用 Supabase Storage 旁路缓存策略，配合 `next/image` 自动优化。

</details>

<details>
<summary><b>🤖 智能化内容引擎</b> (点击展开)</summary>

- **混合搜索 (Hybrid Search)**: 深度集成 **PGroonga** 与 **Vector Embedding**，实现“关键词高精准 + 语义全覆盖”的三级召回机制。
- **智能摘要**: 每日简报集成 AI 生成的 "一句话精华"，支持中英文混合的高性能检索。
- **动态 SEO**: 自动分析当日内容权重，动态生成包含 Top 2 头条的标题 (Title Party) 与结构化摘要。
- **异步任务队列**: 预留 **PGMQ** 架构，支持大规模文章抓取后的异步向量化与 AI 分析。

</details>

<details>
<summary><b>📱 卓越的 UI/UX 体验</b> (点击展开)</summary>

- **午夜纸张模式**: 独创的护眼阅读配色。
- **PWA 支持**: 离线访问、安装到桌面。
- **响应式设计**: 完美的移动端适配，包括手势交互的侧边栏。

</details>

## 🛠️ 快速开始

### 环境配置

请确保在 `.env.local` 中配置了必要的环境变量 (Supabase, FreshRSS, Access Token)。

### 开发命令

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm run dev

# 3. 运行测试
pnpm test          # 单元测试
pnpm test:e2e      # E2E 测试（参阅下方的"模拟数据"部分）

# 4. 代码检查
pnpm run lint

# 5. 搜索维护 (向量化与算法)
pnpm run search:backfill   # 批量补全缺失向量 (--force 强制刷新)
pnpm run search:update     # 同步搜搜算法 (PGroonga/Ranking) 到 Supabase 数据库
```

### 模拟数据 (Mock Data)

E2E 测试使用预定义的模拟数据，避免对外部服务的依赖：

- **文件位置**: [e2e/mocks/data.ts](./e2e/mocks/data.ts)
- **包含内容**:
  - `REAL_FRESHRSS_EXAMPLE`: FreshRSS 文章返回格式示例
  - `MOCK_FRESHRSS_TAG_LIST`: 真实 FreshRSS API `/tag/list` 返回的分类和标签数据（8 个文件夹 + 14 个标签）

**提示**: 如需了解如何使用这些数据，参考 [docs/TESTING.md](./docs/TESTING.md)。

## 🚀 部署

本项目针对 **Vercel** 进行了深度优化，推荐直接使用 Vercel 进行部署。

```bash
vercel --prod
```

---

_Created by Alok_
