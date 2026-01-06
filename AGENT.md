# AGENT.md - AI 开发者导航卡片

⚡ **快速定向**: 根据你的任务，下表会告诉你应该查阅 [docs/](./docs/) 中的哪个文档。

## 🎯 按任务类型快速导航到 docs/

| 你的任务               | 相关文档                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| **理解整体架构**       | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)                                              |
| **添加/修改 API 路由** | [docs/API.md](./docs/API.md) → [docs/UTILS.md](./docs/UTILS.md)                             |
| **修改数据库查询**     | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) + [docs/UTILS.md](./docs/UTILS.md)           |
| **前端开发**           | [docs/COMPONENT_CATALOG.md](./docs/COMPONENT_CATALOG.md) → [docs/STORE.md](./docs/STORE.md) |
| **写单元/E2E 测试**    | [docs/TESTING.md](./docs/TESTING.md)                                                        |
| **性能优化**           | [docs/TODO.md](./docs/TODO.md)                                                              |
| **SEO 优化**           | [docs/SEO.md](./docs/SEO.md)                                                                |

## ⚠️ 重要原则

**🔍 SEO 优先**: 所有代码修改都必须在保证 SEO 的基础之上进行。修改前务必查阅 [docs/SEO.md](./docs/SEO.md)，了解对 SEO 的影响。

---

- **渲染性能优化 (Performance Optimization)**:
  - **状态订阅分离**: `AIChatModal` 采用深度解耦架构。主容器仅订阅显隐状态。
  - **流更新局部化**: 打字机输出仅触发 `StreamingResponse` 局部重绘。
  - **输入隔离**: 打字输入由 `ChatInputArea` 局部管理，避免整屏重绘。
  - **自动滚动优化**: 重写滚动侦测逻辑，仅在用户处于底端时自动探底，极大降低 CPU 开销。

## 30秒项目概览

- **项目**: Briefing Hub (RSS 阅读器)
- **技术**: Next.js 16 (App Router) + React 19 + TypeScript
- **服务**: Supabase (数据) + FreshRSS (RSS源)
- **部署**: Vercel

---

## ️ 核心文件速查

| 文件                                                           | 职责                                |
| -------------------------------------------------------------- | ----------------------------------- |
| [lib/server/dataFetcher.ts](./lib/server/dataFetcher.ts)       | 获取文章数据（Supabase + FreshRSS） |
| [scripts/update-search-rpc.ts](./scripts/update-search-rpc.ts) | 维护 PGroonga 混合搜索逻辑 (RPC)    |
| [docs/AI.md](./docs/AI.md)                                     | AI 架构、RAG 召回与语义搜索规划     |
| [utils/imageUtils.ts](./utils/imageUtils.ts)                   | 封面图生成、缓存与延迟处理逻辑      |
| [e2e/mocks/data.ts](./e2e/mocks/data.ts)                       | 测试用 mock 数据                    |

**更多文件详情**: 见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## ⚠️ 常见坑点速查

| 问题            | 排查文档                                                        |
| --------------- | --------------------------------------------------------------- |
| 分类/标签不显示 | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#侧边栏分类数据流) |
| 搜索不准/很慢   | [docs/AI.md](./docs/AI.md#4-召回阶段-recall-phase)              |
| 文章时间不对    | [docs/UTILS.md](./docs/UTILS.md#时区转换)                       |
| API 返回 401    | [docs/API.md](./docs/API.md#环境配置)                           |
| 图片加载失败    | [utils/imageUtils.ts](./utils/imageUtils.ts)                    |

**完整问题诊断**: 见 [docs/TESTING.md](./docs/TESTING.md#常见问题)

---

## 🔍 代码搜索关键词

快速定位代码的关键词：

- **搜索**: `hybrid_search_articles`, `&@~` (PGroonga), `match_priority`
- **AI Prompt 动态管理**:
  - **简报 Prompt**: 存储在 Supabase `app_config` (key: `gemini_briefing_prompt`)。
  - **对话 Prompt**: 存储在 Supabase `app_config` (key: `gemini_chat_prompt`)。
  - **操作脚本**: `pnpm prompt:push/pull` 和 `pnpm chat-prompt:push/pull` 用于本地同步。
- **AI 性能**: `pgmq`, `embeddings.ts`, `Gemini`
- **时区**: `shanghaiDayToUtcWindow`, `dateUtils`
- **FreshRSS**: `tagFetcher`, `/tag/list`
- **内容清洗**: `cleanHtml`, `extractImages`
- **API**: `app/api/*/route.ts`
- **状态**: `articleStore`, `useFilters()`

**详细函数说明**: 见 [docs/UTILS.md](./docs/UTILS.md)

---

## 🔄 常见开发任务

### 添加新 API 端点

1. 参考: [docs/API.md](./docs/API.md)
2. 时间转换: 必用 `shanghaiDayToUtcWindow()` (见 [docs/UTILS.md](./docs/UTILS.md))
3. 写测试: 见 [docs/TESTING.md](./docs/TESTING.md)

### 修改数据库查询

1. 参考: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
2. 关注 FreshRSS 的 `count` vs `unread_count` (见 [docs/API.md](./docs/API.md))
3. 时区转换: [docs/UTILS.md](./docs/UTILS.md)

### 前端开发

1. 参考: [docs/COMPONENT_CATALOG.md](./docs/COMPONENT_CATALOG.md)
2. 状态管理: [docs/STORE.md](./docs/STORE.md)

### 性能优化

1. 参考: [docs/TODO.md](./docs/TODO.md) 的待优化项
2. 架构: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 📚 docs/ 文档导航

这是你的**主要文档库**。根据任务类型选择：

| 文档                     | 内容                                 | 何时查阅          |
| ------------------------ | ------------------------------------ | ----------------- |
| **ARCHITECTURE.md**      | 整体架构、数据流、服务集成           | 理解系统设计      |
| **API.md**               | 所有 API 路由、参数、返回值详解      | 编写 API 相关代码 |
| **UTILS.md**             | 工具函数详细说明（时区、内容清洗等） | 使用 helper 函数  |
| **TESTING.md**           | 测试策略、如何写测试                 | 编写测试          |
| **COMPONENT_CATALOG.md** | 前端组件库说明                       | 前端开发          |
| **STORE.md**             | 状态管理深度解析                     | 修改状态逻辑      |
| **TODO.md**              | 待优化项、技术债                     | 性能优化          |
| **SEO.md**               | SEO 策略和优化                       | 改进 SEO          |

**💡 建议**: 修改任何文件前，先在 docs/ 中查阅相关文档！

---

## ✅ 提交代码前清单

- [ ] `pnpm build` 通过 (包含 Lint & TS 类型检查)
- [ ] 相关文档已更新 (docs/ 文件夹)
- [ ] 如有 mock 数据变更，已更新 [e2e/mocks/data.ts](./e2e/mocks/data.ts)

---

## 🚀 快速命令

```bash
pnpm run dev      # 启动
pnpm test         # 单元测试
pnpm test:e2e     # E2E 测试
pnpm run lint     # 检查
```

---

_Last Updated: 2026-01-06_
