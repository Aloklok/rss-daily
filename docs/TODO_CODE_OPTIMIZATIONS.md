# 代码级优化建议（来自代码审读）

以下建议基于对关键文件的审读：`lib/server/dataFetcher.ts`、`utils/dateUtils.ts`、`hooks/useFilters.ts`、`app/api/meta/available-dates/route.ts`、`app/date/[date]/page.tsx`。

按优先级排序的可执行条目：

- [ ] **为 `n8n_processing_date` 建立数据库索引与选择列优化**
  - 说明：`fetchBriefingData` 按 `n8n_processing_date` 做范围查询，目前使用 `select('*')` 会拉回大量字段。建议为 `n8n_processing_date` 添加索引（若尚无），并在按日查询时显式指定所需列（例如：`id, title, summary, tldr, verdict, n8n_processing_date, tags`）。
  - 目标：显著降低按日查询的 IO 与序列化成本，减少内存占用与网络传输。

- [ ] **将时区映射封装为单一工具 (`shanghaiDayToUtcWindow`)**
  - 说明：项目当前在多个地方用 `Intl` 或手工 UTC 计算映射上海日边界。建议在 `utils/dateUtils.ts` 增加 `shanghaiDayToUtcWindow(date: string): { startIso: string; endIso: string }`，并把 `app`/`lib` 中的引用迁移至该工具。
  - 目标：避免重复实现和边界错误，简化 `fetchBriefingData` 的逻辑并便于单元测试。

- [ ] **为 `lib/server/dataFetcher.ts` 添加单元测试覆盖（边界与慢查询）**
  - 说明：为 `shanghaiDayToUtcWindow` 与 `fetchBriefingData` 增加 Jest/Vitest 测试，覆盖跨日边界、UTC↔CST 映射以及 Supabase 超时/错误模拟。
  - 目标：防止时区回归并提高改动信心。

- [ ] **限制后端返回与按日分页**
  - 说明：即使页面只展示部分结果，也建议后端接口支持分页（`limit`/cursor），并在服务器侧限制单次返回字段集以降低 SSR 内存峰值。
  - 目标：缓解高流量或突发新闻日对 SSR 内存与延时的冲击。

- [ ] **短期内存缓存 / RPC 结果缓存**
  - 说明：`fetchAvailableDates` 当前调用 RPC `get_unique_dates`。建议对这个结果加短期内存缓存（LRU/TTL 30s-60s）或使用 edge cache，并在 webhook 触发时清理缓存。
  - 目标：减少 DB 负载与冷启动延迟。

- [ ] **查询慢日志与监控钩子**
  - 说明：在 `lib/server/dataFetcher.ts` 包裹 Supabase 调用以记录耗时；当查询超阈值（例如 200ms）时将事件发送到 Sentry/日志系统，便于定位性能热点。
  - 目标：增强可观测性并快速定位优化点。

- [ ] **悬停预取并发控制与 LRU 缓存**
  - 说明：为悬停预取实现并发上限（例如最多同时 2 个请求）与短期 LRU 缓存，避免用户浏览行为触发大量后端请求。
  - 目标：在提升感知速度的同时控制成本与带宽。

- [ ] **CI 中强制类型生成与构建检查**
  - 说明：在 CI 中加入 `pnpm gen:supabase-types` 与 `pnpm gen:freshrss-types`（或合并为 `pnpm gen:types`），并阻断未同步类型的 PR。
  - 目标：减少因类型不匹配导致的运行时错误。

- [ ] **明确导出并稳健处理 `fetchArticleStatesServer` 接口**
  - 说明：`app/date/[date]/page.tsx` 动态导入 `fetchArticleStatesServer`。建议在服务器端导出稳定、带类型的接口并在调用处加入降级逻辑（出错返回空对象）。
  - 目标：避免运行时模块路径变更或异常导致页面崩溃。

- [ ] **增加本地复现/开发脚本（`package.json`）**
  - 说明：新增脚本 `pnpm dev:with-sample-data` 与 `pnpm test:dates`，方便在本地快速复现时区与按日查询场景。
  - 目标：降低复现成本与调试门槛。

---

注：我无法直接修改 `docs/TODO.md`（尝试时出现编辑错误），故先把建议写入本文件。若你希望我把这些条目合并回 `docs/TODO.md`，我可以继续尝试或由你授权我直接提交合并。亦可直接替换原文件。
