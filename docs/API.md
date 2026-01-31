# API 与服务架构指南

> **注意**: 本项目于 2025 年 12 月进行了深度重构，引入了“智能数据策略”并严格分离了服务端与客户端逻辑。

## 1. 核心数据策略

我们在后端数据获取上做了针对性的性能分层：

| 数据类型       | 获取方式              | 策略 (Complexity)   | 缓存 (Cache)  | 优势                                                                                                                     |
| :------------- | :-------------------- | :------------------ | :------------ | :----------------------------------------------------------------------------------------------------------------------- |
| **可用日期**   | **Supabase RPC**      | **O(1) / O(log N)** | **无 (实时)** | 数据库层直接聚合 `get_unique_dates`，利用 **Index Only Scan** 避免全表扫描，0ms 延迟，**彻底解决跨天数据更新滞后问题**。 |
| **标签/分类**  | **FreshRSS API**      | O(N)                | **1小时**     | 使用 `unstable_cache` 包裹。Tag 列表变化不频繁，容忍 1 小时延迟以换取极速加载。                                          |
| **单文章内容** | **SSR Fetch**         | O(1)                | **动态**      | 文章详情页走 SSR 直出，保证 SEO；通过 `table` 参数区分中英文物理表。                                                     |
| **向量搜索**   | **Gemini + pgvector** | **768 维降维**      | **无**        | 采用 768 维度兼顾检索速度与内存消耗。中文支持语义检索，英文目前采用 ILIKE 降级。                                         |

## 2. 目录结构概览

### API 路由 (`app/api/`)

API 路由按照业务领域进行组织：

- **`articles/`**: 核心文章管理。
  - `POST /api/articles`: 获取单篇文章的清洗后内容。
  - `GET /api/articles/list`: 获取文章列表 (基于 FreshRSS 筛选，融合 Supabase 英文/AI 元数据)。采用 `select('*')` 与显式字段映射确保数据完整性。
  - `GET /api/articles/search`: **[混合搜索]** 同时调用 Gemini 生成向量并执行 Supabase RPC `hybrid_search_articles`。
  - `POST /api/articles/state`: 统一的文章状态读写 (已读/收藏/标签)。
- **`briefings/`**: 简报数据服务。- **简报数据 (`fetchBriefingData`)**: **[架构统一]** 核心数据聚合函数。支持 `lang` 参数 ('zh' | 'en')，自动处理物理表映射、分值排序与三级分组逻辑。边缘缓存 7 天。- **英文简报数据 (`fetchEnglishBriefingData`)**: 已简化为 `fetchBriefingData(date, 'en')` 的封装，确保中英文逻辑 100% 对齐。
- **`meta/`**: 元数据服务。
  - `GET /api/meta/available-dates`: **[优化]** 调用 RPC 获取实时日期。英文版通过 `fetchAvailableDatesEn` 过滤无效日期。
  - `GET /api/meta/tags`: **[缓存]** 获取缓存的分类标签列表。
    - _注：返回的原始数据在前端渲染前需通过 `label-display.ts` 进行多语言映射，并使用 `slug-helper.ts` 生成语义化链接。_

### 服务层 (Domain Services)

我们强制执行 **领域驱动设计 (DDD)**，核心业务逻辑下沉至领域层：

#### A. 领域服务 (`src/domains/[domain]/services/`)

- **职责**: 封装核心业务逻辑，直接与数据库 (Supabase) 或外部 API (FreshRSS) 通信。
- **关键服务**:
  - `reading/services.ts`: 简报聚合、可用日期获取、标签列表。
  - `reading/utils/label-display.ts`: **[展现层净化]** 负责全量元数据的多语言脱敏（Purification）与标签清洗。
    - **多维转换**: 不仅支持 `sourceName` 和 `tags` 的翻译，还涵盖了 `category` 和 `verdict.type` (智核评级) 的字典映射。
    - **标签白名单**: 集成了物理脱敏逻辑，通过白名单剔除文章对象中的分类 ID (Folders)，彻底消除 UI 闪烁。
    - **ID 保护**: 采用“标签名称转换、ID 字符串保护”策略，确保 client-side 颜色匹配逻辑不受翻译影响。
    - **全链路集成**: 已深度集成至 `HomePageServer`, `StreamPageServer`, `BriefingPageServer`, `ArchivePageServer` 等核心 Server 组件，以及客户端的 `UnifiedArticleModal`。
  - `intelligence/services/chat-orchestrator.ts`: AI 聊天编排调度。
  - `intelligence/services/english-briefing-sync.ts`: **[新]** 负责将中文简报数据翻译并同步至 `articles_en` 表。
    - **元数据对齐**: 系统采用了 **“瘦身表 + 视图”** 架构。`articles_en` 表仅存储翻译后的长文本字段，而 `link`, `published`, `verdict` (评分/重要性) 则通过视图 `articles_view_en` 实时从主表拉取。这消除了数据冗余，确保了多语言元数据的绝对一致性。

## 3. 关键重构变更

| 旧逻辑                              | 新逻辑                        | 收益                                              |
| :---------------------------------- | :---------------------------- | :------------------------------------------------ |
| `select * from articles` (获取日期) | `rpc('get_unique_dates')`     | 查询时间从 500ms -> 10ms，且数据实时。            |
| 桥接层 `lib/server/`                | 领域服务 `domains/*/services` | **[2026.01 重构]** 物理路径已删除，逻辑全量下沉。 |
| API 路由硬编码逻辑                  | 编排器 `Orchestrator`         | **[2026.01 重构]** API 瘦身为 Controller。        |

### 4. 智能缓存碎冰 (Smart Cache Revalidation)

为了保证简报数据的实时性，系统实现了 **"统一 Revalidation 架构"**，通过共享服务处理中英双语的缓存刷新。

#### A. 全自动化 Webhook 刷新 (Unified)

- **ZH Endpoint**: `POST /api/system/revalidate` (监听 `articles` 表)
- **EN Endpoint**: `POST /api/system/revalidate-en` (监听 `articles_en` 表)
- **Shared Logic**: 两者均调用 `RevalidateService`，自动处理：
  - **智能日期检测**: 提取 `n8n_processing_date`，仅刷新对应日期的 ISR 页面。
  - **双语路径**: 自动判定刷新 `/date/...` 还是 `/en/date/...`。
  - **自动防抖**: 共享内存防抖池，10 秒内重复推送仅触发一次处理。
  - **CDN 预热**: 刷新后自动发起预热请求。

### B. 按需手动刷新 (Targeted Date)

- **端点**: `POST /api/system/revalidate-date`
- **用途**: 当用户点击“重新生成简报”或通过 Hook 修改文章状态（已读/收藏）时调用。

### C. 缓存预热 (System Warmup)

- **端点**: `GET /api/system/warmup`
- **用途**: 触发全量 ISR 缓存预热。
- **鉴权**: Vercel Cron 自动鉴权或 Header 校验。
- **特性**: 从请求节点（如 Japan Edge）发起并发 fetch，模拟用户访问以生成缓存。

### D. 翻译回填 (Translation Backfill)

- **端点**: `GET /api/translate/backfill`
- **用途**: 自动翻译因 Webhook 失败而遗漏的文章。
- **调度**: 每天 UTC 17:00 (北京时间 01:00) 由 Vercel Cron 触发。
- **逻辑**: 查询 `articles` 与 `articles_en` 的差集，使用 `HUNYUAN_TRANSLATION_MODEL` 逐篇翻译。
- **限流**: 每次最多处理 10 篇，避免 5 分钟超时。
- **鉴权**: 使用 `CRON_SECRET` 环境变量验证请求。

### C. 缓存标签规范

- `briefing-data-YYYY-MM-DD`: 对应日期的专属数据标签。

---

> [!NOTE]
> 关于**三级状态同步**与**缓存自愈**的宏观架构，请参阅 [ARCHITECTURE.md](./ARCHITECTURE.md)；关于具体的数据流实现，请参阅 [STORE.md](./STORE.md)。
