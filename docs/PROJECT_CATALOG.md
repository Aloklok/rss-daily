# 项目目录索引 (Project Catalog)

本文档映射了 Briefing Hub 的全站架构。点击下方链接深入阅读各领域的详细技术说明。

## 📂 领域逻辑中心 (`src/domains/`)

### 🧠 智能领域 (`intelligence/`)

负责 AI 对话、向量检索 (RAG) 与联网搜索集成。
👉 **[INTELLIGENCE.md](../src/domains/intelligence/INTELLIGENCE.md)**

### 📰 阅读领域 (`reading/`)

负责简报渲染、日期算法、无限滚动列表以及数据查询 Hooks。
👉 **[READING_LOGIC.md](../src/domains/reading/READING_LOGIC.md)**

### ❤️ 交互领域 (`interaction/`)

负责文章点赞、收藏、标签管理及服务端同步 Hooks。
👉 **[INTERACTION_STORE.md](../src/domains/interaction/INTERACTION_STORE.md)**

## 🏗️ 全局共享层 (`src/shared/`)

包含全局 UI、基础设施客户端 (Supabase/FreshRSS) 与公共工具函数。
👉 **[SHARED_INFRA.md](../src/shared/SHARED_INFRA.md)**

---

## 🛠️ 其他全局规范

- **架构总览**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **测试体系**: [TESTING.md](./TESTING.md)
- **任务清单**: [TODO.md](./TODO.md)
