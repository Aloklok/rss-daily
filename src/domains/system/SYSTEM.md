# 系统领域架构文档 (SYSTEM.md)

本领域负责全站范围的基础设施自动化、缓存同步及系统级任务编排。

## 🏗 全链路自动化工作流 (Content Lifecycle)

系统已部署完整的双向自动化闭环，确保中文与英文内容在入库、翻译及缓存清理上的绝对同步。

### 1. 执行闭环路径

文章的生命周期现已完全由事件驱动：

1.  **入库 (Insert/Update)**：文章通过 n8n 或管理员接口进入 `articles` 表。
2.  **核心 Webhook (ZH)**：触发 `update briefing` 数据库触发器，POST 至 `/api/system/revalidate`。
3.  **系统级编排 (`RevalidateService`)**：
    - **缓存清理**：精准清理中文首页及日期简报页缓存。
    - **Embedding**：自动生成中文向量。
    - **异步翻译**：检测到 AI 摘要后，自动触发翻译任务（👉 详见 [INTELLIGENCE.md](../intelligence/INTELLIGENCE.md#05-自动翻译同步-auto-translation)）。
4.  **影子 Webhook (EN)**：`articles_en` 表写入后触发 `on_article_en_change` 触发器，POST 至 `/api/system/revalidate-en`。
5.  **英文补完**：清理对应的英文页面缓存，完成闭环。

---

## ⚙️ 核心服务逻辑 (Core Logic)

### 1. Revalidate 机制

系统采用 **“按需、精准、异步”** 的缓存清理策略：

- **双语隔离**：`/revalidate` 负责中文，`/revalidate-en` 负责英文。
- **日期处理**：在处理英文版重验证时，系统会自动回查 `articles` 物理主表获取 `n8n_processing_date`。

### 2. 设计抉择：物理表 vs 视图 (Service Layer)

在后端自动化逻辑（Service 层）中，我们优先查询 **物理表**（如 `articles`）而非展现层视图（如 `articles_view_en`）：

- **性能最优化**：物理主键查询比两表 JOIN 视图在 Webhook 高频并发场景下更稳。
- **单一事实来源 (SSOT)**：日期元数据物理上仅存在于主表，直查物理表符合最短路径原则。
- **职责解耦**：视图应专注服务于 UI 渲染；后端脚本应专注服务于数据一致性。

---

## 🛠 Webhook 配置参考 (Infrastructure)

### 1. 数据库触发器

- **`update briefing`** (on `articles`): 配置于 `AFTER INSERT OR UPDATE`，异步转发至 `/api/system/revalidate`。
- **`on_article_en_change`** (on `articles_en`): 配置于 `AFTER INSERT OR UPDATE`，异步转发至 `/api/system/revalidate-en`。

### 2. 安全机制

所有 Webhook 请求均需携带 `secret` 参数。令牌存储于环境变量 `REVALIDATION_SECRET` 中。
