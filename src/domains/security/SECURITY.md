# 安全领域防御体系 (Security Domain)

本文档详细介绍了 Antigravity 项目的安全防御架构，核心逻辑位于 `src/domains/security` 及全站边缘中间件。

## 1. 核心职责

- **流量审计**: 识别并记录所有自动化（Bot）流量，区分合规爬虫与恶意扫描。
- **访问控制**: 在 Edge 层（Middleware）实施 WAF 级别的 IP/UA 拦截和路径过滤。
- **404 归因**: 精准追踪死链来源，辅助 SEO 优化。

## 2. 架构组件

### 2.1 边缘中间件 (`src/middleware.ts`)

全站流量的守门人，执行以下逻辑：

1.  **Geo-IP 识别**: 从 Vercel 边缘提取 `ip_country`，实现地理位置维度的流量分析。
2.  **User-Agent 分析**:
    - **白名单**: 显式放行 Google/Baidu/Bing 等搜索引擎（标记为 `Search-Engine` 或具体 Bot 名）。
    - **黑名单**: 阻断 Ahrefs/Semrush 等营销爬虫及 GPTBot/Claude 等 AI 训练抓取（标记为 `SEO-Scraper` / `AI-Bot`）。
    - **恶意特征**: 阻断 `.env`, `.git`, `wp-admin` 等试探性扫描（标记为 `Malicious-Scanner`）。
3.  **Header 注入**: 注入 `x-current-path` 供后续 404 页面精准获取原始请求路径。

### 2.2 Bot 日志服务 (`src/domains/security/services/bot-logger.ts`)

负责将审计日志异步写入 Supabase。

- **非阻塞 (Fire-and-Forget)**: 使用 `fetch` 异步调用，不拖累用户主请求延迟。
- **数据结构**:
  - `bot_name`: 归一化后的 Bot 名称 (e.g., "Googlebot", "SEO-Scraper").
  - `path`: 访问路径.
  - `status`: HTTP 状态码 (200, 403, 404).
  - `ip_country`: 来源国家代码 (ISO 3166-1 alpha-2, e.g., "CN", "US").
  - `user_agent`: 原始 UA 字符串.

### 2.3 管理员看板 (`src/app/admin/dashboard`)

可视化展示安全态势感知：

- **收录监测**: 展示搜索引擎的 200/404 比例，悬停可查看具体的 404 死链路径及状态码。
- **拦截审计**: 展示被防火墙自动阻断的恶意请求 TOP 榜单。

## 3. 关键业务流程

### 3.1 搜索引擎 404 追踪流程

1. Googlebot 访问旧链接 `/old-article`.
2. `middleware.ts` 识别为 Googlebot (白名单)，注入 `x-current-path: /old-article`，放行。
3. Next.js 路由匹配失败，渲染 `not-found.tsx`.
4. `not-found.tsx` 读取 `x-current-path`.
5. 调用 `logServerBotHit`，记录: `{ bot: 'Googlebot', path: '/old-article', status: 404 }`.
6. 管理员在看板看到 Googlebot 产生了一条 404 记录，Mouseover 显示路径。

## 4. 数据库模型 (`bot_hits`)

| 字段         | 类型        | 说明                            |
| :----------- | :---------- | :------------------------------ |
| `id`         | uuid        | 主键                            |
| `bot_name`   | text        | 归类名称                        |
| `user_agent` | text        | 原始 UA                         |
| `path`       | text        | 请求路径                        |
| `status`     | int4        | HTTP 状态码                     |
| `ip_country` | text        | 国家代码 (空代表本地或无法识别) |
| `created_at` | timestamptz | 记录时间                        |

## 5. 扩展性

如需新增拦截规则，请直接编辑 `src/middleware.ts` 中的正则匹配列表。如需新增 Bot 类型，请同步更新 `src/shared/types/dashboard.ts` 中的类型定义。
