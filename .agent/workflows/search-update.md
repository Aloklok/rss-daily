---
description: 更新搜索算法 RPC 和向量回填
---

# 搜索系统维护工作流

当修改了搜索相关逻辑（PGroonga、Ranking 算法、向量检索）后，需要同步到 Supabase。

## 更新搜索 RPC 函数

修改 `scripts/update-search-rpc.ts` 中的 SQL 后：

// turbo

1. 同步到 Supabase：`pnpm search:update`
2. 验证：在应用中测试搜索功能

## 向量 Embedding 回填

当有新文章缺少向量，或需要强制刷新时：

// turbo

1. 增量回填：`pnpm search:backfill`
2. 强制全量刷新：`pnpm search:backfill --force`

## 相关文档

- 混合搜索架构：[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#4-混合搜索架构-hybrid-search)
- 搜索 RPC 脚本：[scripts/update-search-rpc.ts](../../scripts/update-search-rpc.ts)
