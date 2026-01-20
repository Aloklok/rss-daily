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
| `@`      | A     | `216.198.79.1`                        | 仅 DNS   | 主域名 → Vercel      |
| `www`    | CNAME | `6672a4c449d2fc58.vercel-dns-017.com` | 仅 DNS   | www 子域名 → Vercel  |
| `n8n`    | A     | `35.212.215.6`                        | 已代理   | n8n 自动化服务 → GCP |

> [!NOTE]
> **2026-01-20 DNS 迁移至 Cloudflare**
>
> 由于阿里云免费版 DNS 无海外解析节点，导致海外爬虫（Bingbot、Googlebot）偶发 DNS 解析失败。
> 已迁移至 Cloudflare DNS（全球 Anycast 节点）解决此问题。

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

- **Vercel Cron**: 每周日 10:00 (北京时间) 从日本节点触发全量预热。
- **Deploy Hook**: 每次部署成功后触发双重预热：
  1. **亚洲预热**: 触发 Vercel API (运行于东京)，预热亚洲节点缓存。
  2. **全球预热 (US)**: GitHub Runner 解析 `sitemap.xml` 并在美国节点发起全量 Crawl，模拟爬虫行为，确保全球 CDN 缓存新鲜度。
- **安全白名单**: 内部预热请求通过 `User-Agent: Vercel-Internal-Warmup` 绕过安全拦截。

---

> [!NOTE]
> 详细的环境变量配置请参考私有的 `.env.local` 文件。
