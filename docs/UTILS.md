# 工具函数索引 (Utils Index)

本文档是项目中各类工具函数的导航中心。

## 1. 全局通用工具

包含 HTML 清洗、图片代理、颜色生成、标签计数逻辑。

👉 **[SHARED_INFRA.md](../src/shared/SHARED_INFRA.md)**

## 2. 领域专有工具

### 📄 文章核心工具

包含文章 ID 转换工具 (`toShortId`, `toFullId`)。

👉 **[ARTICLE.md](../src/domains/article/ARTICLE.md)**

### 📅 阅读与日期逻辑

包含上海时间转换、文章时段计算、UTC 窗口映射，以及分类/Feed 国际化展示工具。

👉 **[READING_LOGIC.md](../src/domains/reading/READING_LOGIC.md)**

### 🧠 智能域工具

包含 Embedding 向量化、意图路由分析、RAG 检索加权算法。

👉 **[INTELLIGENCE.md](../src/domains/intelligence/INTELLIGENCE.md)**

---

> [!IMPORTANT]
> **Server-Side Only**: 包含 Node.js 原生模块或服务端库的工具必须放在领域 `services/` 或 `src/shared/infrastructure/` 中，并明确标记为服务侧专用。
