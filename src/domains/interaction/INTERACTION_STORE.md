# 文章交互与状态同步 (Interaction Store)

本文档详细描述了 `interaction` 领域的持久化状态管理与服务端同步逻辑。

## 1. Article Store (`articleStore.ts`)

文件路径: `src/domains/interaction/store/articleStore.ts`

作为客户端的“数据库”，存储所有已获取的内容。

### 核心状态

- **`articlesById`**: 所有已加载文章的归一化映射表 `{ [id: string]: Article }`。防止数据重复。
- **`availableFilters`**: 包含**计数**信息的标签和分类列表。
- **`starredArticleIds`**: 用户已收藏的文章 ID 列表。

### 数据流与同步

1. **获取 (Fetching)**: React Query 从 API 获取数据。
2. **填充 (Hydration)**: 组件调用 `addArticles(articles)` 将数据填充到 `articlesById`。
3. **三级状态同步 Hook (`useArticleStateHydration`)**:
   - **强制性**: 任何渲染 `Article` 列表的顶级入口客户端组件（如 `MainContentClient`, `BriefingClient`）**必须**调用此 Hook。
   - 负责将预取的 Read/Star 状态合并并分发至 Zustand Store。
   - **自愈机制**: 后台异步对比 FreshRSS 实时状态，若发现静态缓存过时，自动修正 UI 并触发服务端刷新接口。

4. **确认更新 (Confirmed Updates)**:
   - **机制**: 采用稳健的“确认更新”，配合“Store-First”保护策略。
   - **防闭包陷阱**: 在 `mutationFn` 内部必须通过 `useArticleStore.getState()` 获取最新状态。

---

## 2. 领域常量

文件路径: `src/domains/interaction/constants.ts`

- **`STAR_TAG`**: 收藏状态对应的 FreshRSS 标签名。
- **`READ_TAG`**: 已读状态对应的内部标识。
