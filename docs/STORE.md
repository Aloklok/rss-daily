# 状态管理说明 (Store Index)

本项目使用 Zustand 进行全局状态管理。Store 按照领域边界分布在不同位置。

## 1. 全局与 UI 状态

包含侧边栏开关、主题切换、Toast 提示等全局 UI 状态。

👉 **[SHARED_INFRA.md](../src/shared/SHARED_INFRA.md)**

## 2. 业务领域状态

### 📄 文章核心状态

包含文章的归一化存储、收藏列表、过滤器状态。

👉 **[ARTICLE.md](../src/domains/article/ARTICLE.md)**

### ❤️ 文章交互与同步

包含状态水合、自愈机制、React Query Mutations。

👉 **[INTERACTION_STORE.md](../src/domains/interaction/INTERACTION_STORE.md)**

### 🧠 智能对话状态

包含 AI 聊天历史、流式输出控制、上下文管理。

👉 **[INTELLIGENCE.md](../src/domains/intelligence/INTELLIGENCE.md)**

---

> [!TIP]
> **开发指南**: 跨领域的引用应尽量减少。如果一个状态被多个领域高频使用，应考虑将其移动到 `shared`。
