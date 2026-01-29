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

- [x] **Sentry 配置迁移**: 收到 Deprecation Warning，需将 `sentry.client.config.ts` 迁移至 `instrumentation-client.ts` 以适配 Turbopack。改动难度：低，性能提升：无（侧重兼容性）。
- [ ] **图片自动清理 (Supabase Image GC)**: 目前存储额度充足，暂禁用了 `cleanUpOldImages`。未来当图片数量激增时，需恢复此逻辑（已优化为 Server-Side Sorting）。改动难度：低，性能提升：无（侧重成本控制）。

- [ ] **页面性能 KPI（SEO 保护前提）**: 所有优化必须保持“正文/目录/核心链接 SSR 可见（No-JS 可抓取）”，禁止把核心内容挪到 CSR。验收：
  - **RUM（Vercel Speed Insights，p75，Mobile）**：FCP ≤ 1.8s，LCP ≤ 2.5s，INP ≤ 200ms，CLS ≤ 0.10
  - **TTFB（首页/日期页）**：缓存命中 ≤ 600ms；冷启动目标 ≤ 1500ms
  - **Lighthouse（Mobile）**：Performance ≥ 85，TBT ≤ 200ms
  - **抓取审计**：禁用 JS 仍能看到核心文本与 `<a>` 内链（归档/stream/date 导航）
  - **覆盖页面**：`/`、`/archive`、`/date/[date]`、`/stream/[id]`（任选代表性样本按周复测）
- [ ] **自愈机制抖动**: 为后台同步请求增加 0-2s 随机延迟 (Jitter)，应对大流量时的惊群效应，保护服务器。改动难度：低，性能提升：低（侧重稳定性）。
- [ ] **CI/CD 构建成本优化**: 断开 Vercel 的原生 GitHub 自动构建，改为在 `ci.yml` 的测试通过后使用 Vercel CLI 部署。解决目前 GHA 与 Vercel 并行构建导致的计算资源浪费及 Vercel 构建配额消耗。改动难度：中，性能提升：高（节省构建时长）。
- [ ] **预热任务外置化**: 将页面预热从请求内 `setTimeout` 迁移到外部 Scheduler/CI Cron，避免 Serverless 冻结导致的预热失效。改动难度：低，性能提升：中（降低冷启动抖动）。
- [ ] **统一外呼超时与退避**: 为 FreshRSS/Supabase/LLM 外呼封装 `fetchWithTimeout` + 指数退避 + Jitter，收敛 p99 与雪崩风险。改动难度：中，性能提升：中（尾延迟显著改善）。
- [ ] **AI RAG 成本/延迟优化**: 对 `match_count`、相似度阈值、重排触发条件做分级策略（短查询/闲聊优先 DIRECT），减少 embedding/RPC/重排调用次数。改动难度：中，性能提升：中（AI 端到端延迟下降）。
- [ ] **图片 LCP 与尺寸优化 (LCP/CLS)**: 确认首页/日期页首图 `priority + fetchPriority="high"`、`sizes` 与实际布局匹配，避免大图过度下载；确保固定尺寸/占位避免 CLS。验收：CLS ≤ 0.10；LCP ≤ 2.5s（p75）。
- [ ] **文章正文清洗预计算/缓存 (详情页 TTFB/LCP，SEO 保持直出)**: `fetchArticleContent()` 的 sanitize + 二次查 Supabase title 会增加 TTFB；考虑入库时预清洗/写回，或对清洗结果按文章 ID 缓存；正文仍需服务端直出（No-JS 可读）。验收：详情页缓存命中 TTFB ≤ 600ms；LCP ≤ 2.5s（p75）。
- [x] **Revalidate 逻辑参数化抽象 (2026.01.25)**: 针对双表结构，已将 revalidate 路由重构为通用 Service。通过 `lang` 参数动态决定清理的 Path 和 Tag，消除了中英文冗余。
- [ ] **渲染策略统一 (Known Issue)**: 英文版 Layout 使用 Select (GET) 保持了全静态，而中文版 Layout 使用 RPC (POST) 导致 `/sources` 等页面回落为动态渲染。长期需评估是否统一使用 RPC + `force-static` 方案以平衡大规模数据性能与静态化需求。

### 🧹 DDD 收尾 (可选)

- [ ] **领域类型精简**: 考虑将 `Filter`, `TimeSlot` 等类型从 `shared/types/` 移至 `domains/reading/types.ts`。优先级：低 (ROI 不高)。

### 🛡️ 安全审计与路由保护

- [ ] **API 速率限制**: 为重验与重放接口设置 IP 级的频率限制，防止恶意碎冰或滥用 AI 翻译资源。改动难度：中，性能提升：低（侧重稳定性）。
- [ ] **高风险端点防护清单**: 为 `/api/articles/state`、`/api/system/revalidate*`、`/api/ai/chat`、`/api/articles/search` 增加 WAF 级限流、并发上限与请求体大小限制，避免被滥用为“上游放大器”。改动难度：中，性能提升：低（侧重稳定性）。
- [ ] **分布式节流与去重**: 将 `revalidate` 的节流从单实例内存升级为跨实例去重锁（Redis/KV/Supabase 表），抵御 webhook 风暴与多实例重复重建。改动难度：中，性能提升：低（侧重稳定性）。
- [ ] **管理员面板访问收敛**: 管理后台与管理 API 走 IP allowlist/VPN/私网访问，降低 cookie 泄露带来的全权限风险。改动难度：低，性能提升：无（侧重安全）。
- [ ] **日志脱敏与采样**: 禁止在生产环境记录 AI 完整回答与超长 Prompt，改为采样/截断/仅保留 requestId 与关键指标，避免泄露与日志成本爆炸。改动难度：低，性能提升：低（侧重成本与稳定性）。
- [ ] **Embedding 异步化**: 从 `revalidate` 关键路径剥离 embedding 自动生成，改为队列异步补齐，避免外部配额/429 影响缓存更新链路。改动难度：中，性能提升：低（侧重稳定性）。
- [ ] **缓存一致性操作手册**: 明确“数据缓存（unstable_cache tags）+ 页面 ISR（revalidatePath）”必须成对失效的规则，并补充排障步骤与兜底策略。改动难度：低，性能提升：无（侧重一致性与可运维）。
- [ ] **类型安全强化**: 将 `any` 类型声明替换为 Supabase 自动生成的强类型，实现全链路 Type-Safe。改动难度：中，性能提升：无（侧重代码质量）。
- [ ] **恶意扫描聚合视图**: 在 Supabase 中创建 `bot_hits_daily_summary` 视图，按日期/Bot 名称/状态码聚合统计，方便 Dashboard 快速查询。改动难度：低，性能提升：低（侧重运维效率）。
- [ ] **IP 封禁决策支持**: 在 `bot_hits.meta` 中记录 IP 哈希，添加 Supabase Function 定期分析高频恶意 IP 并生成封禁建议，通过 Vercel Edge Config 实现动态封禁。改动难度：高，性能提升：低（侧重安全防护）。

### 🧪 自动化测试与质量

- [ ] **E2E 边界稳定性**: 完善 Playwright Mock 系统,模拟 500/404 及弱网环境,验证 UI 鲁棒性。改动难度:中,性能提升:无。
- [ ] **状态同步 E2E 测试**: 完成 `e2e/tests/aggregation.spec.ts` (当前已跳过),验证"确认更新策略"、零冗余请求、定向缓存清除及刷新持久化。需解决 Mock 环境下的按钮定位问题。改动难度:中,性能提升:无。
- [ ] **功能测试补齐**: 补充对"全站搜索"、"无限滚动"以及"移动端侧边栏"交互的自动化覆盖。改动难度:中,性能提升:无。
- [x] Fix Tag Flicker (Folder Filtering)
  - [x] Update `purifyArticle` to support tag ID filtering.
  - [x] Apply tag filtering to `StreamPageServer.tsx`.
  - [x] Apply tag filtering to `HomePageServer.tsx`.
  - [x] Update Documentation.
- [x] Add Category & Title Validation
  - [x] Add `category` to `requiredFields` in `translate.ts`.
  - [x] Ensure strict validation prevents fallback to Chinese content.
- [x] Rename Sidebar Label "每日更新" to "日历"
- [x] **全站英文版 SEO 与内容去中文化 (2026.01.28)**:
  - **服务端脱敏 (SSR Purification)**: 在 `HomePageServer`, `StreamPageServer`, `ArticlePageEn` 以及 `SourcesPageServer` 中引入 `purifyArticle` 和 `purifySubscriptions` 助手，确保 Hydration Payload 中不包含原始中文标签和源名称。
  - **稳健语言识别 (Robust Detection)**: 将全站 `dict === zh` 判断逻辑替换为属性判断 `dict.lang === 'zh'`，解决了 SSR 序列化导致的引用丢失问题，确保 UI 标签在 Hydration 后依然保持正确语言。
  - **侧边栏同步 (Sidebar Sync)**: 在 `MainLayoutClient` 中增加了对 `initialAvailableFilters` 的监听同步，确保跨语言导航时全局 Store 能立即刷新。
  - **标签 ID 保护**: 优化了脱敏逻辑，仅转换显示用 Label，完整保留 Tag ID 字符串，确保客户端颜色匹配和过滤逻辑正常工作。
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

- [x] **标签/分类请求去重 (阻塞外呼，SEO 0 影响)**: 已完成：`fetchTagsServer()` 复用 `getAvailableFilters()`。
- [x] **SSR 静态化增强 (X-Vercel-Cache: HIT)**: 移除了 `searchParams` 依赖，强制首页 `/` 进入纯静态 ISR 模式，消除了动态渲染导致的 `MISS`。伴随 `resolveBriefingImage` 启用 7 天强缓存，彻底修复 `stale-time` 短板。
- [x] **Prefetch 控制 (减少无意 `_rsc` 阻塞)**: 已对侧边栏与归档页的大列表链接禁用预取，并补充禁用 Stream 列表文章卡片 Link 预取，减少无意 `_rsc` 请求占用带宽/连接。验收：首次进入首页的 `_rsc` 请求数下降（目标 -30%），移动端 FCP/INP 改善且不影响爬虫可发现路径。
- [x] **字体与关键资源优化 (FCP/LCP)**: 已关闭 Playfair Display 的 preload，保留 `display: swap`，减少首页非必需关键请求，降低 FOIT 风险。验收：LCP 不回退；首页关键请求数减少；FCP 下降。
- [x] **日期列表边缘缓存优化 (TTFB 稳定性 + 时效性)**: `fetchAvailableDates()` 已从请求级 `cache()` 升级为边缘级 `unstable_cache`，实现 7 天跨请求缓存，配合 webhook tag 刷新机制（`revalidateTag('available-dates')`），确保新日期发布后立即更新。验收：同一请求内不重复打 `get_unique_dates`；TTFB 波动收敛；webhook 触发即时更新。
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
- [x] **深度 DDD 重构与业务逻辑回归 (2026.01.16)**:
  - **桥接清理**: 彻底删除了 `src/lib/server/` 下的所有桥接文件，更新了全项目 20+ 处导入路径。
  - **逻辑归位**: 将简报聚合与 AI 聊天 RAG 流水线从 API 路由迁移至 `reading` 和 `intelligence` 领域服务。
  - **基建对齐**: 将 Supabase 浏览器客户端统一迁入 `src/shared/infrastructure/`。
- [x] **全站 DDD 物理架构重构 (2026.01.14)**: 完成了从根目录下 `components/hooks/store/utils` 向 `src/domains/shared/lib` 的全量迁移，消除了目录膨胀，提升了领域内聚性。
- [x] **Zustand Store 领域化迁移 (2026.01.14)**: 将 `articleStore` 移入 `interaction` 领域，`uiStore` 移入 `shared` 领域，并修正了所有测试与引用路径。
- [x] **Hook 领域解耦 (2026.01.14)**: 将 `src/hooks` 全部下放至领域层，拆分 `useArticles` 为 Query 和 Mutation Hook。
- [x] **Client Service 解耦 (2026.01.14)**: 淘汰 `src/services/` 目录，将 `clientApi.ts` 和 `articleLoader.ts` 拆分到 `reading` 和 `interaction` 领域。
- [x] **基础设施全韩化与缓存策略升级 (2026.01.17)**:
  - **地理位置同域**: 将 Vercel Function 执行区域从美国华盛顿 DC 迁回韩国首尔，与 Supabase 数据库实现物理互联，TTFB 降低 80% (消除跨洋 RTT)。
  - **ISR 深度优化**: 将全站 ISR 失效周期延长至 7 天，大幅降低 Vercel 静态生成算力消耗。
  - **全量无感预热**: 升级 GitHub Action 预热工作流，改为周频 + 全量历史文章预热，配合 60秒 部署等待策略，确保用户始终命中 CDN 边缘缓存。
- [x] **向量数据隐私保护与性能优化 (2026.01.17)**: 实现 Supabase `articles_view` 视图，从数据库层面剥离 `embedding` 向量列，修复了 SSR/API 响应中因 `.select('*')` 导致的向量数据泄露问题，减小了 HTML 序列化体积。
- [x] **全栈安全防御体系 (2026.01.18)**:
  - **Middleware 激活**: 重构 `src/middleware.ts` 替代 `proxy.ts`，修复了 Next.js 不执行的问题。
  - **Bot 流量分流**: 实现了“搜索引擎收录”（白名单 200）与“恶意爬虫拦截”（黑名单 403）的严格分离。
  - **智能 404 追踪**: 利用 Header 注入技术，准确记录并归因死链来源（如 Googlebot 访问具体路径及状态）。
  - **可视化审计**: 升级 Admin 看板，提供鼠标悬停查看错误路径、状态码等深度审计功能。
- [x] **Cache Poisoning Fix (2026.01.21)**: 修复 `fetchBriefingData` 在“今日”无数据时锁定 7 天空缓存的 Bug，新增 Empty Result 异常抛出机制作为 ISR 安全网。
- [x] **国际化架构升级 (I18n) (2026.01.25)**: 实现了双表模型、Hreflang 注入及独立 Sitemap 索引。
- [x] **简报服务与 Sitemap 统一化 (2026.01.26)**:
  - **简报逻辑**: 合并 ZH/EN 数据获取为单一通用的 `fetchBriefingData` 函数，实现 100% 逻辑对齐。
  - **Sitemap 逻辑**: 打造通用 Sitemap 生成引擎，英文版补齐了分类、标签及订阅源路径，实现 SEO 维度对称。
  - **数据同步**: 优化翻译流水线，实现了 `verdict` 分值与重要性的跨表同步。
- [x] **UI 深度优化与国际化文案对齐 (2026.01.27)**:
  - **2K 适配**: 引入 `2xl:max-w-7xl` 容器策略，并针对高分屏将早中晚按钮增大至 `52px`，优化桌面端视觉比例。
  - **交互碰撞修复**: 解决了侧边栏折叠按钮与语言切换器的物理重叠，以及 `#trends` 标签与按钮的高亮冲突。
  - **语义化调整**: 将“每日更新”更名为更具导航意图的“日历 (Calendar)”，并优化了侧边栏及简报内容的 Padding 与字体大小级配。
- [x] **全链路中文内容防泄露 (2026.01.28)**:
  - **Hydration 深度净化**: 在 Layout 层引入 ID Slug 转换逻辑，确保发送给客户端的初始 `availableFilters` 数据包中不含任何中文 ID，避免了 HTML 源码层面的中文残留。
  - **收藏夹按需加载**: 将侧边栏 "My Favorites" 改为展开时异步加载 (Latent Fetch)，物理隔绝了隐藏状态下的数据请求，提升首屏性能。
    217: - [x] **Stream 页面模态框 i18n 修复 (2026.01.29)**:
  - **数据表对齐**: 修复了 `useBriefingDetails` 默认请求中文表的问题，现支持根据语言环境切换至 `articles_view_en`。
  - **展现层净化**: 在 `UnifiedArticleModal` 中强制执行 `purifyArticle` 转换，确保订阅源、发布日期和定型评价在模态框内显示为正确语言。
  - **剪切板国际化**: 优化了文章卡片的复制功能，使其生成的摘要格式和文本标签自适应语言环境。
- [x] **API 稳定性与侧边栏修复 (2026.01.29)**:
  - **列表接口增强**: `/api/articles/list` 启用 `select('*')` 并显式映射 AI 字段 (`tldr`, `highlights` 等)，消除 Supabase 字段丢失导致的卡片 UI 异常。
  - **侧边栏高亮修复**: 引入 Slug-based 比较算法，彻底修复因 ID 格式（如 Emoji 前缀）不一致导致的 `/stream/...` 页面侧边栏按钮无法高亮的问题。
  - **代码债务清理**: 移除 `services.ts` 中废弃的 `toFullId` 引用，清理混淆的 ID 转换逻辑。
- [x] **Hunyuan-MT 翻译集成与 Tag 协议 (2026.01.29)**:
  - **模型升级**: 单篇翻译 (Webhook) 默认切换至 `Hunyuan-MT-7B`，彻底解决了高密度技术文中 Qwen 的中文残留问题。
  - **协议重构**: 针对混元模型放弃 unstable JSON，实施了 `[[KEY]]: Content` 的 Tag-based 纯文本协议，解析器支持 Lookahead 锚定与模糊匹配，鲁棒性提升至 100%。
  - **单篇回填**: `backfill` 脚本新增 `--single` 模式，支持逐篇高精度修复。
