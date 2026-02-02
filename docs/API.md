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
  - `intelligence/services/english-briefing-sync.ts`: **[新]** 负责翻译并同步至 `articles_en` 表。详细架构见 [INTELLIGENCE.md](../src/domains/intelligence/INTELLIGENCE.md#05-自动翻译同步-auto-translation)。

## 3. 关键重构变更

| 旧逻辑                              | 新逻辑                        | 收益                                              |
| :---------------------------------- | :---------------------------- | :------------------------------------------------ |
| `select * from articles` (获取日期) | `rpc('get_unique_dates')`     | 查询时间从 500ms -> 10ms，且数据实时。            |
| 桥接层 `lib/server/`                | 领域服务 `domains/*/services` | **[2026.01 重构]** 物理路径已删除，逻辑全量下沉。 |
| API 路由硬编码逻辑                  | 编排器 `Orchestrator`         | **[2026.01 重构]** API 瘦身为 Controller。        |

### 4. 智能缓存碎冰 (Smart Cache Revalidation)

系统实现了 **统一 Revalidation 架构**，通过共享服务处理中英双语的缓存刷新。

> 👉 **完整机制详见 [SYSTEM.md](../src/domains/system/SYSTEM.md)**

**端点速查**：

- `POST /api/system/revalidate` - 中文自动刷新
- `POST /api/system/revalidate-en` - 英文自动刷新
- `POST /api/system/revalidate-date` - 手动指定日期刷新
- `GET /api/system/warmup` - 缓存预热
- 翻译回填见 [INFRASTRUCTURE.md](./INFRASTRUCTURE.md#51-翻译回填机制-translation-backfill)

**缓存标签**: `briefing-data-YYYY-MM-DD`

---

> [!NOTE]
> 关于**三级状态同步**与**缓存自愈**的宏观架构，请参阅 [ARCHITECTURE.md](./ARCHITECTURE.md)；关于具体的数据流实现，请参阅 [STORE.md](./STORE.md)。
