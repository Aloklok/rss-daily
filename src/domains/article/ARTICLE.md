# 文章核心领域 (Article Core Domain)

本领域是 Briefing Hub 的**核心领域 (Core Domain)**，负责定义和管理文章聚合根 (Article Aggregate Root) 的状态与核心逻辑。

## 🎯 职责

- **状态存储**: 通过 `articleStore` 管理所有已加载文章的归一化数据和用户状态（已读/收藏）。
- **核心常量**: 定义文章 ID 格式、状态标签等跨领域共享的标识符。
- **元数据派生**: 提供 `useArticleMetadata` Hook 用于计算文章的衍生状态。

## 📂 目录结构

```
article/
├── ARTICLE.md          # 领域文档 (本文件)
├── constants.ts        # 核心常量 (STAR_TAG, READ_TAG, ARTICLE_ID_PREFIX)
├── store/
│   ├── articleStore.ts # Zustand Store - 文章数据与状态的单一事实来源
│   └── __tests__/
│       └── articleStore.test.ts
├── hooks/
│   └── useArticleMetadata.ts  # 元数据派生 Hook
└── utils/
    ├── idHelpers.ts    # ID 转换工具 (toShortId, toFullId)
    └── __tests__/
        └── idHelpers.test.ts
```

## 🔗 依赖关系

```
┌─────────────┐
│   shared    │  ← 基础设施与类型
└──────┬──────┘
       │
┌──────▼──────┐
│   article   │  ← 核心领域 (本领域)
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌──────▼──────┐
│   reading   │   │ interaction │
└─────────────┘   └─────────────┘
```

- **上游依赖**: `shared/types`, `shared/utils`
- **下游消费者**: `reading`, `interaction`, `intelligence`

## 📋 核心 API

### Constants

| 常量                    | 用途                  |
| ----------------------- | --------------------- |
| `STAR_TAG`              | FreshRSS 收藏状态标识 |
| `READ_TAG`              | FreshRSS 已读状态标识 |
| `ARTICLE_ID_PREFIX`     | 文章 Full ID 前缀     |
| `FRESHRSS_LABEL_PREFIX` | 用户标签前缀          |

### Store Actions

| Action                         | 说明                      |
| ------------------------------ | ------------------------- |
| `addArticles(articles)`        | 批量添加/更新文章到 Store |
| `updateArticle(article)`       | 更新单篇文章状态          |
| `markArticlesAsRead(ids)`      | 批量标记已读              |
| `setStarredArticleIds(ids)`    | 设置收藏列表              |
| `setAvailableFilters(filters)` | 设置可用过滤器            |

### Hooks

| Hook                          | 返回值                                 | 说明                     |
| ----------------------------- | -------------------------------------- | ------------------------ |
| `useArticleMetadata(article)` | `{ isStarred, isRead, userTagLabels }` | 从文章对象派生常用元数据 |

### Utils

| 函数                | 说明                              |
| ------------------- | --------------------------------- |
| `toShortId(fullId)` | 将 FreshRSS 完整 ID 转换为简短 ID |
| `toFullId(shortId)` | 将简短 ID 转换为 FreshRSS 完整 ID |

## ⚠️ 开发规范

1. **禁止循环依赖**: 本领域不得引用 `reading` 或 `interaction` 领域的任何模块。
2. **类型来源**: `Article` 类型定义保留在 `shared/types/article.ts`，作为跨领域 DTO。
3. **状态唯一性**: 所有文章状态变更必须通过 `articleStore` 进行，禁止在组件内直接修改。
