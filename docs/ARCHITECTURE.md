bu# 架构与技术栈详情 (Architecture & Stack)

本文档详细介绍了 Briefing Hub 的技术架构、后端集成及数据模型。

## 1. 核心架构

- **核心框架**: Next.js 16 (App Router), React 19, TypeScript
- **状态管理**:
  - **服务器状态**: TanStack Query (React Query) - 负责客户端数据交互。
  - **客户端状态**: Zustand - 管理 UI 状态和乐观更新。
- **安全性**: sanitize-html - 跨端 HTML 清洗与增强。

## 2. 后端服务集成

### Supabase

提供文章的核心内容和自定义元数据。

> 详细字段定义请查看 [types/supabase.ts](../types/supabase.ts)。

### FreshRSS

提供 RSS 订阅管理、文章状态和标签。

> 详细 API 定义请查看 [types/freshrss-greader.ts](../types/freshrss-greader.ts)。

### 统一数据模型 (Unified Data Model)

前端通过**数据融合**，将上述两个数据源的信息合并成一个统一的 `Article` 对象：

1.  **Supabase**: 提供文章的核心内容 (Content, Summary, Verdict)。
2.  **FreshRSS**: 提供文章的元数据 (Read/Starred Status, Tags)。
3.  **融合逻辑**: `Article` 对象的 `tags` 数组是融合模型的集中体现，混合了多种“标签类”信息，确保前端组件（如卡片、模态框）可以统一处理。

## 3. 安全性架构

- **HTML 内容清洗**: 采用 **sanitize-html** 进行**服务端统一清洗** (Server-Side Only)。
  - **stripTags**: 用于生成安全的 Metadata Description 和 Title，防止标签闭合攻击。
  - **sanitizeHtml**: 在数据获取层 (`fetchArticleContentServer`) 直接对 HTML 进行清洗。这不仅防止了 XSS 攻击，还显著减少了客户端 bundle 体积。

## 4. 渲染策略 (Hybrid Rendering)

项目采用 **ISR (Incremental Static Regeneration)** 与 **Dynamic Rendering** 混合的策略，以平衡性能与实时性。

### 策略详情

| 页面类型     | 路由路径        | 渲染模式          | Revalidate | 说明                                                                                                           |
| :----------- | :-------------- | :---------------- | :--------- | :------------------------------------------------------------------------------------------------------------- |
| **历史日期** | `/date/[date]`  | **ISR (Static)**  | 3600s (1h) | 历史内容不再变动，优先生成静态 HTML，利用 CDN 缓存，TTFB < 100ms。                                             |
| **今日简报** | `/date/[today]` | **Dynamic (ISR)** | 3600s (1h) | 利用 `revalidate = 3600` 兼容 `noStore()`。Next.js 会尝试缓存，但允许组件级 opt-out 以保证“今日”数据的实时性。 |
| **首页**     | `/`             | **Dynamic**       | -          | 默认为动态渲染，重定向到最新日期。                                                                             |

### 关键配置

```typescript
// app/date/[date]/page.tsx
export const revalidate = 3600; // 显式启用 ISR，兼容 Server Component 中的 noStore()
```

### 优势

- **极速访问**: 绝大多数用户访问的是 CDN 上的静态缓存。
- **动态兼容**: 解决了 `DYNAMIC_SERVER_USAGE` 报错，同时保留了在同一套代码中处理“静态历史”和“动态今日”的能力。

## 5. 性能优化 (Performance)

- **LCP (Largest Contentful Paint)**:
  - 封面图: `fetchPriority="high"` + `priority`，确保浏览器最高优先级加载。
- **TBT (Total Blocking Time)**:
  - 脚本延迟: Analytics (Clarity, Cloudflare) 迁移至 `next/script` (`afterInteractive`)，剥离出关键渲染路径，释放主线程。
- **Bundle Size**:
  - 严格分离服务端库 (`sanitize-html`)，确保不泄露到 Client Bundle。
  - 组件懒加载 (`next/dynamic`)。
- **超时熔断**: 数据库查询内置 10s 超时保护。
- **错误边界**: 页面级错误捕获和友好 UI。
- **图片优化**: 全面采用 `next/image` 和 Supabase Storage 旁路缓存策略。

## 6. 权限验证 (Authentication)

- **策略**: Client-Side Verification (客户端后置验证)。
- **机制**:
  - **静态优先**: 服务端 (`RootLayout`) **不读取 Cookie**，确保所有页面均可生成静态缓存 (ISR/SSG)，实现极速首屏 (TTFB < 100ms)。
  - **静默升级**: 页面加载后，客户端通过 `/api/auth/status` 异步验证 `site_token`。
  - **权限赋予**: 若验证通过，前端动态解锁管理功能（如“搜索”、“状态切换”）。
- **优势**: 彻底解决了因服务端读取 Cookie 导致全站降级为 SSR (动态渲染) 的性能瓶颈。
