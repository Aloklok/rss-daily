# 阅读领域核心逻辑与组件 (Reading Logic & Components)

本文档映射了 `reading` 领域的渲染架构、导航逻辑与关键时间算法。

## 1. 核心组件映射

- **`Sidebar/`**: 包含日历、分类树导航。这是全站发现路径的入口。
- **`briefing/`**:
  - `BriefingView.tsx`: 负责简报的视觉分段（头部大图 + 分组卡片）。
  - `BriefCard.tsx`: 高度压缩的信息密度展现。
- **`article/`**:
  - `ArticlePage.tsx`: 独立页阅读器。
  - `ArticleReaderView.tsx`: 弹窗式阅读器。
- **`stream/`**: 无限滚动列表组件，采用高度优化的按需订阅模式。

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
