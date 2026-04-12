# AI 智能体架构文档 (AI.md)

本项目集成了一套基于 **RAG (Retrieval-Augmented Generation)** 模式的高级 AI 对话系统，旨在为管理员提供基于本地简报和行业时事的智能问答能力。

## 🏗 核心架构 (RAG 2.0 流路)

系统的执行链路分为三个阶段：

### 0. 向量化 (Vectorization)

在进入 RAG 流程前，所有文章均通过 `src/domains/intelligence/services/` 下的 Embedding 逻辑进行向量化预处理。我们采用**混合语义指纹**策略，而非单纯的正文切片。

- **Embedding 模型**: `gemini-embedding-001` (使用官方 `@google/genai` SDK)
- **向量化字段**: `title` + `category` + `keywords` + `summary` + `tldr`
- **逻辑**: 通过将分类和关键词硬编码进向量内容，确保了语义搜索时不仅能匹配到内容相似，还能匹配到“分类正确”的文章。
- **现状**:
  - **中文**: 启用全量向量化。
  - **英文**: 暂时禁用自动向量化 (Revalidate Service跳过），保留关键词搜索能力。

### 0.5 自动翻译同步 (Auto Translation)

系统通过 **全链路自动化工作流** 实现中英文内容的同步。当主表文章入库或更新 AI 摘要后，翻译逻辑会被自动触发。

- **触发机制**：由系统领域的 Webhook 编排驱动，详情见 [SYSTEM.md](../system/SYSTEM.md)。
- **模型策略 (Model Strategy)**:
  - **批量处理 (Batch)**: 使用 `Qwen3-8B` (SiliconFlow)。为了最大化利用 128K 上下文窗口，采用“提示词批量化”策略（5 篇/包）。
  - **单篇/Webhook**: 使用 `Hunyuan-MT-7B` (Tencent/SiliconFlow)。混元模型在处理高密度技术术语时表现更佳，且无中文泄漏风险。
- **翻译协议 (Protocols)**:
  - **JSON Mode (Qwen)**: 传统的 JSON 输出模式。
  - **Tag-Based Mode (Hunyuan)**: 鉴于混元模型不支持 JSON Mode 且易产生未转义引号，单篇翻译采用 `[[KEY]]: Content` 的纯文本协议。
    - **原理**: 提示词要求模型输出 `[[TITLE]]: ...` 格式，解析器通过正则 `\[\[KEY\]\]\s*:\s*(.*?)` 提取内容。
    - **鲁棒性**: 解析器支持从 `[[KEY**`、`[[KEY】` 等多种 AI 幻觉格式中恢复数据，并具备 Lookahead 锚定防止误吞正文。
- **幂等更新 (Upsert)**: 翻译任务采用 `upsert` (onConflict: id) 逻辑，确保多次运行或 API 重放时数据一致性。
- **风格**: 采用 Modern, Clear Technical English。保持专业背景（首席架构师身份），避免晦涩学术词汇。
- **格式原则 (CRITICAL)**: **严格遵守原文 Markdown 格式**。除非原文已有加粗，否则 AI 禁止擅自对标题和摘要进行加粗（已在 Prompt 中显式禁用 `**Marker**`）。
- **元数据对齐**:
  - **`articles_en`**: 物理存储翻译文本 + Model ID。
  - **`articles_view_en`**: 视图层实时 JOIN。
- **鲁棒性设计 (Robustness)**:
  - **自动重试**: `withRetry` 机制 (3次指数退避)。
  - **Tag 解析回退**: 针对混元模型的正则解析器极其宽容，确保 100% 数据捕获。
  - **防幻觉**: 强制类型转换与空字段填充。

### 1. 意图识别与编排 (Intelligence Orchestration)

AI 聊天的核心入口现由 **ChatOrchestrator** (位于 `intelligence/services`) 承载。它不仅负责调用 **AI Router** 进行意图分类，还编排后续的检索、重排与执行链路。

- **RAG_LOCAL**: 识别到用户在咨询特定资讯或本地文章。Orchestrator 会驱动完整的“向量检索 + 重排”链路。
- **DIRECT (闲聊模式)**: 跳过数据库检索，以低延迟直接回答。
- **SEARCH_WEB**: 自动开启 Google Search Grounding 联网搜索。

### 2. 召回阶段 (Recall Phase)

为了平衡召回率与引用的精确度，系统采用两阶段过滤：

- **第一阶段（混合检索 Hybrid Search）**：
  - 系统采用 **5 层优先级分权排序 (Multi-level Priority)**，综合词面匹配 (`ILIKE`)、索引检索 (`&@~`) 与向量空间算法：
    - **P1 (最高: 原文匹配)**: 标题字符串字面包含 (`ILIKE`)。专门为“复制标题搜索”设计，确保精准命中。
    - **P2 (高: 标题核心)**: 标题关键词命中 (`&@~`) 或 向量强相关 (`Similarity > 0.88`)。
      - **MP3 优先 (Edge TTS)**：优先检测云端生成的 `audioUrl`。若存在，使用 `<audio>` 元素播放高质量神经语音 MP3，支持原生暂停/恢复及精确进度控制。
      - **Web Speech 降级**：若音频生成确定失败（经过重试或超时），启用本地 `window.speechSynthesis`。
    - **P3 (中: 标签特征)**: 关键词字段 (`keywords`) 或 分类 (`category`) 命中。
    - **P4 (低: 摘要噪音)**: 文章摘要 (`summary`) 命中。将其降级是为了防止摘要中的冗余词汇遮挡标题精准匹配的结果。
    - **P5 (兜底: 语义)**: 满足基础语义门槛 (`Similarity > 0.60`) 的其它关联文章。
- **第二阶段（精选/重排）**：
  - **输入**: 将 Top 50 篇的 `id, title, published, sourceName, summary, category, keywords` 组装为 Prompt。
  - **交互**: 调用 Gemini (2.0 Flash) 执行语义重排 (`reRankArticles`)。
  - **逻辑**: 模型基于 User Query 剔除内容重复或时效性差的篇目。
  - **结果**: 选出最相关的 **Top 10-15** 篇作为最终上下文。这极大降低了模型的“注意力发散”，提高了引用的准确度。

### 2. 增强上下文生成 (Context Enrichment)

在精选出 Top 15 后，系统会构建一个高度浓缩的背景列表供模型处理：

- **字段提取**: 从数据库中提取以下核心元数据：
  - **基础**: `id`, `title`, `published`, `link`, `sourceName`
  - **分类**: `category`, `keywords`
  - **摘要**: `tldr` (一句话总结), `summary`
  - **深度分析**: `verdict` (评分与重要性), `highlights` (技术亮点), `critiques` (犀利吐槽), `marketTake` (市场观点)
- **注入 Persona**: 注入“首席架构师” Persona，强制执行差异化引用逻辑（见下文）。

### 3. 流式渲染与交互 (Streaming & UX)

- **SSE 流式输出**：通过 Server-Sent Events 实现毫秒级响应，并配合缓冲区解决数据包截断问题。
- **交互渲染引擎**：前端通过深度递归解析 Markdown，将文本中的 `[N]` 自动转化为交互组件。
  - **多格式识别**: 采用增强正则表达式，支持旧版的 `[1]`、`[1.1]`、`¹` 等数字位置索引，并**全面升级支持基于文章原生命名的新版 Hex `[REF-ID]`** (例如 `[ea0763c7]`)。这彻底解决了基于位置的数字索引容易导致模型“幻觉错乱”的问题。
  - **加粗兼容**: 解决了角标在 `**加粗文本**` 内部时无法被点击的问题，并内置了针对不同模型冗余符号清洗机制及高密度的全文去重（支持连续与分布去重）。
  - **点击行为**: 点击后不再打开外部链接，而是直接触发 `UnifiedArticleModal` 并默认进入“简报”视图。对于未缓存的文章，系统会自动触发异步补全（Hydration）流程。

---

## 🔍 引用准则 (Citation Rules)

为了确保专业度，系统遵循以下“差异化引用”策略：

- **常识不引**：互联网通用知识、基础概念不添加脚注。
- **证据必引**：涉及具体数据、特定项目案例、独到见解时，强制在句末标注 `[N]`。
- **透明审计**：每条回复末尾均有 `[统计：检索 X 篇，引用了 Y 篇]`，方便管理员溯源。

---

## ⚙️ 模型与配额管理

- **模型路由 (Model Routing)**：由 `src/domains/intelligence/services/chat-orchestrator.ts`（对话场景）以及 API 层的智能分发逻辑（后台场景）共同管理。系统通过读取 `constants.ts` 中的 `provider` 属性实现基于数据的精准路由（Google vs SiliconFlow）。
- **“羊毛”配额池 (Quota Buffering)**：对话框型号选择器集成了多个具备独立配额权重的模型。当主模型触发 429 报错时，管理员可通过切换“独立池子”型号实现每日可用次数的最大化。
- **深度思考模式 (Thinking Mode)**：
  - **逻辑特性**：针对 SiliconFlow (DeepSeek-R1, Qwen-Max, Qwen3.5) 和 Google (Gemini 2.x/3.x 全系列) 模型提供深度逻辑推理支持。
  - **实现差异**:
    - **SiliconFlow**: 通过 `enable_thinking` 开关开启，解析 `<think>` 标签过滤内容。
    - **Google**: 通过 SDK `thinkingConfig` 开启，利用新版 SDK 的候选文稿过滤机制自动分离思考过程。
  - **UI 感知**：引入 `ReasoningToggle` 组件，基于 `constants.ts` 中的 `hasReasoning` 标记自动控制开关的可见性与可点击状态。
  - **稳定性控制**：为所有 AI 生成接口内置 **60 秒超时控制**，解决模型层挂起导致的前端长时间假死问题。
- **使用看板**：对话框型号选择器中实时显示模型配额（RPM/RPD）及“独立池子”标识，辅助决策。
- **Google 原生集成 (Native Gemini)**:
  - **接口**: 迁移至官方最新 `@google/genai` SDK，采用统一的 `Client` 架构。
  - **Thinking (Gemini 2.5)**: 原生支持 `thinkingConfig`，通过 `thinkingBudget` 实现动态逻辑推理。
  - **多 Key 管理**: 支持 `ALOK` 和 `CHENG30` 别名切换，确保主副账号配额互补。
- **使用看板**：对话框型号选择器中实时显示模型配额（RPM/RPD）及“独立池子”标识，辅助决策。

---

## ⚠️ 开发注意事项 (Important Notes)

### 1. 渲染性能与 VDOM 稳定性

- **递归解析**: 系统的引用按钮采用深度递归解析方案。虽然功能强大（支持嵌套在加粗/斜体内），但计算效率受对话长度影响。
- **对话锁定**: `ChatStore` 会根据记忆窗口（默认 8 轮）自动管理。如需更长历史，需在 `src/domains/intelligence/store/chatStore.ts` 中调整以平衡内存与性能。
- **国际化与多语言隔离**: AI 组件（`AIChatModal`, `ModelSelector`, `ReasoningToggle`）已全面集成 `dict` 字典。对话框的占位符、按钮及欢迎语均随页面语言动态切换。
- **组件持久化 (Critical)**:
  - **组件隔离**: `MessageList` 已被抽离为独立的 `React.memo` 组件，确保在流式输出（Partial Streaming）触发高频重绘时，只有最后一条消息在更新，上百条历史消息保持静态。这是防止多轮对话 CPU 飙升的关键。
  - **顶层声明**: `ChatMessageItem` 和 `MessageList` 必须声明在 **顶层作用域**（即模态框主组件外部）。严禁在 `src/domains/intelligence/components/AIChatModal.tsx` 内部动态声明组件，否则 React 每次 Render 都会认为其是新组件，强制卸载旧 DOM 并重新挂载，这将使 `React.memo` 完全失效并导致剧烈卡顿。

### 2. 模型配额与 API 隔离

- **物理隔离**: 为防止实时问答与后台定时任务（如大规模简报生成）争抢配额，AI 助手强制锁定使用 `GOOGLE_GENERATIVE_AI_API_KEY_CHENG30`。
- **模型路由**: 由 `src/domains/intelligence/services/chat-orchestrator.ts` 统一管理。

### 3. 样式保护与视觉架构

- **Prose 作用域**: 消息内容强制包裹在 `.prose` 类中。修改全局样式时，应优先使用 Tailwind 的 `prose-xxx` 工具类或通过 `globals.css` 中针对 AI 容器的定向选择器来调整，避免全局样式污染。
- **模糊度设计 (Blur Rationale)**: 模态框背景模糊度限制在 `backdrop-blur-xl`。实测表明，在流式打字高频刷新时，`2xl` 或更高强度的 GPU 高斯模糊计算会与文字渲染产生资源竞争，导致明显的低帧率感。

---

## 🚀 深度工程优化建议 (Optimization Suggestions)

基于当前版本的交付质量与用户反馈，以下是下一步建议的工程优化方向：

### 1. 架构组件化重构 (Code Modularization)

- **现状**: `AIChatModal.tsx` 已膨胀至 700+ 行，逻辑高度耦合。
- **建议**: 将其拆分为 `ChatHeader`、`MessageList`、`MessageItem`、`CitationPanel`、`ModelSelector` 和 `ChatInput`。
- **收益**: 提高组件的可维护性，并通过 React.memo 进一步精简重绘范围，提升流畅度。

### 2. 语义缓存层 (Semantic Caching)

- **建议**: 在 `app/api/ai/chat/route.ts` 中引入语义缓存。
- **逻辑**: 对用户的 Query 进行向量化，如果与 10 分钟内已回答过的 Query 相似度高于 0.98，则直接返回缓存结果。
- **收益**: 极大减少 Gemini 配额消耗，实现“秒回”体验。

### 3. 引用系统的极致鲁棒性 (Citation Robustness)

- **多格式兼容**: 采用统一的 `getOriginalIndex` 辅助函数，并适配增强型正则表达式，确保 `[1]`、`¹` 以及模型占位符 `{{UNIQUE_CITED_COUNT}}` 都能被精准捕获并替换。
- **后置修正机制**: 在数据持久化前端通过精准正则（Regex-based substitution）纠正 AI 自报的统计数字与实际提取到的文献数量之间的差异，并自动清理 AI 生成的重复或格式错误的引用注脚，确保 UI 纯净。
- **首次出现原则**: 实施“每个引用仅在正文首次出现时转为角标”的策略，减少视觉干扰，保持排版轻盈。

### 4. 样式与性能的平衡 (Style vs. Perf)

- **纯色优先**: 为了极致的流式打字性能，在全屏模式下应优先使用纯色背景（去除 `backdrop-blur`），避免 GPU 重绘与文字渲染争抢资源。
- **全屏自适应**: 模态框应支持“真全屏”切换（Edge-to-Edge），但在宽屏设备上必须通过 `max-w-5xl` 限制对话气泡宽度，保护阅读体验。

---

## 📅 路线图 (Roadmap)

1. **[待办] 混合搜索深度集成**：接入 Serper 或 Bing API，弥补 Google Search Grounding 在特定中文垂直领域的信息差。
2. **[进行中] 对话状态完全持久化**：确保元数据（Metadata）随消息体一同落库，彻底解决页面刷新后历史引用失效的问题。
3. **[计划] 智能搜索触发器**：根据本地检索文章的相关度评分，自动决定是否静默开启联网搜索。
4. **[计划] 多模态支持**：基于 Gemini 2.0 Pro 能力，支持管理员直接拖入截图让 AI 分析报表。

### 5. 高级检索策略 (Search Intelligence)

- **[已完成] 关键词搜索升级**: 已将 RPC 升级为 **PGroonga** (`&@~`) + **字面加权门槛**。通过一套 5 级优先级矩阵 (P1-P5)，解决了“标题复制搜不到”的痛点，确保字面匹配、标签匹配与语义匹配在不同维度的有机融合。
- **[已完成] 智能路由 (AI Router)**: 在 RAG 链路上游引入轻量级路由层 (Gemini 1.5 Flash)，负责：
  - **意图识别**: 区分“闲聊 (Small Talk)”、“普通搜索 (RAG)”和“联网搜索 (Web Search)”。
  - **参数提取**: 将自然语言（如“上周高分文章”）转化为结构化引导条件。
  - **性能收益**: 对非检索类问题（如“你好”、“你是谁”）实现极速秒回。

### 6. 异步任务架构 (Scalability)

- **[架构建议] 引入 PGMQ**: 当前系统采用同步生成 Embedding，适合单条数据流。若未来扩展至**批量抓取**场景（如一次导入 500 篇），强烈建议引入 `pgmq`（Supabase 扩展）：
  - **流程**: 爬虫入库 -> 写入 PGMQ 队列 -> Worker 消费队列 -> 调用 Gemini 生成向量 -> 异步回写 DB。
  - **收益**: 解耦 AI 处理的长耗时（5s+）与入库的短耗时（ms级），防止 API 超时。

---

## 🛠 如果您是 Prompt 工程师 (Operations)

为了支持 Prompt 的快速迭代与版本回滚，项目内置了以下工程化脚本：

### 1. 拉取最新 Prompt (`pull`)

将线上的 Prompt 配置同步到本地 `CHAT_PROMPT.MD` 文件中。

```bash
pnpm chat-prompt:pull
```

### 2. 推送 Prompt 更新 (`push`)

将本地 `CHAT_PROMPT.MD` 的修改推送到 Supabase 生产环境。

**常规更新（覆盖模式）**：
适用于微调错别字或小优化，不改变 Key。

```bash
pnpm chat-prompt:push
```

**版本迭代（备份模式）**：
适用于重大逻辑变更。该命令会自动将线上当前的 Prompt 备份为 `gemini_chat_prompt_YYYYMMDD`，然后再覆盖写入新版。

```bash
pnpm chat-prompt:push --new
```

---

## 7. 简报生成策略 (Briefing Generation)

简报生成是 Intelligence 领域的核心能力，通过调用 Gemini 将原始 HTML 转化为结构化洞察。

### 7.1 生成模式差异

系统支持两种生成模式，它们在**日期处理**上遵循相同的原则：

| 模式         | 场景               | 并发策略               | 日期逻辑       | 缓存清除范围                           |
| :----------- | :----------------- | :--------------------- | :------------- | :------------------------------------- |
| **单篇生成** | 用户点击"重新生成" | 串行                   | 严格保留原日期 | 详情页 + 日期页 + 首页(若为今日)       |
| **批量生成** | 管理员后台批量操作 | 伪并发 (Batch Payload) | 严格保留原日期 | 日期页 + **首页(若含今日)** + 数据标签 |

### 7.2 缓存一致性 (Cache Consistency)

为了确保 AI 生成的内容能即时反映在前端，生成动作（Action）必须执行**全链路缓存清除**：

1.  **数据层 (`unstable_cache`)**: 必须通过 `revalidateTag('briefing-data-${date}')` 清除，否则服务端组件仍会读取旧数据。
2.  **页面层 (ISR)**: 必须清除 `/date/${date}`。
3.  **首页联动**: 若生成的文章归属于“今天（上海时间）”，**必须**额外清除首页 `/` 缓存。这是因为首页采用了“强制今日”的 SSR 策略，若不清除，用户访问首页时将看不到最新的 AI 分析结果。

### 7.3 日报播客生成 (Daily Podcast)

作为简报阅读体验的延伸，通过点击按需生成的动态“播客讲稿”与音频。

- **文稿生成 (Script)**：使用 `gemini_podcast_prompt`。这是一个为 TTS 特调的纯净 Prompt，通过强制结构化（新闻要素）规范了排版。
- **音频引擎 (Edge TTS)**：集成 `edge-tts-universal`。
  - **语音角色**：`zh-CN-XiaoxiaoNeural` (中英混读最佳)。
  - **语速调优**：设定为 `-25%`，模拟播音员从容、稳重的播报节奏。
- **存储架构**：
  - **流式处理**：服务端通过 WebSocket 接收 TTS 音频流并聚合为 Buffer。
  - **持久化**：生成的 MP3 音频上传至 Supabase Storage。
- `POST /api/podcasts/generate`: **[异步化架构]** 按需生成播客音频。集成 **原子化 Upsert** 与 **一致性校验** 逻辑，确保文稿与音频哈希 100% 匹配。若检测到音频过期或缺失，会自动通过 `after()` API 触发后台重录。
- `GET /api/podcasts/fetch`: 获取已存在的播客文稿与音频 URL 记录。支持 **哈希指纹审计**，若文稿与音频不匹配则返回 `status: 'stale'` 并清空 URL，驱动系统自愈。
- **中英文隔离与命名规范**：
  - **逻辑隔离**：通过 `language` 字段（`zh`/`en`）在 `daily_podcasts` 表中物理隔离文稿。
  - **命名后缀**：为了防止文件名冲突，英文版播客音频文件名强制附带 `_en` 后缀（例如 `podcast-YYYY-MM-DD-en-hash_en.mp3`）。
- **缓存**：音频 URL 随文稿记录在 `daily_podcasts` 表中，实现“一次生成，全端缓存”。
- **动态思考 (Thinking Mode)**：可从 `app_config` 中读取配置，结合 SiliconFlow API 启用 Qwen3.5 推理模型获得更有逻辑深度的串联脚本。
- **智能预加载**：组件挂载时静默查询 `/api/podcasts/fetch`。若云端已有音频和讲稿，优先使用云端记录。
- **异步处理架构 (Reliability Worker)**：
  - **解耦设计**：采用“构思即返回”策略。AI 讲稿生成后经 `upsert` 原子入库，主线程立即向前端返回文稿内容。
  - **背景保活 (after API)**：在 Next.js 16 下，通过 `after()` 钩子启动后台合成。这确保了在 Vercel Serverless 环境中，即使响应已发送，录音进程也能获得算力直至完成。
  - **指数退避重试**：TTS 服务层集成 `withRetry`（默认 3 次），有效对抗 API 瞬时抖动。
- **一致性自愈 (Consistency Self-Healing)**：
  - **指纹比对**：音频文件名携带内容哈希（MD5）。`fetch` 接口会实时校验文稿与音频的匹配度。
  - **自动触发**：在 `generate` 阶段若发现文稿已存在但音频不一致，系统不再单纯返回缓存，而是**自动 Fall-through** 触发后台重录任务。
  - **状态同步**：前端轮询识别到 `stale` 状态或空音频后，保持 Loading 直至后台补录完成，实现“有感知的文字、静默补录的音频”同步体验。
- **权限与持久化**：后端提供权限校验，仅允许 `isAdmin` 用户触发重新生成。
