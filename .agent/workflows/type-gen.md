---
description: 生成 Supabase 和 FreshRSS 的 TypeScript 类型定义
---

# 类型生成工作流

当数据库 Schema 或 API 结构发生变化时，需要重新生成类型定义。

## Supabase 类型

当 Supabase 表结构变更后：

// turbo

1. 生成类型：`pnpm gen:supabase-types`
2. 检查输出：`src/shared/types/generated/supabase.ts`
3. 更新引用该类型的代码（如有破坏性变更）

## FreshRSS 类型

当 FreshRSS API 契约变更后：

1. 更新 OpenAPI 定义：`src/shared/types/generated/freshrss.yaml`
   // turbo
2. 生成类型：`pnpm gen:freshrss-types`
3. 检查输出：`src/shared/types/generated/freshrss.ts`

## 相关文件

- Supabase 类型输出：[src/shared/types/generated/supabase.ts](../../src/shared/types/generated/supabase.ts)
- FreshRSS 类型输出：[src/shared/types/generated/freshrss.ts](../../src/shared/types/generated/freshrss.ts)
