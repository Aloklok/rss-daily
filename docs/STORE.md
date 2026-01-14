# 状态管理说明 (Store Index)

本项目使用 Zustand 进行全局状态管理。为了维护领域边界和代码内聚，Store 分散在不同的物理位置。

## 1. 全局与 UI 状态

关于侧边栏开关、主题切换、Toast 提示等全局 UI 状态，请参考：

👉 **[SHARED_INFRA.md](../src/shared/SHARED_INFRA.md)**

## 2. 业务领域状态

### 📰 文章交互与同步

关于文章的读写状态、收藏列表、标签关联以及与 FreshRSS 的水合逻辑，请参考：

👉 **[INTERACTION_STORE.md](../src/domains/interaction/INTERACTION_STORE.md)**

### 🧠 智能对话状态

关于 AI 聊天的历史记录、流式输出控制及上下文管理，请参考：

👉 **[INTELLIGENCE.md](../src/domains/intelligence/INTELLIGENCE.md)**

---

> [!TIP]
> **开发指南**: 跨领域的引用应尽量减少。如果一个状态被多个领域高频使用，应考虑将其移动到 `shared`。
