# 状态管理

本项目使用 [Zustand](https://github.com/pmndrs/zustand) 进行全局状态管理，为了分离关注点，我们将 Store 拆分为三个独立的部分。

## 架构概览

| Store             | 文件                                          | 职责                                                |
| ----------------- | --------------------------------------------- | --------------------------------------------------- |
| **UI Store**      | [`uiStore.ts`](../store/uiStore.ts)           | 管理客户端交互状态 (模态框, 过滤器, 侧边栏, 主题)。 |
| **Article Store** | [`articleStore.ts`](../store/articleStore.ts) | 管理领域数据 (文章, 收藏 ID, 标签, 过滤器计数)。    |
| **Toast Store**   | [`toastStore.ts`](../store/toastStore.ts)     | 管理临时的通知提示状态。                            |

## 1. UI Store (`uiStore.ts`)

负责管理“应用长什么样”以及“当前激活了什么”。

### 核心状态

- **`activeFilter`**: 当前的视图筛选条件 (例如: 日期, 标签, 搜索关键词)。
- **`timeSlot`**: 简报视图中选中的时间段 (早报/午报/晚报)。
- **`modalArticleId` / `modalInitialMode`**: 控制统一文章模态框的显示。
- **`settings`**: 主题 (深色/浅色) 和 排版偏好设置。

### 侧边栏状态

使用显式的布尔值来处理响应式行为：

- `isMobileOpen`: 在移动端控制侧边栏的显示/隐藏。
- `isDesktopCollapsed`: 在桌面端控制侧边栏的折叠/展开。

---

## 2. Article Store (`articleStore.ts`)

作为客户端的“数据库”，存储所有已获取的内容。

### 核心状态

- **`articlesById`**: 所有已加载文章的归一化映射表 `{ [id: string]: Article }`。防止数据重复。
- **`availableFilters`**: 包含**计数**信息的标签和分类列表。
- **`starredArticleIds`**: 用户已收藏的文章 ID 列表。

### 数据流

1. **获取 (Fetching)**: React Query (`useArticles.ts`) 从 API 获取数据。
2. **填充 (Hydration)**: 组件调用 `addArticles(articles)` 将数据填充到 `articlesById`。
3. **同步与修正 (Synchronization)**:
   - **服务端状态预取**: 在 SSR 阶段获取 `initialArticleStates` 并注入。
   - **三级状态同步 Hook (`useArticleStateHydration`)**:
     - **强制性**: 任何渲染 `Article` 列表的顶级入口客户端组件（如 `MainContentClient`, `BriefingClient`）**必须**调用此 Hook，以确保 SSR 数据被安全水合至 Store。
     - 负责将预取的 Read/Star 状态合并并分发至 Zustand Store。
     - **自愈机制**: 后台异步对比 FreshRSS 实时状态，若发现静态缓存过时，自动修正 UI 并触发服务端 `revalidate-date` 接口刷新缓存。
4. **确认更新 (Confirmed Updates)**:
   - `updateArticle`: 只有在 API 返回成功（200 OK）后，才更新本地文章状态。
   - **机制差异**: 放弃了激进的“乐观更新”（Request 前更新），采用稳健的“确认更新”（Response 后更新），配合“Store-First”保护策略，彻底消除回跳闪烁。
   - **【重要】防闭包陷阱**: 在 `useMutation` 的 `mutationFn` 中，**禁止**直接依赖组件渲染时捕获的 `articlesById`。由于 Store 可能会在后台异步触发 `hydration` 或 `sync`，闭包数据可能已经过时。必须在 `mutationFn` 内部通过 `useArticleStore.getState()` 获取最新的 Store 状态，以防出现 "Article not found" 错误。
   - `calculateNewAvailableTags`: 一个纯函数工具，当文章标签变化时，动态重新计算标签计数。

### 性能优化

`StreamContainer` 组件经过特别优化，**不会** 订阅整个 `articlesById` 对象，从而避免因单篇文章更新导致整个信息流重新渲染。相反，每个 `StreamListItem` 组件会单独订阅其对应的文章 ID。

---

## 3. Toast Store (`toastStore.ts`)

一个简单的队列系统，用于显示反馈消息。

- **`showToast(message, type)`**:以此消息触发一个提示。
- **`hideToast()`**: 关闭当前提示。

## 交互模式

### Hooks vs Stores

- **React Query Hooks** (例如 `useBriefingArticles`) 负责 **服务端状态** (获取, 缓存, 重新验证)。
- **Zustand Stores** 负责 **客户端状态** (选中项, 可见性) 和 **归一化数据缓存** (在列表和模态框之间共享文章对象)。
