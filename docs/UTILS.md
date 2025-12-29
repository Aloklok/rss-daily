# 工具库文档

本文档详细介绍了 `utils/` 目录下各个通用工具模块的功能与用法。这些工具函数是项目的基础设施，负责处理跨组件的通用逻辑。

## 目录

- [Content Utils (内容处理)](#content-utils-内容处理)
- [Date Utils (日期处理)](#date-utils-日期处理)
- [Image Utils (图片处理)](#image-utils-图片处理)
- [Color Utils (颜色生成)](#color-utils-颜色生成)
- [Tag Utils (标签逻辑)](#tag-utils-标签逻辑)
- [ID Helpers (ID 转换)](#id-helpers-id-转换)
- [Server Sanitize (服务端清洗)](#server-sanitize-服务端清洗)
- [IndexNow (SEO 提交)](#indexnow-seo-提交)

---

## Content Utils (内容处理)

文件: `utils/contentUtils.ts`

主要用于处理文章内容的字符串操作，包括HTML清洗、标题剥离和AI字段格式化。

- **`removeEmptyParagraphs(html: string): string`**
  - 移除内容中的空段落（如 `<p>&nbsp;</p>`），减少页面留白，提升阅读体验。
  - **Regex**: `/ <p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi`

- **`stripTags(html: string): string`**
  - **客户端安全**：去除字符串中的所有 HTML 标签。
  - 用途：生成 Meta Description、页面 Title 或提取纯文本预览。

- **`stripLeadingTitle(contentHtml: string, title: string): string`**
  - 智能移除文章开头重复的标题。
  - 解决 RSS 源常把标题作为第一行内容（或 H1）导致详情页标题重复出现的问题。

- **`cleanAIContent(text: string): string`**
  - **AI 字段清洗**：专门用于处理 Supabase 返回的 AI 字段（如 highlights, tldr）。
  - 作用：识别并移除 JSON 数组包裹（如 `["内容..."]` -> `内容...`），确保前端显示为干净的文本。

---

## Date Utils (日期处理)

文件: `utils/dateUtils.ts`

处理与上海时间（CST, UTC+8）相关的日期转换逻辑，确保服务端与客户端时间一致。

- **`getArticleTimeSlot(dateString: string): TimeSlot`**
  - 将 ISO 时间字符串转换为时段（Morning/Afternoon/Evening）。
  - **规则**:
    - Morning: 00:00 - 11:59
    - Afternoon: 12:00 - 18:59
    - Evening: 19:00 - 23:59 (上海时间)

- **`getTodayInShanghai(): string`**
  - 获取当前上海日期的字符串格式 `YYYY-MM-DD`。
  - 用于 SSR 默认展示 "今天" 的数据。

---

## Image Utils (图片处理)

文件: `utils/imageUtils.ts`

复杂的图片缓存与优化管道，负责简报头图的生成与管理。

- **`resolveBriefingImage(date: string): Promise<string>`**
  - **核心逻辑**:
    1.  **构建优化**: 识别 CI/Build 环境，跳过下载直接返回占位符 (避免构建超时)。
    2.  **缓存优先**: 检查 Supabase Storage (`public-assets/daily-covers`) 是否已有当日图片。
    3.  **Cache Aside**: 如果没有，从 Picsum 获取随机高清图 -> 上传至 Supabase -> 返回永久链接。
    4.  **自动清理**: 上传后异步触发过期图片清理。
  - **优势**: 消除 302 跳转，提供稳定的 CDN 访问，支持 Next.js Image 优化。

---

## Color Utils (颜色生成)

文件: `utils/colorUtils.ts`

基于字符串哈希的确定性颜色生成器，用于标签和 UI 装饰。

- **`getRandomColorClass(key: string): string`**
  - 输入任何字符串（如标签名），返回一个固定的 Tailwind 颜色类组合（如 `bg-blue-100 text-blue-800`）。
  - 保证同一个标签在任何地方颜色一致。

- **`getRandomGradient(key: string): string`**
  - 生成确定性的 Tailwind 渐变背景类（如 `from-rose-400 via-fuchsia-500 ...`）。
  - 用于生成的默认封面或装饰性背景。

---

## Tag Utils (标签逻辑)

文件: `utils/tagUtils.ts`

负责纯前端的标签状态管理与计数逻辑。

- **`calculateNewAvailableTags(...)`**
  - **核心算法**: 纯函数。根据文章的新旧标签列表，计算全局 "Available Filters" 列表中标签计数的变化。
  - 支持：新增标签（自动插入列表）、计数增加、计数减少（减至0时不移除，仅置灰）。
  - 用途：Zustand Store 中的乐观更新 (Optimistic UI)。

- **`isUserTag(tagId: string): boolean`**
  - 区分用户自定义标签和系统标签（过滤掉 Google Reader / FreshRSS 的内部状态标签）。

---

## ID Helpers (ID 转换)

文件: `utils/idHelpers.ts`

处理 RSS 复杂的 ID 格式与 URL 友好的短 ID 之间的转换。

- **`toShortId(fullId: string): string`**
  - 将长 ID（如 `tag:google.com,2005:reader/item/...`）转换为短哈希用于 URL。

- **`toFullId(shortId: string): string`**
  - 逆向操作，尝试还原用于 API 查询的 ID。

---

## Server Sanitize (服务端清洗)

文件: `utils/serverSanitize.ts`

- **`sanitizeHtml(html: string): string`**
  - **Sever-Side Only**: 封装了 `sanitize-html` 库。
  - **白名单机制**: 严格限制允许的标签（`iframe`, `img`, `h1-h6` 等）和属性。
  - 用途：在数据获取层直接清洗文章 HTML，防止 XSS，并减轻客户端 Bundle 体积。

---

## IndexNow (SEO 提交)

文件: `utils/indexnow.ts`

- **`submitUrlsToIndexNow(urls: string[])`**
  - 将 URL 列表提交给 Bing/IndexNow API，加速搜索引擎收录。
  - 通常在 Sitemap 生成或文章发布后调用。
