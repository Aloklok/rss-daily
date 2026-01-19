# 安全设计与审计策略 (Security Design & Audit Strategy)

简报系统采用多层安全防御与审计策略，重点在于高精度的威胁检测与 SEO 健康监测，屏蔽无效噪音。

## 1. 统一常量管理 (`src/domains/security/constants.ts`)

所有爬虫规则统一定义在 `constants.ts` 中，确保 Proxy 层、服务端日志和 Dashboard 看板使用相同的识别标准。

### 导出内容

| 常量/函数                     | 用途                         |
| ----------------------------- | ---------------------------- |
| `UTILITY_BOTS_PATTERN`        | 工具类机器人正则（静默放行） |
| `SEARCH_ENGINE_BOTS_PATTERN`  | 搜索引擎白名单正则           |
| `SEARCH_ENGINE_NAME_PATTERNS` | 搜索引擎名称提取映射表       |
| `SEARCH_ENGINE_KEYWORDS`      | Dashboard 分类关键词数组     |
| `SEO_SCRAPER_BOTS_PATTERN`    | SEO 爬虫拦截正则             |
| `AI_ARCHIVE_BOTS_PATTERN`     | AI/Archive 机器人拦截正则    |
| `extractSearchEngineName(ua)` | 从 UA 提取搜索引擎名称       |
| `isSearchEngine(ua)`          | 判断是否为搜索引擎           |
| `isUtilityBot(ua)` 等         | 其他便捷判断函数             |

## 2. 边缘代理层 (`src/proxy.ts`)

`proxy` 函数（原 `middleware`）是系统的第一道防线，从 `constants.ts` 导入所有规则。

### 机器人管理策略 (精简审计 - Lean Audit)

为了确保审计日志具有高信噪比，我们实施了**选择性审计**政策：

- **静默放行 (Silent Bypass)**：识别合法的工具类机器人（如 Sentry, Vercel, Uptime 监控等）并直接放行。这些请求**不记录日志**，也不触发安全校验。
- **精准拦截**：
  - **恶意路径扫描**：对针对敏感路径（`.env`, `wp-admin`, `.git` 等）的请求立即执行 403 拦截。
  - **UA 校验**：拦截 User-Agent 为空或过短（少于 10 字符）的脚本请求。
  - **限制型爬虫**：根据特征码拦截高频 SEO 爬虫和 AI 训练机器人。

### 搜索引擎白名单

当前放行的搜索引擎爬虫：

```
Googlebot | Baiduspider | Bingbot | Slurp | Yisou | YandexBot | DuckDuckGo | Sogou
Exabot | facebot | facebookexternalhit | Applebot | Bytespider | TikTokSpider
LinkedInBot | Twitterbot | Pinterestbot | Discordbot | Telegrambot | WhatsApp
NaverBot | 360Spider | PetalBot
```

### SEO 爬虫拦截清单

```
AhrefsBot | SemrushBot | MJ12bot | Dotbot | DataForSeoBot | Barkrowler
ZoominfoBot | BLEXBot | SeekportBot | Scrapy
```

### AI/Archive 机器人拦截清单

```
archive.org_bot | DuckAssistBot | meta-externalfetcher | MistralAI-User
OAI-SearchBot | Perplexity-User | PerplexityBot | ProRataInc | GPTBot
ChatGPT-User | CCBot | anthropic-ai | Claude-Web | Google-Extended
Amazonbot | cohere-ai | Deepseek | ByteDance-Gemini
```

## 3. 服务端审计日志 (`bot-logger.ts`)

日志持久化存储在 Supabase 中，供管理员审计。从 `constants.ts` 导入统一规则。

### 审计目标

- **安全拦截记录 (403)**：记录所有被拦截的请求，用于追踪攻击模式。
- **搜索引擎健康 (SEO)**：记录主要搜索引擎的所有访问记录。无论其返回 200、404 还是 5xx，均进行记录以监控索引健康状态。
- **5xx 服务器错误**：通过 `error.tsx` 和 `global-error.tsx` 捕捉运行时错误，并通过 `/api/system/log-error` 端点记录到数据库。
- **噪音过滤**：**不记录**来自未知 Agent 或普通用户的常规 404 错误。这可以防止数据库膨胀和看板数据混乱。

### 5xx 错误捕捉架构

```
用户请求 → Proxy (记录 200) → Next.js 路由
                                    ↓
                              运行时错误发生
                                    ↓
                          error.tsx / global-error.tsx
                                    ↓
                          POST /api/system/log-error
                                    ↓
                          logServerBotHit(path, ua, 500)
                                    ↓
                              bot_hits 表
```

## 4. 管理员审计看板

位于 `/admin/dashboard` 的管理中心提供以下视角：

### 搜索引擎审计 (流量与收录审计)

- **爬虫访问统计 (200)**：展示各搜索引擎的正常抓取次数。
- **爬虫异常日志 (404/403)**：列表展示搜索引擎遇到的死链和错误路径，用于内容健康监控。

### 全站安全防御

- **今日拦截请求 (403)**：实时显示安全拦截次数。
- **今日死链审计 (404)**：展示触发 404 的异常请求次数。
- **异常流量与安全审计**：集中展示非搜索引擎的恶意爬虫和 AI 训练机器人。
- **审计详情 (异常流量路径)**：识别被最频繁扫描的高危路径。

## 5. 维护说明

- **表清理**：可以随时执行 `TRUNCATE` 清空 `bot_hits` 表以获得干净的审计视图。该表仅用于审计，不影响业务运作。
- **白名单更新**：如需新增允许的工具或爬虫，请同步更新 `src/domains/security/constants.ts`，所有引用位置将自动同步。
