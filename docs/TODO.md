# 项目任务清单 (TODO)

本文档用于记录项目中待优化的技术点、备选架构方案以及已知的技术债。

> [!IMPORTANT]
> **开发核心准则**:
>
> 1. **SEO 第一**: 任何性能优化必须以不损害搜索引擎爬虫抓取为前提。
> 2. **首屏无 JS 渲染能力**: 必须保证核心内容（正文、目录链接、元数据等）在浏览器禁用 JS 的情况下依然能够通过 SSR/ISR 阻塞式呈现。

---

## 📋 待处理事项概览

### 🚀 性能提升与技术优化

- [ ] **自愈机制抖动**: 为后台同步请求增加 0-2s 随机延迟 (Jitter)，应对大流量时的惊群效应，保护服务器。改动难度：低，性能提升：低（侧重稳定性）。
- [ ] **CI/CD 构建成本优化**: 断开 Vercel 的原生 GitHub 自动构建，改为在 `ci.yml` 的测试通过后使用 Vercel CLI 部署。解决目前 GHA 与 Vercel 并行构建导致的计算资源浪费及 Vercel 构建配额消耗。改动难度：中，性能提升：高（节省构建时长）。

### 🧹 DDD 收尾 (可选)

- [ ] **DataFetcher 服务端拆分**: `lib/server/dataFetcher.ts` 可拆分至 `domains/reading/services/server/` 和 `domains/interaction/services/server/`。优先级：低（仅影响 SSR，客户端已完成解耦）。
- [ ] **领域类型精简**: 考虑将 `Filter`, `TimeSlot` 等类型从 `shared/types/` 移至 `domains/reading/types.ts`。优先级：低 (ROI 不高)。

### 🛡️ 安全审计与路由保护

- [ ] **API 速率限制**: 为重验与重放接口设置 IP 级的频率限制，防止恶意碎冰或滥用 AI 翻译资源。改动难度：中，性能提升：低（侧重稳定性）。
- [ ] **类型安全强化**: 将 `any` 类型声明替换为 Supabase 自动生成的强类型，实现全链路 Type-Safe。改动难度：中，性能提升：无（侧重代码质量）。

### 🧪 自动化测试与质量

- [ ] **E2E 边界稳定性**: 完善 Playwright Mock 系统,模拟 500/404 及弱网环境,验证 UI 鲁棒性。改动难度:中,性能提升:无。
- [ ] **状态同步 E2E 测试**: 完成 `e2e/tests/aggregation.spec.ts` (当前已跳过),验证"确认更新策略"、零冗余请求、定向缓存清除及刷新持久化。需解决 Mock 环境下的按钮定位问题。改动难度:中,性能提升:无。
- [ ] **功能测试补齐**: 补充对"全站搜索"、"无限滚动"以及"移动端侧边栏"交互的自动化覆盖。改动难度:中,性能提升:无。
- [ ] **SEO 自动化扫描**: 验证各日期页面的 Canonical URL、JSON-LD 及 Meta 数据在 ISR 构建后的一致性。改动难度：低，性能提升：无。
- [ ] **向量索引优化 (HNSW)**: 当文章数量达到 20k+ 时，重新开启 HNSW 索引以维持毫秒级检索延迟（目前 1k+ 数据全表扫描更快且更准）。

### ✨ 功能与体验迭代

- [ ] **AI 助手搜索扩展**: 集成 Bing/Baidu 搜索接口 (如 Serper API)，增强对特定中文领域或垂直行业时事的覆盖。改动难度：中，性能提升：无（优化知识覆盖面）。
- [ ] **AI 引用准确度对账**: 抽查 AI 回答中引用本地文章的准确性，微调 RAG 提示词。改动难度：中，性能提升：无。
- [ ] **悬停内容预取**: 在文章卡片的《阅读》按钮悬停时，针对性预取该文章全文，实现“秒开”体感。改动难度：低，性能提升：中。
- [ ] **列表虚拟化**: 在文章列表极长时引入虚拟滚动，确保移动端 60fps 滚动。改动难度：低，性能提升：中。
- [ ] **移动端离线体感**: 优化 Service Worker 或持久化策略，提升弱网下的数据暂存体验。改动难度：高，性能提升：高（极大优化弱网体感）。

### 📐 SDD (Schema-Driven Development) 演进

> **目标**: 以 Schema 为唯一真相来源，自动生成类型、验证逻辑和文档，提升 AI 生成代码的可靠性。

**推荐工具栈:**

| 工具        | 用途                             | 优先级                   |
| ----------- | -------------------------------- | ------------------------ |
| **Zod**     | 运行时 Schema 验证 + TS 类型推导 | 🟢 高 (首选)             |
| **tRPC**    | 端到端类型安全 API               | 🟡 中 (可选，改动较大)   |
| **TypeBox** | JSON Schema 互操作               | 🟠 低 (仅需跨系统交换时) |

**落地步骤:**

- [ ] **API 响应验证**: 在 `apiClient.ts` 中引入 Zod，验证后端返回数据符合预期 Schema。
- [ ] **请求参数验证**: 在 API 路由中用 Zod 替代手动 `typeof` 检查。
- [ ] **类型统一**: 从 Zod Schema 推导 `Article`、`Filter` 等核心类型，消除手写类型与运行时的脱节。
- [ ] **文档自动生成**: 探索从 Zod Schema 生成 OpenAPI 文档或 Markdown 类型文档。

**现有 SDD 基础:**

- ✅ Supabase 类型自动生成 (`pnpm gen:supabase-types`)
- ✅ FreshRSS OpenAPI 类型生成 (`pnpm gen:freshrss-types`)
- ✅ Prompt 外部化 (数据库存储，`prompt:push/pull` 同步)

---

### 🧪 TDD (Test-Driven Development) 演进

> **目标**: 对关键逻辑采用"先写测试，再写代码"的严格 TDD 流程，提升 AI 生成代码的可靠性。

**什么是严格 TDD？**

```
1. Red (红灯)     → 先写一个失败的测试用例
2. Green (绿灯)   → 写最少的代码让测试通过
3. Refactor (重构) → 优化代码，保持测试通过
```

**分层测试策略 (Testing Trophy):**

| 层级            | 比例 | 适用范围                            |
| --------------- | ---- | ----------------------------------- |
| **Unit**        | 50%  | `utils/`, 纯函数, Store Actions     |
| **Integration** | 35%  | Hook + Store + API 联动             |
| **E2E**         | 15%  | 关键用户流程 (首页加载、搜索、收藏) |

**渐进式落地路径:**

| 阶段            | 方式       | 说明                               |
| --------------- | ---------- | ---------------------------------- |
| **Utils/Store** | 严格 TDD   | 新增功能必须先写测试               |
| **API 新功能**  | 严格 TDD   | 先定义 Schema + 测试用例           |
| **Bug 修复**    | 强制 TDD   | 任何 Bug 必须先有失败测试才能修复  |
| **UI 组件**     | Test-After | 先做原型，再补测试                 |
| **AI 集成**     | Test-After | LLM 输出不确定，先实现再 Mock 测试 |

**工具增强:**

- [ ] **Coverage 门控**: 设定最低覆盖率 (建议 60%)，CI 不达标则阻断合并。
- [ ] **Vitest Watch Mode**: 开发时启用 `pnpm test --watch` 实时反馈。
- [ ] **Snapshot Testing**: 对复杂对象/组件输出做快照防止意外变更。

**现有测试基础:**

- ✅ Vitest + Testing Library + Playwright
- ✅ `e2e/mocks/data.ts` 统一 Mock 数据
- ✅ GitHub Actions CI 运行测试

---

### 🔄 架构备选方案

- [ ] **Edge 聚合中间层 (BFF)**: 在 Vercel Edge Function 上实现轻量级聚合端点，一次性完成 Storage 检查、DB 读取和 Metadata 组装，合并跨洋 RTT。改动难度：高，性能提升：高（显著减少冷启动 RTT，适合全球化部署）。

---

## 🛠 详细说明 (待处理)

### AI 助手搜索扩展

- **TODO**: 探索使用 Function Calling 动态接入第三方搜索 SDK (如 SerpApi)，在原生 Google Grounding 之外提供更灵活的选择。

---

## ✅ 已完成优化 (Milestones)

- [x] **全局对话 AI 助手**: 实现基于 Gemini 2.0/2.5/3.0 的全局助理，支持分级 RAG、Google 搜索增强及流式响应。
- [x] 模型版本锁定与配额优化 (2026.01.06): 针对 2026 年模型变动实现了 ID 锁定与多池“羊毛” ID 挖掘，解决了 429 配额报错问题。
- [x] AI 对话渲染性能深度优化与 Prompt 外部化 (2026.01.06)
- [x] **混合语义搜索**: 启用 Supabase pgvector (768 维)，实现了高效的“关键词+语义”双路召回。
- [x] **CDN 自动预热**: 实现 Webhook 触发后的自动页面访问，消除了 ISR 首次访问的构建延迟。
- [x] **Bundle Size 优化**: 严格限制 `sanitize-html` 仅在服务端运行，显著减小了首屏 JS 体积。
- [x] **图片自适应代理**: 通过 Weserv.nl 动态压缩外链图片，节省了 80%+ 的用户流量。
- [x] **API 响应聚合 (详情页优化)**: 在详情页通过 `include_state` 参数合并获取正文与 FreshRSS 状态，消除了详情加载时的瀑布流。_(注：列表流已切换至 Scheme C 异步水合，该优化现专注于阅读器体验)_。
- [x] **后台批量补录优化**: 重构 Admin Backfill 面板，支持多模型选择、严格未生成筛选、批量日志序号化及精确错误码反馈 (2026.01.08)。
- [x] **AI 对话增强与稳定性修复 (2026.01.08)**: 实现了基于意图的 AI Router，支持“闲聊模式”；增强了角标识别支持小数与上标，并解决了加粗文本点击失效问题；移除了多账号间的自动回退逻辑，实现独立配额管理；修复了项目中多处影响构建的 TS 错误。
- [x] **全站 DDD 物理架构重构 (2026.01.14)**: 完成了从根目录下 `components/hooks/store/utils` 向 `src/domains/shared/lib` 的全量迁移，消除了目录膨胀，提升了领域内聚性。
- [x] **Zustand Store 领域化迁移 (2026.01.14)**: 将 `articleStore` 移入 `interaction` 领域，`uiStore` 移入 `shared` 领域，并修正了所有测试与引用路径。
- [x] **Hook 领域解耦 (2026.01.14)**: 将 `src/hooks` 全部下放至领域层，拆分 `useArticles` 为 Query 和 Mutation Hook。
- [x] **Client Service 解耦 (2026.01.14)**: 淘汰 `src/services/` 目录，将 `clientApi.ts` 和 `articleLoader.ts` 拆分到 `reading` 和 `interaction` 领域。
