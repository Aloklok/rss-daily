---
description: 提交前文档同步与 DDD 合规性审计流程
---

# /pre-commit-doc

此任务流用于在 Git 提交前，确保代码变更、领域架构 (DDD) 与项目文档保持 100% 一致。

## 审计参考标准 (The Standard)

在开始审计前，必须阅读以下文档以获取当前的架构准则：

1. **核心指令与 DDD 原则**：[`GEMINI.md`](file:///Users/Alok/alok-rss-daily/GEMINI.md)
2. **核心架构与依赖规范**：[`docs/ARCHITECTURE.md`](file:///Users/Alok/alok-rss-daily/docs/ARCHITECTURE.md)
3. **API 接口规范**：[`docs/API.md`](file:///Users/Alok/alok-rss-daily/docs/API.md)

## 审计步骤

1. **变更审计**
   - 运行 `git diff` 查看所有未提交的代码。
   - 识别新增文件、修改逻辑及 API 变更。

2. **领域定位与合规检查 (DDD Compliance)**
   - 确认修改涉及的领域目录：`src/domains/[domain_name]`。
   - **指路检查**：对比修改内容是否符合 `GEMINI.md` 和 `docs/ARCHITECTURE.md` 中的 DDD 限制（如禁止循环依赖、领域自治等）。
   - 检查依赖流向是否符合规定。
     - _提示：核心领域 (Intelligence/Article) 不应依赖特性领域 (Reading/Interaction)。_

3. **文档核对与更新**
   - **领域文档**：阅读并更新 `src/domains/[domain_name]/[DOMAIN].md`。
   - **全局规范**：
     - 如果新增 API，更新 `docs/API.md`。
     - 如果新增工具函数，更新 `docs/UTILS.md`。
     - 如果修改了核心架构，更新 `docs/ARCHITECTURE.md`。
   - **原则**：文档描述的是“系统当前的真实快照”，而非“变更日志”。

4. **异常告知**
   - 如果发现以下情况，必须立即停止并告知用户：
     - 需要新起一个领域。
     - 需要新起一个全局文档。
     - 发现跨领域循环依赖。

## 执行命令

// turbo

1. `git status`
2. `git diff --name-only`
