# 共享基础设施与全局状态 (Shared Infra & UI State)

本文档详细介绍了全站共享的 UI 状态管理、外部客户端库以及公共工具函数。

## 1. 共享 Store

### UI Store

文件: `src/shared/store/uiStore.ts`

管理客户端交互状态（模态框、过滤器、侧边栏、主题）。

- **`activeFilter`**: 当前视图筛选条件。
- **`verdictFilter`**: 同步全站的文章类型筛选（新闻/洞察）。
- **响应式控制**: `isMobileOpen`, `isDesktopCollapsed`。

### Toast Store

文件: `src/shared/store/toastStore.ts`

全局指令式通知系统。

---

## 2. 外部基础设施 (Infrastructure)

- **Supabase Client**: `src/shared/infrastructure/supabase.ts`
- **FreshRSS Client**: `src/shared/infrastructure/freshrss.ts`

---

## 3. 公共工具库 (Shared Utils)

### 内容处理 (`contentUtils.ts`)

- `removeEmptyParagraphs`: 移除空段落。
- `cleanAIContent`: 清洗 Supabase 返回的 AI 原始字段。

### 视觉与 UI (`imageUtils.ts`, `colorUtils.ts`)

- **图片代理**: 负责简报头图的持久化缓存。
- **颜色哈希**: 为标签提供唯一且确定的确定性颜色。

### SEO 与收录 (`indexnow.ts`)

- 集成 IndexNow API，实现新内容发布后的即时推送。
