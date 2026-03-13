description: 播客批量回填（文稿与语音合成）的完整操作流程
# 核心指令 (必须严格遵守): [PODCAST_PROMPT.md](file:///Users/Alok/alok-daily-rss/docs/PODCAST_PROMPT.md)
---

# 播客批量回填指南 (Podcast Backfill - 助理协作模式)

为了保证播客文稿的极致质量且**不消耗用户私有 API 额度**，本项目采用“助手撰写 + 脚本录入”的协作模式。该流程具备极高的稳定性和零成本特性。

---

## 🏁 流程总览 (分批执行策略)
由于 AI 助手（我）单次输出长度有限，回填 90 天数据需- **分批建议 (Batch Strategy)**:
  - 正常情况（每日 < 15 篇）：建议一次 5 天。
  - **高负载模式（每日 > 20 篇）**：**必须单日生成**。
  - 原因：确保 AI 能够按照 `PODCAST_PROMPT.md` 要求的“分级播报”策略对每一篇文章进行动作拆解，避免因 Token## 📝 执行步骤 (Step-by-Step)

### 第一阶段：提取原始数据
由用户在终端运行提取脚本，提取最近 N 天的简报语料：
```bash
npx tsx scripts/extract-briefing-data.ts --days=5
```
**注意：** 脚本会输出一个 `// TOTAL_SUMMARY` JSON，其中包含每关文章总数和 `strategy` 建议。
- **NORMAL**: 代表可以直接按 5 天一批进行批量生成。
- **HI-LOAD**: 代表该天文章极多（>15篇），建议**单独为该天生成文稿**，并严格执行 `PODCAST_PROMPT.md` 中的“分级播报”策略。

### 第二阶段：AI 助手撰写文稿
AI 助手读取上述 JSON 数据，并根据 `strategy` 字段采取不同策略。
- **强制约束**：必须严格遵守 [PODCAST_PROMPT.md](file:///Users/Alok/alok-rss-daily/docs/PODCAST_PROMPT.md) 中的所有生成规则（大白话拆解、无列表、结尾笑话等）。
- **核对流程**：AI 助手在输出前必须逐日对比 `TOTAL_SUMMARY` 中的数量，确保**没有文章被遗漏**。
，完成该批次的闭环。
6. **[循环]**：重复上述过程直至 90 天数据全部覆盖。

---

## 🛠 分步操作指南 (SOP)

### 第零阶段：环境清理 (可选)
// turbo-all
```bash
npx tsx scripts/clear-podcasts.ts
```

### 第一阶段：数据提取 (由用户执行)
提取接下来的 **5 到 7 天** 的文章数据。
// turbo-all
```bash
# 每次提取 7 天，产出的 JSON 需全选贴给 AI 助手
npx tsx scripts/extract-briefing-data.ts --days=7
```

### 第二阶段：助理撰写 (由 AI 助手执行)
用户将 JSON 贴给助手，并下令：
> “请**必须且仅能严格按照** [PODCAST_PROMPT.md](file:///Users/Alok/alok-rss-daily/docs/PODCAST_PROMPT.md) 里的 Prompt 规范，为以下数据生成播客文稿。**绝对禁止任何形式的自我发挥或格式变动。**”

助理需在输出前强制阅读 MD 末尾的“自检清单”，确保 100% 覆盖 JSON 中的文章。

### 第三阶段：数据录入 (由用户执行)
将助手生成好的 JSON 录入。
// turbo-all
```bash
# 助手会针对这 7 天提供一个完整的合并 JSON
npx tsx scripts/ingest-podcasts.ts '{"2026-03-08": "...", "2026-03-07": "...", ...}'
```

### 第四阶段：批量语音合成 TTS (由用户执行)
// turbo-all
```bash
# --days 需与第一阶段提取的天数保持一致（或多出几天以防回填覆盖）
# --delay=5 建议保留，以防 Edge TTS 频率限制
pnpm tsx scripts/backfill-podcasts-tts.ts --days=7 --delay=5
```

---

## 💡 进阶：如何白嫖/防重复？
本系统使用了 **MD5 内容哈希** 机制。如果某一段文字已经生成过音频存放在 Storage 中，运行 TTS 脚本时会自动检测到并瞬间关联，**不会重复消耗流量或生成时间**。

