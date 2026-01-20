# 阅读领域核心逻辑与组件 (Reading Logic & Components)

本文档映射了 `reading` 领域的渲染架构、导航逻辑与关键时间算法。

## 1. 核心组件映射

- **`Sidebar/`**: 全站发现路径入口（日期 / 分类 / 标签 / 归档 / 来源）。
  - `SidebarNavServer.tsx`: SSR 直出核心导航链接（No‑JS 可见）。
  - `SidebarLazyClient.tsx` / `SidebarClientMount.tsx`: JS 环境下懒加载交互侧边栏并替换 SSR 导航。
  - `SidebarContainer.tsx` + `SidebarView.tsx`: 交互侧边栏（筛选、刷新、收藏等 UI 行为）。
- **`briefing/`**:
  - `BriefingView.tsx`: 负责简报的视觉分段（头部大图 + 分组卡片）。
  - `BriefCard.tsx`: 高度压缩的信息密度展现。
- **`article/`**:
  - `ArticlePage.tsx`: 独立页阅读器。
  - `ArticleReaderView.tsx`: 弹窗式阅读器。
- **`stream/`**: 无限滚动列表组件，采用高度优化的按需订阅模式。
- **`services/`**: 领域服务层（Server-Side）。
  - `services.ts`: 核心导出。封装了简报聚合（Supabase 内容 + FreshRSS 状态）、分类标签获取等业务逻辑。
    - **缓存策略**:
      - **日期列表 (`fetchAvailableDates`)**: 边缘缓存 7 天 (`unstable_cache` + tags)，与页面 ISR 周期对齐。依赖 Webhook (`available-dates`) 实现跨天或新内容的即时刷新。
      - **简报数据 (`fetchBriefingData`)**: 边缘缓存 7 天 (`briefing-data`)。对于**“今日”**数据，实施 **Cache Poisoning Prevention**：若返回空结果，抛出异常以阻止缓存锁定，确保后续请求能重试查库。
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
