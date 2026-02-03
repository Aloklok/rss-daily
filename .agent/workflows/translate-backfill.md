---
description: 批量回填英文翻译
---

# 翻译回填工作流

当有中文文章缺少英文翻译时，使用此流程进行回填。

## 执行回填

// turbo

1. 运行回填脚本：`pnpm translate:backfill`
2. 脚本会（默认使用**逐篇模式**，混元模型）：
   - 扫描 `articles` 表中缺少翻译的文章
   - 调用 Hunyuan API 逐篇翻译（精度更高）
   - 写入 `articles_en` 表
   - 输出剩余未翻译数量

## 批量模式（大批量回填）

如需启用批量并发模式（5篇/批，3并发，Qwen模型）：

```bash
pnpm translate:backfill --batch
```

持续批量回填：

```bash
./scripts/loop-backfill.sh
```

## 自动化

系统已配置 Vercel Cron 每日自动执行回填：

- 端点：`/api/translate/backfill`
- 时间：每日北京时间凌晨执行

## 相关文档

- 国际化架构：[docs/I18N.md](../../docs/I18N.md)
- 翻译脚本：[scripts/backfill-translations.ts](../../scripts/backfill-translations.ts)
