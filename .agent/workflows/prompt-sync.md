---
description: 同步 AI Prompt 模板到 Supabase 数据库
---

# Prompt 同步工作流

当修改了 `src/domains/intelligence/prompts/` 下的 Prompt 文件后，需要同步到 Supabase。

## 简报 Prompt (PROMPT.MD)

1. 确认修改的文件：`src/domains/intelligence/prompts/PROMPT.MD`
   // turbo
2. 推送到 Supabase：`pnpm prompt:push`
3. 验证：登录 Supabase Dashboard 检查 `prompts` 表

## 对话 Prompt (CHAT_PROMPT.MD)

1. 确认修改的文件：`src/domains/intelligence/prompts/CHAT_PROMPT.MD`
   // turbo
2. 推送到 Supabase：`pnpm chat-prompt:push`
3. 验证：登录 Supabase Dashboard 检查 `prompts` 表

## 从 Supabase 拉取最新 Prompt

// turbo

- 简报 Prompt：`pnpm prompt:pull`
  // turbo
- 对话 Prompt：`pnpm chat-prompt:pull`

> **注意**：Prompt 存储在 Supabase 是为了支持热更新，无需重新部署即可调整 AI 行为。
