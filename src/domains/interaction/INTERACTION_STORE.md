# 文章交互领域 (Interaction Domain)

本领域负责处理用户与文章的交互操作，包括收藏、标记已读、标签管理及与 FreshRSS 的状态同步。

## 📂 目录结构

```
interaction/
├── INTERACTION_STORE.md    # 领域文档 (本文件)
├── actions.ts              # Server Actions (收藏/已读操作)
├── components/
│   ├── FloatingActionButtons.tsx  # 浮动操作按钮
│   └── admin/                     # 管理员组件
│       └── BackfillPanel.tsx      # 批量补充面板
├── hooks/
│   ├── useArticleActions.ts       # 文章操作封装
│   ├── useArticleMutations.ts     # React Query Mutation Hooks
│   └── useArticleStateHydration.ts # 状态水合与自愈机制
└── services/
    ├── admin-auth.ts              # 管理员认证
    └── interactionClient.ts       # 客户端 API 调用
```

## 🔗 依赖关系

- **上游依赖**: `article` (核心状态和常量)
- **同级协作**: `reading` (文章列表渲染)

## 📋 核心模块

### Server Actions (`actions.ts`)

通过 FreshRSS API 执行文章状态变更：

- `markAsRead(articleIds)` - 批量标记已读
- `toggleStar(articleId, isStarred)` - 切换收藏状态
- `updateTags(params)` - 通用标签更新

### Hooks

| Hook                         | 说明                                     |
| ---------------------------- | ---------------------------------------- |
| `useArticleActions()`        | 封装常用操作（打开文章、收藏、标记已读） |
| `useUpdateArticleState()`    | React Query Mutation，带乐观更新         |
| `useArticleStateHydration()` | 状态水合与自愈机制                       |

### 状态水合流程

1. **获取**: React Query 从 API 获取文章数据
2. **填充**: 组件调用 `addArticles()` 填充到 `articleStore`
3. **同步**: `useArticleStateHydration` 负责将预取状态合并到 Store
4. **自愈**: 后台异步对比 FreshRSS 实时状态，若过时则自动修正

## ⚠️ 开发规范

1. **使用 Article Core**: 所有文章状态相关常量和 Store 均从 `@/domains/article` 导入
2. **防闭包陷阱**: Mutation 内部通过 `useArticleStore.getState()` 获取最新状态
3. **乐观更新**: 采用"Store-First"策略，UI 立即响应，失败时回滚
