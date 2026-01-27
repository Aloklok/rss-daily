# 基础设施架构文档 (Infrastructure)

本文档记录了 Briefing Hub 的全球服务分布及网络拓扑，用于性能审计与稳定性评估。

## 1. 全球服务分布

```
🧑‍💻 用户 (中国) ───[30ms]───► 🇯🇵 东京 (Vercel Edge / Cloudflare)
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼ [80ms]                                        ▼ [250ms]
    🇰🇷 韩国 (Supabase)                              🇮🇩 印尼 (FreshRSS)
    文章数据/向量/图片存储                           用户状态 (已读/收藏)
```

## 2. 核心服务清单

| 服务            | 提供商        | 物理位置        | 核心职责                     | 延迟感官 |
| :-------------- | :------------ | :-------------- | :--------------------------- | :------- |
| **前端/Edge**   | Vercel        | 🇯🇵 日本东京     | SSR/ISR 渲染 (支持 Gemini)   | 极速 ✅  |
| **数据库/图片** | Supabase      | 🇰🇷 韩国首尔     | 数据存储、向量检索、图片托管 | 稳定 ✅  |
| **用户状态**    | FreshRSS      | 🇮🇩 印尼雅加达   | 同步已读/星标状态            | 良好 ✅  |
| **AI 服务**     | Google Gemini | 全球 API        | 摘要生成 (需要非 HK/CN 节点) | 稳定 ✅  |
| **图片 CDN**    | Cloudflare    | 全球            | 代理 Supabase 存储以加速访问 | 极速 ✅  |
| **DNS 解析**    | Cloudflare    | 全球            | 全球 DNS 解析，海外爬虫友好  | 极速 ✅  |
| **缓存预热**    | Vercel Cron   | 🇯🇵 亚洲/🇺🇸 美国 | 定时/部署后预热 ISR 缓存     | 自动 ✅  |

## 3. DNS 配置详情 (Cloudflare)

| 主机记录 | 类型  | 记录值                                | 代理状态 | 备注                 |
| :------- | :---- | :------------------------------------ | :------- | :------------------- |
| `@`      | A     | `216.198.79.1`                        | 已代理   | 主域名 → Vercel      |
| `www`    | CNAME | `6672a4c449d2fc58.vercel-dns-017.com` | 已代理   | www 子域名 → Vercel  |
| `n8n`    | A     | `35.212.215.6`                        | 已代理   | n8n 自动化服务 → GCP |

> [!IMPORTANT]
> **2026-01-27 架构回归：开启 Cloudflare 代理 (Orange Cloud)**
>
> 鉴于海外爬虫收录变动及防御需求，全站请求流量已由 Cloudflare 接管：
>
> 1. **AI Crawl Control**: 开启 Cloudflare AI 爬虫控制，自动更新 `robots.txt` 并防御 AI 类扫描。
> 2. **边缘加速**: 利用 Cloudflare 北美节点降低 Googlebot 抓取延迟。
> 3. **安全下沉**: 恶意路径扫描、SEO 爬虫拦截由 Cloudflare WAF 规则承接，减轻 Vercel Edge 负载。

## 4. 架构优化总结

- **DNS 策略**: 使用 Cloudflare DNS。
  - **核心理由**: **全球 Anycast 节点**。Cloudflare 在全球拥有节点，海外爬虫 DNS 解析速度和成功率大幅提升。
  - **百度爬虫监控**: 通过应用层 `bot_hits` 表记录百度爬虫访问路径，META 字段包含 `edge_region` 可追踪请求到达的 Vercel Edge 区域。
  - **GCP SSL**: n8n 子域名使用 Cloudflare 代理，SSL 由 Cloudflare 自动管理。

- **去美国化**：关键数据链路已全部移回亚洲。FreshRSS 迁移至 **印尼 (Zeabur)** 后，响应速度提升了 80%+。
- **全能 Supabase**：图片存储与数据库共用韩国节点，简化了鉴权逻辑并保持了优秀的访问速度。
- **边缘加速**：Cloudflare 负责 DNS 解析 + 静态资源加速，Vercel Edge 负责极速生成 HTML。

## 5. 缓存预热机制 (Cache Warmup)

为了解决亚洲用户和爬虫访问时的"首屏 404/超时"问题，实施了多层次预热：

- **Vercel Cron**: 分两个批次 (间隔5分钟) 触发亚洲预热：
  1. **zh (中文)**: 02:00 UTC
  2. **en (英文)**: 02:05 UTC (规避超时风险)
- **Deploy Hook / Daily Action**: GitHub Runner 执行三明治式预热流程：
  1. **亚洲预热 (ZH)**: 触发 Vercel API `/api/system/warmup?lang=zh`
  2. **全球预热**: 全量爬取 sitemap (ZH + EN)，模拟真实流量。
  3. **亚洲预热 (EN)**: 触发 Vercel API `/api/system/warmup?lang=en`
- **安全白名单**: 内部预热请求通过 `User-Agent: Vercel-Internal-Warmup` 绕过安全拦截。

## 6. Cloudflare 边缘优化配置 (2026-01-27 审计)

为了配合 Vercel 的渲染能力并最大化爬虫友好度，Cloudflare 侧已实施以下配置：

### 6.1 网络与协议 (Network)

- **始终使用 HTTPS**: `已启用`。在边缘直接完成跳转，优化 SEO 并减少回源。
- **HTTP/3 (with QUIC)**: `已启用`。利用最新协议降低弱网环境下请求耗时。
- **0-RTT 连接恢复**: `已启用`。针对老访客加速 TLS 握手。
- **TLS 1.3**: `已启用`。
- **Early Hints (103)**: `已启用`。辅助浏览器提前拉取静态资源。
- **IPv6 兼容性**: `已启用`。
- **WebSockets**: `已启用`。支持潜在的实时数据推送。
- **IP 地理位置**: `已启用` (关键)。为日志审计系统提供 `cf-ipcountry` Header。

### 6.2 速度优化 (Speed)

- **Rocket Loader™**: `已禁用` (核心)。防止干扰 Next.js 的 Hydration 及脚本加载顺序。
- **Crawler Hints**: `已启用`。主动向 Bing 等搜索引擎同步内容更新信号。
- **Brotli 压缩**: `已确认启用`。提供极高的压缩比。

### 6.3 缓存架构 (Caching)

- **Tiered Cache (分层缓存)**: `已启用 (Smart Topology)`。CF 节点间共享缓存，显著提升跨洋（如北美爬虫）访问的缓存命中率，大幅降低回源 Vercel 压力。
- **缓存储备 (Cache Reserve)**: `未启用` (基于成本考虑)。当前 ISR 架构无需额外的付费持久缓存层。

### 6.4 安全防御 (Security)

- **Managed WAF Rules**: `已启用`。由 CF 承接基础漏洞检测。
- **AI Crawl Control**: `已启用`。拦截非授权 AI 爬虫。
- **连续脚本监视 & 替换不安全库**: `已启用`。通过 cdnjs 自动加固前端三方库。
- **网络错误记录 (NEL)**: `已启用`。用于接收并分析浏览器侧的连接错误报告。
- **洋葱路由 (Onion Routing)**: `已启用`。允许 Tor 网络用户安全访问。

---

> [!NOTE]
> 详细的环境变量配置请参考私有的 `.env.local` 文件。
