# 阅读领域核心逻辑与组件 (Reading Logic & Components)

本文档映射了 `reading` 领域的渲染架构、导航逻辑、关键时间算法以及**国际化 (i18n)** 适配方案。

## 1. 核心组件映射

- **`Sidebar/`**: 全站发现路径入口（日期 / 分类 / 标签 / 归档 / 来源）。
  - `SidebarNavServer.tsx`: SSR 直出核心导航链接（No‑JS 可见）。
  - `SidebarLazyClient.tsx` / `SidebarClientMount.tsx`: JS 环境下懒加载交互侧边栏并替换 SSR 导航。
  - `SidebarContainer.tsx` + `SidebarView.tsx`: 交互侧边栏（筛选、刷新、收藏等 UI 行为）。
    - **同步逻辑**: 刷新按钮触发 `refreshFilters`。
    - **日期刷新**: 显式调用 `getAvailableDates` 更新本地 `dates` 状态，确保日历能即时反应后端新增数据。
    - **收藏智能刷新**: 刷新时判断 `hasLoadedStarred` 信号。若收藏模块从未展开加载，则跳过刷新请求以优化带宽。
- **`briefing/`**:
  - `BriefingView.tsx`: 负责简报的视觉分段。
    - **早中晚按钮**: 响应式布局 (`shrink-0`)，解决了 Windows 系统下的挤压问题；桌面端尺寸放宽至 `52px` 以适配大屏。
    - **布局宽度**: 引入 `2xl:max-w-7xl` (1280px) 策略，优化 2K 屏下的横向排布。
  - `BriefCard.tsx`: 高度压缩的信息密度展现。
    - **字体优化**: 内容字体调整至 `text-sm` (14px) 以确保高信息密度。
  - `POST /api/podcasts/generate`: **[智能路由]** 生成播客文稿并同步生成 TTS 音频。系统会根据 `modelId` 的 `provider` 属性自动在 Google (Native SDK) 与 SiliconFlow (OpenAI-compatible) 之间进行智能分发。支持 `modelId` 与 `enableThinking` 参数。音频上传至持久化存储，并在 `daily_podcasts` 表记录 `model_id`。返回 `{ script, audioUrl }`。
  - `PodcastPlayer.tsx`: **[播客特性]** 核心音频播放组件。
    - **双模播放机制 (Dual-Mode)**：
      - **MP3 优先 (Edge TTS)**：优先检测云端生成的 `audioUrl`。若存在，使用 `<audio>` 元素播放高质量神经语音 MP3，支持原生暂停/恢复及精确进度控制。系统引入了 `ttsSource` 互斥锁逻辑，确保 XiaoXiao 播放时 Google 语音强制静音，并增加了 300ms 的验证窗口以防止因浏览器自动播放限制导致的意外降级。
      - **Web Speech 降级**：若音频生成确定失败（经过重试或超时），启用本地 `window.speechSynthesis`。
    - **断点续播 (Web Speech Fallback)**：由于原生 `speechSynthesis.pause()` 在某些环境下不稳定（不释放音频占用），降级模式下采用“cancel + 分段保存索引”逻辑。将讲稿切分为句子块 (Chunks)，暂停时记录当前索引并 `cancel()`；继续播放时从该索引对应的 Chunk 重新起步。
    - **交互逻辑**：
      - 下拉菜单：支持点击触发及外部点击关闭。
      - 讲稿弹窗：新增刷新 🔄 和播放 ▶️ 按钮，支持手动更新讲稿记录并主动触发播放。
      - **模型与推理选择**：集成 `ModelSelector` 与 `ReasoningToggle`，允许管理员在生成前切换 AI 模型并开启“深度思考”。此状态实现了 `localStorage` 持久化。
      - 取消自动播放：打开模态框不再强制播报，尊重用户选择。
    - **权限控制**：通过 `useUIStore` 拦截，仅管理员（`isAdmin`）可见“重新生成”选项。
- **`article/`**:
  - `ArticlePage.tsx`: 独立页阅读器。
  - `ArticleReaderView.tsx`: 弹窗式阅读器。
- **`stream/`**: 无限滚动列表组件，采用高度优化的按需订阅模式。
- **`services/`**: 领域服务层（Server-Side）。
  - `services.ts`: 核心导出。封装了简报聚合（Supabase 内容 + FreshRSS 状态）、分类标签获取等业务逻辑。
    - **缓存策略**:
      - **日期列表 (`fetchAvailableDates`)**: 边缘缓存 7 天 (`unstable_cache` + tags)，与页面 ISR 周期对齐。依赖 Webhook (`available-dates`) 实现跨天或新内容的即时刷新。
      - **英文日期列表 (`fetchAvailableDatesEn`)**: **[i18n 专项]** 专门针对 `articles_en` 表进行聚合，并将 UTC 时间戳转换为上海时区的日期字符串，防止时区差导致的侧边栏日期冗余或 404。
    - **元数据对齐与瘦身架构**: 系统采用"瘦身表 + 视图"模型，详见 [ARCHITECTURE.md#国际化架构](../../docs/ARCHITECTURE.md#12-国际化架构-internationalization)。
      - **本地化 (Localization)**: `sourceName` 和 `verdict.type` 在数据库层保留原始中文标识符，通过 `purifyArticle` 进行翻译。
    - **简报数据 (`fetchBriefingData`)**: **[架构统一]** 核心数据聚合函数。支持 `lang` 参数 ('zh' | 'en')，自动处理物理视图映射（ZH -> `articles_view`, EN -> `articles_view_en`）。边缘缓存 7 天。
    - **英文简报数据 (`fetchEnglishBriefingData`)**: 已简化为 `fetchBriefingData(date, 'en')` 的封装，确保中英文逻辑 100% 对齐。
      - **封面图片 (`resolveBriefingImage`)**: 边缘缓存 7 天 (`briefing-image`)，强制与页面生命周期同步，防止 `300s` 短板效应。
      - **分类标签 (`getAvailableFilters`)**: 边缘缓存 7 天，极少变动。
  - `articleLoader.ts`: 负责文章详情的深度获取与清洗。

## 2. 关键算法：日期与时段

文件路径: `src/domains/reading/utils/date.ts`

处理与上海时间（CST, UTC+8）相关的业务逻辑。

- **`getArticleTimeSlot(dateString: string): TimeSlot`**
  - **规则**:
    - Morning: 00:00 - 11:59
    - Afternoon: 12:00 - 18:59
    - Evening: 19:00 - 23:59 (上海时间)

- **`shanghaiDayToUtcWindow(date: string)`**
  - 将上海本地日期 `YYYY-MM-DD` 映射为对应的 UTC 时间窗口供 Supabase 查询。

## 3. 日期归属原则 (Date Attribution)

为了保证简报内容的连贯性与历史可追溯性，系统遵循以下**严格的日期归属规则**：

### 3.1 核心字段优先级

文章属于哪一天的简报，由以下字段优先级决定：

1.  **`n8n_processing_date` (最高优先级)**:
    - 定义: n8n 首次抓取并处理该文章的时间。
    - 作用: 锁定文章的“简报归属日”。即使文章是昨天发布的，如果 n8n 今天才抓取到，它也应当属于“今天”的简报。
2.  **`published` (次级)**:
    - 定义: RSS 源中的原始发布时间。
    - 作用: 如果 n8n 尚未处理（手动导入场景），则回退使用原始发布时间。
3.  **`new Date()` (兜底)**:
    - 仅在上述两者均缺失时使用（极罕见）。

### 3.2 不变性原则 (Immutability)

- **生成/重生成操作**:
  - 当 AI 重新生成简报（单篇或批量）时，系统**必须保留**原有的 `n8n_processing_date`。
  - **禁止**将旧文章的日期更新为“今天”。这确保了历史简报在重新润色后，依然停留在历史时间轴上，不会污染今日的简报列表。

## 4. ID 模式与转换规范 (ID Pattern & Conversion)

由于历史演进和多系统集成，本项目采用 **URL 极简与逻辑完整** 的双轨标识符策略。

> 核心工具函数 `toShortId()` 和 `toFullId()` 位于 [article/utils/idHelpers.ts](../article/utils/idHelpers.ts)。

### 标识符分工

- **URL 展现层 (Short ID)**:
  - 格式: `0006477f9a381e20` (Hex String)
  - 作用: 仅用于网页地址、路由匹配 (`/article/[id]`) 以及客户端轻量索引。
  - **规范**: 全站链接生成（如 `BriefCard`）必须调用 `toShortId()` 确保外显 URL 的简洁。
- **数据逻辑层 (Full ID)**:
  - 格式: `tag:google.com,2005:reader/item/0006477f9a381e20`
  - 作用: **唯一的后端通信协议**。用于 Supabase（查询 AI 元数据、向量）和 FreshRSS（获取原文内容、同步状态）。

### 核心规范 (Internal Guiding Principles)

> [!IMPORTANT]
> **必须始终遵循“入库即补全”原则**
>
> 1. **Proxy 重定向**: `src/proxy.ts` 负责捕获所有残存的长 ID 访问并 301 重定向至短 ID URL。
> 2. **后端转换**: `services.ts` 的所有入口函数（如 `fetchArticleById`）在接收到 URL 参数后，必须第一时间执行 `toFullId()` 转换。
> 3. **统一性**: 禁止直接将长 ID 泄露到前端 URL 中，也禁止直接将短 ID 发送给 Supabase/FreshRSS，以免造成 404 或命中降级逻辑。

## 5. 国际化适配 (Internationalization)

阅读领域是全站 i18n 的重点，通过 `src/app/i18n/dictionaries.ts` 实现中英文解耦。

### 5.1 服务端驱动

- **页面入口 (Briefing)**: `BriefingPageServer.tsx` 根据路由参数 `lang` 选择 `zh` 或 `en` 字典。
- **页面入口 (Stream)**: `StreamPageServer.tsx` 统一了聚合页的中英文逻辑，自动处理 Hreflang 注入与元数据生成。
- **SEO 适配**: Title 和 Meta Description 的生成逻辑已本地化。例如，英文模式下日期显示为 `January 25, 2026`。

### 5.2 组件透传与标签翻译

- **Dict Prop**: 所有核心组件（`BriefingView`, `SidebarView`, `BriefCard`）均接收一个 `dict` Prop。
- **日期本地化**: 统一使用 `dateObj.toLocaleDateString(locale, ...)`。
- **标签/分类翻译**: 侧边栏及首页标签云统一集成 `getDisplayLabel` 工具函数。
  - **逻辑**: 优先查找 `feed-dictionary.ts` 中的映射，若无则显示原名。
  - **Emoji 处理**: 自动剥离 Emoji 后再进行字典匹配，确保 Key 的稳定性。

### 3. URL Structure & Slug Logic

The application uses **Clean Slugs** for stream pages, separated by type to avoid collisions and ensure friendly URLs.

**Pattern:**

- **Categories**: `/stream/category/[slug]`
- **Tags**: `/stream/tag/[slug]`
- **English**: `/en/stream/category/[slug]`, `/en/stream/tag/[slug]`

**Logic (`slug-helper.ts`):**

1.  **Generation (`getSlugLink`)**:
    - Takes raw ID (e.g., "user/-/label/Frontend").
    - Lookup in dictionaries (`categoryTranslations`, `tagTranslations`).
    - If found, use the defined English slug (e.g., "frontend").
    - If not found, auto-slugify the raw ID.
    - **Important**: Uses `type` ('category' | 'tag') to determine the correct path segment.

2.  **Resolution (`resolveSlugId`)**:
    - In `StreamPageServer.tsx`, takes the URL `slug` and `type`.
    - Strictly searches the corresponding dictionary based on `type`.
    - Reconstructs the original FreshRSS ID (restores `user/-/label/` prefix if needed).
    - **Emoji Fix**: Automatically strips generic emojis from IDs to match dictionary keys (e.g., "📦 工程实践" -> "工程实践").

**Note on Navigation:**
Client-side components (`SidebarView.tsx`) **MUST** use `getSlugLink` with the correct `type` to generate these URLs.

**Active State Logic**:

1. **Explore (Categories/Tags)**: To handle inconsistencies between URL slugs (clean) and internal IDs (raw/with emojis), `SidebarExplore` uses a **Slug-based comparison**: `getSlug(activeFilter.value) === getSlug(item.id)`. This ensures reliable highlighting even if ID formats differ.
2. **Calendar (Dates)**: Dates are highlighted if the URL contains `/date/[date]`. On the **Homepage** (`/` or `/en`), `SidebarContainer` explicitly synchronizes the store's `activeFilter` to `null`. This allows `SidebarBriefing` to implicitly highlight "today's" date. Crucially, this synchronization uses a `preserveState` flag to ensure that **Time Slot** selections (Morning/Afternoon/Evening) are NOT cleared when navigating to the homepage, preventing UI flash/reset issues.

### 5.4 Source Name Display

- **Translation**: Source names (`article.sourceName`) are translated using `feedTranslations` in `feed-dictionary.ts`.
- **Implementation**: `StreamListItem.tsx` uses `getDisplayLabel(article.sourceName, 'feed', ...)` to ensure "AWS 安全" displays as "AWS Security" in English contexts.
- **净化层 (Purification Layer)**:
  - **核心函数**: `purifyArticle(article, lang, validTagIds?)`。负责将单个文章对象进行多语言脱敏及标签清洗。
  - **标签清洗 (Folder Filtering)**: 通过可选的 `validTagIds` (白名单)，物理剔除 `article.tags` 中不属于合法标签列表的 ID（即过滤掉 FreshRSS 中的分类文件夹 ID）。此逻辑全局生效，彻底解决了 Stream 页面标签“闪现消失”的 flickering 问题。
  - **处理字段**: `sourceName` (订阅源), `tags` (标签列表), `category` (分类), `verdict.type` (智核评级名称)。
  - **批量处理**: `purifyArticles` / `purifySubscriptions` 基于核心函数实现大规模数据脱敏。
  - **应用场景**: 各大 Server 组件（`HomePageServer`, `StreamPageServer`, `BriefingPageServer`, `ArchivePageServer`）在下发数据给客户端前统一调用，确保 HTML 源码（Hydration Payload）中内容的纯净度。

## 6. 趋势工具模块 (Trends & Tools)

趋势页 (/trends) 负责聚合全球权威的技术趋势、榜单与工具指标，采用 SSG (静态生成) 模式确保极致的加载速度。

### 6.1 数据结构与配置

- **`TrendsPage.tsx`**: 负责定义核心数据源 `LINKS` 及分类配置 `CATEGORY_CONFIG`。
- **分类系统**: 采用四级专业分类：`frontier` (AI & 前沿), `reality` (工程), `community` (技术社区), `infrastructure` (基础架构)。
- **配置项**: 每个榜单包含 `id`, `title`, `url`, `theme`, `category` 及 `iconPath`。

### 6.2 国际化实现

趋势页的文本通过 `dictionaries.ts` 中的 `trends` 对象实现：
- **分类标题**: 直接映射 `dict.trends[category]`。
- **卡片描述**: 通过 `dict.trends.descriptions[id]` 动态注入。这种设计允许在不修改业务代码的情况下，通过翻译字典更新各榜单的背景介绍。

### 6.3 布局与交互

- **LinkCard 组件**: 支持多行描述展示，采用 `items-start` 置顶对齐以适配长文本换行。
- **容器对齐**: 针对高信息密度场景，容器限制为 `max-w-[1100px]`，平衡了视线扫描效率与卡片展示空间。
- **主题色**: 根据 `theme` 属性（如 `cyan`, `indigo`, `orange`）自动应用 Tailwind 边框与阴影色，增强视觉分类感。
