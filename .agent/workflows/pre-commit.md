---
description: 提交前检查清单
---

# 提交前检查工作流

在执行 `git commit` 前，必须完成以下检查。

## 必须步骤

// turbo

1. 本地构建验证：`pnpm build`
   - 包含 ESLint 检查
   - 包含 TypeScript 类型检查
   - 确保无编译错误

## 文档同步检查 (Critical)

2. 检查是否需要更新以下文档：

**全局文档 (docs/)**

- `ARCHITECTURE.md` - 架构变更
- `API.md` - API 路由变更
- `STORE.md` - 状态管理变更
- `UTILS.md` - 工具函数变更
- `TESTING.md` - 测试策略变更

**领域文档 (src/domains/)**

- `article/ARTICLE.md` - 文章核心领域变更
- `intelligence/INTELLIGENCE.md` - AI/RAG 领域变更
- `reading/READING_LOGIC.md` - 阅读渲染领域变更
- `interaction/INTERACTION_STORE.md` - 交互领域变更
- `security/SECURITY.md` - 安全领域变更
- `system/SYSTEM.md` - 系统自动化变更

> **原则**：文档描述"当前状态"，而非"变更历史"。

## 提交规范

3. 批量提交，避免频繁触发 Vercel 部署
4. Commit Message 使用规范格式：`feat/fix/docs/refactor: 简述`
