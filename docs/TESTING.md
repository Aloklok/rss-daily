# 测试体系文档

本项目采用 **三层分域测试 (Three-Layer Functional Testing)** 策略。为了平衡 **Vibe Coding** 的开发节奏与系统稳定性，我们将测试按“功能域”划分为三个层级，并明确各层级的职责。

---

## 1. 核心功能域测试矩阵 & 命名规范 (Naming Convention)

### 📏 测试规范与语言

- **语言强制性**: 为了保持文档和业务理解的高度一致，**所有测试用例 (describe, it, test) 必须使用中文编写**。拒绝英文用例，除非是变量名或技术术语。

### 📏 测试文件命名规范

为了清晰区分测试职责，请严格遵守以下命名规则：

| 测试类型                       | 文件后缀     | 适用场景                      | 示例                         |
| :----------------------------- | :----------- | :---------------------------- | :--------------------------- |
| **逻辑单元测试 (Unit)**        | `*.test.ts`  | 纯函数、Hook 逻辑、Store 状态 | `dateUtils.test.ts`          |
| **组件集成测试 (Integration)** | `*.test.tsx` | React 组件渲染、交互验证      | `ArticleReaderView.test.tsx` |
| **回归测试 (Regression)**      | `*.test.tsx` | 针对特定复杂 Bug 的防护网     | `MainContentClient.test.tsx` |
| **端到端测试 (E2E)**           | `*.spec.ts`  | 完整用户流程 (Playwright)     | `smoke-home.spec.ts`         |

### 🔍 搜索与标签 (Search & Tags)

1. **关键词提取**：验证系统能否从复杂的非结构化文本中准确提取出核心标签。
2. **搜索输入交互**：验证搜索框输入内容后，URL 参数是否正确更新，且页面无需刷新即可响应。
3. **标签标准化**：验证同义但不同形的标签（如 "AI" 和 "Artificial Intelligence"）是否能被归一化处理。

### 📅 导航与布局 (Navigation & Layout)

25:
26: 1. **侧边栏状态同步**：验证在移动端点击菜单按钮时，侧边栏能否正确展开和收起，且遮罩层交互正常。
27: 2. **日期选中状态**：验证在日历中选择特定日期后，侧边栏对应日期项是否保持高亮选中状态。
28: 3. **响应式显示**：验证在桌面端侧边栏常驻显示，而在移动端默认隐藏并通过汉堡菜单触发。
29: 4. **文章卡片交互**：验证点击文章标题是否正确触发阅读模式弹窗。

### 📰 简报流与过滤 (Briefing & Filtering)

1. **时段筛选逻辑**：验证点击“早/午/晚”时段切换按钮后，列表是否严格只显示对应时间段的文章。
2. **全部已读交互**：验证"全部已读"按钮的状态（基于未读数）及点击后的 API 触发逻辑。
3. **数据映射准确性**：验证后端返回的原始文章数据，是否完整且正确地映射到了前端卡片的标题、来源和摘要字段。

### ❤️ 交互与状态 (Interaction & State)

1. **即时反馈 (Optimistic UI)**：验证点击“已读”或“收藏”按钮时，UI 图标是否立即改变颜色/状态，无需等待网络请求返回。
2. **主题切换持久化**：验证切换深色/浅色模式后，刷新页面或重新打开浏览器，主题设置是否依然保持。
3. **全局状态同步**：验证在不同页面间跳转时，用户的管理员身份状态和当前选中的文章 ID 是否保持一致。

### 📖 文章详情与安全 (Article View & Security)

1. **详情页完整渲染**：验证文章详情弹窗打开后，标题、正文、来源信息和 AI 生成的摘要/标签是否全部正确加载。
2. **XSS 安全过滤**：验证文章正文中包含的恶意脚本（如 `<script>` 标签）是否被自动清除，防止安全漏洞。
3. **外部链接处理**：验证文章内的外部链接点击后，是否在新标签页打开，且包含必要的安全属性 (`rel="noopener"`).

### 🛡️ 访问控制 (Access Control)

1. **公共用户视图**：验证未登录的普通用户访问时，文章卡片上**不显示**“收藏”、“打标签”和“重新生成简报”等管理专用按钮。
2. **管理员视图**：验证管理员登录后，上述所有管理按钮均可见且可交互。
3. **AI 助手权限**：验证非管理员用户界面完全不加载 AI 入口按钮及对话框组件（DOM 级移除），确保功能对普通用户不可见。
4. **后台路由保护**：验证非管理员用户即使能够加载 `BackfillPanel` 组件，也无法渲染任何内容（返回 null），防止组件误用导致权限泄露。

### 🛠️ 核心工具 (Core Utilities)

1. **ID 兼容性转换**：验证系统能否正确处理 FreshRSS 返回的长格式 ID，并将其转换为 URL 友好的短 ID。
2. **日期格式化**：验证不同时区的日期字符串能否被统一格式化为本地易读时间显示。
3. **断网容错**：验证在网络请求超时或失败时，系统是否显示友好的错误提示或骨架屏，而不是页面崩溃。

---

## 2. 开发避坑指南

### 🚫 禁止在 Browser 测试中引用 Node 模块

Vitest **Browser Mode** 运行在真实浏览器环境中。**严禁**在测试代码中引用 `path`, `fs`, `os` 等模块。

- _解决方案_: 所有的 Mock 数据必须通过标准的 `import` 导入。

### 🧩 必须 Mock Next.js 导航 Hooks

组件强依赖 `next/navigation`。在 `vitest.setup.ts` 中已全局 Mock 了 `useRouter` 等钩子。若组件报错 `useContext...null`，请检查 Mock 是否生效。

为了确保测试的高效运行且不报诡异错误，请遵循以下开发规范：

### 🧩 组件测试必须包裹 Providers

如果被测组件使用了 React Query (如 `useArticleContent`)，必须在测试中包裹 `QueryClientProvider`。

```tsx
const queryClient = createTestQueryClient();
render(
  <QueryClientProvider client={queryClient}>
    <YourComponent />
  </QueryClientProvider>,
);
```

### 🚫 禁止在 Browser 测试中引用 Node 模块

Vitest **Browser Mode** 运行在真实浏览器环境中。**严禁**在测试代码或被测的客户端组件中 import `path`, `fs`, `os` 等模块。

- _报错示例_: `Module "path" has been externalized...`
- _对策_:
  1. 所有的 Mock 数据必须通过标准的 ES Import 导入 `.ts`/`.json` 文件。
  2. 纯服务端逻辑（如 `serverSanitize.ts`）若包含 Node 依赖，必须在 `vitest.config.ts` 中通过 `exclude` 排除，或使用 `// @vitest-environment node` (仅限非 Browser 模式)。

### 📍 必须使用路径别名 (Path Alias)

**拒绝路径深渊！** 严禁使用 `../../../../` 这种脆弱的相对路径，这会导致重构困难且极易出错。

- _正确做法_: 始终使用 `@/` 开头。

  ```typescript
  // ✅ Good
  import ArticleCard from '@/domains/reading/components/article/BriefCard';

  // ❌ Bad
  import ArticleCard from '../../../../components/features/article/ArticleCard';
  ```

### 🧟 进程管理 (Process Hygiene)

Vitest 默认开启监听模式 (`Watch Mode`)。

- **One Process Rule**: 同一时间只允许运行**一个** `pnpm run test` 实例。
- **现象**: 如果发现电脑卡顿或测试行为诡异，请立即执行 `pkill -f vitest` 清理僵尸进程。
- **习惯**: 看完报错后，要么利用 Watch 模式自动重跑，要么 `q` 退出后再开新的，不要保留多个终端窗口挂着测试。

### 🧩 必须 Mock Next.js 导航 Hooks

Sidebar 等组件强依赖 `next/navigation`。在 `vitest.setup.ts` 中已全局 Mock 了 `useRouter` 等钩子。若组件报错 `useContext...null`，请检查 Mock 是否生效。

### 🌐 严禁直接改写 `global.fetch`

为了不破坏测试底层的通讯链路，请使用 **MSW (Mock Service Worker)** 在 `handlers.ts` 中进行路由拦截，严禁手动 `global.fetch = vi.fn()`。

### 💧 水合错误 (Hydration Mismatch) 自动检测

我们在 `vitest.setup.ts` 中集成了全局检测机制。

- **机制**: 自动监听 `console.error`。
- **行为**: 一旦发现输出包含 `Hydration failed` 或 `hydration mismatch`，测试将立即失败。
- **目的**: 杜绝因服务器/客户端时区不一致或随机数生成差异导致的隐性渲染 Bug。

### 🕸️ SSR 兼容性与 No-JS 抓取验证

针对 SEO 核心页面，我们需要确保在浏览器完全禁用 JavaScript 的情况下，爬虫依然能捕获关键链接。

- **工具**: 使用 `react-dom/server` 中的 `renderToString`。
- **策略**: 在 Vitest 环境中将组件渲染为纯 HTML 字符串，通过 `expect(html).toContain(...)` 验证关键的 `<a>` 标签和 `href` 属性。

### ⚡ 性能指标与 SSR 优化检测

为了防止性能无意识回退（如引入 `cookies()` 导致静态失效），可以通过以下方式自查：

1. **构建日志审计**:
   - 运行 `pnpm build`。
   - 检查控制台输出的路由列表。
   - **预期**: `/` (首页) 旁边必须出现 `○` (Static) 或 `●` (SSG) 符号，禁用 JS 的页面必须保持这种状态。
   - **异常**: 首页出现 `λ` (Dynamic) 符号，通常意味着 `RootLayout` 触发了 Dynamic Opt-out。
2. **首屏加载分析**:
   - 使用 Chrome DevTools 的 Network 面板。
   - 查看第一个 HTML 文档请求的 `TTFB` (Time to First Byte)。
   - **预期**: 对于静态/ISR 页面，TTFB 应在 100ms 以内（由 Vercel Edge 提供）。
   - **异常**: TTFB 超过 500ms，说明服务端在运行时执行了阻塞逻辑（如等待 Auth API）。

---

## 3. CI 环境与 SSR Mock 策略 (CI Mocking Strategy)

为了解决端到端测试在 CI 环境（如 GitHub Actions）中因网络波动或外部 API (Supabase/FreshRSS) 不可用导致的超时问题，我们实施了 **服务级全量 Mock**。

### 📍 CI 模式触发机制

当环境变量 `process.env.CI` 为 `true` 时，`src/domains/reading/services.ts` 中的所有外部调用将自动短路并返回预定义的模拟数据。

- **优势**:
  1. **极致速度**: SSR 渲染从秒级（甚至超时）缩短至毫秒级。
  2. **确定性**: 测试不再受生产数据库内容或 API 额度限制。
  3. **稳定性**: 避免了 E2E 测试中频繁出现的 `net::ERR_ABORTED` 或 `Test timeout`。

### 📍 本地运行 CI 模拟

如果你想在本地验证 CI 环境下的渲染逻辑，请使用：

```bash
CI=true pnpm test:e2e
```

---

## 4. 测试最佳实践 (Best Practices)

### 📊 优先使用标准化 Mock 数据 (Standardized Mock Data)

**原则**：为了确保测试的一致性和维护性，严禁在测试文件中自行构造复杂的文章对象。

- **统一入口**: 所有的文章 Mock 数据必须从 `@/e2e/mocks/data.ts` 导入。
- **MOCK_ARTICLE**: 适用于大多数单一文章展示和交互测试。
- **MOCK_ARTICLES_POOL**: 包含不同时间段（早/中/晚）和类型（深度洞察/时事新闻）的文章，适用于列表筛选测试。

**为什么必须这样做？**

1. **结构同步**: 真实的文章对象包含数十个字段（summary, highlights, critiques 等），自行构造极易遗漏关键字段导致渲染或逻辑错误。
2. **场景完备**: `e2e/mocks/data.ts` 已平衡了 ID 格式、日期偏移和分类逻辑，能更好地模拟真实业务。

---

## 4. 技术避坑教训 (Lessons Learned)

### 🚨 CI 环境下的 Vitest Mock 失效 (Component rendering error)

**问题现象**: 本地测试 100% 通过，但在 GitHub Actions (CI) 环境中报错：`Error: Element type is invalid: expected a string... but got: object`.

**原因分析**:

- 在 CI 这种更严格的 Node.js/ESM 环境下，Vitest 对自动 Mock 的处理可能无法正确识别默认导出 (Default Export)。
- React 在渲染时收到的不是一个组件函数，而是一个包含 `default` 属性的包装对象。

**解决方案**:
在 `vi.mock` 返回的对象中显式增加 `__esModule: true` 声明：

```typescript
vi.mock('next/script', () => ({
  default: ({ id }: any) => <div data-testid={id} />,
  __esModule: true, // 核心修复：强制声明为 ES 模块
}));
```

### 🚨 测试隔离与初始化 (Mock Data Prioritization)

**教训**: 在编写 `ArticleActions.test.tsx` 时，初版使用了手动构造的 `sampleArticle`。这导致了与业务逻辑的偏离（如 ID 格式不统一），并增加了维护负担。
**反思**: 在进行任何功能域测试前，必须首先检索 `e2e/mocks` 或 `__mocks__` 目录，优先复用已有的“事实来源”数据。

### 🚨 警惕局部状态导致的全局不同步 (State Sync Desync)

**问题现象**: “全部已读”按钮在应用了“新闻/洞察”过滤器后，依然会标记不可见的文章。
**原因分析**:

- 过滤器使用了组件局部 `useState` 维护状态。
- 操作按钮（位于 `FloatingActionButtons`）通过 `uiStore` 读取状态。
- **结果**: 交互组件与操作组件产生“感知断层”。
  **解决方案**:
- 对于影响多个独立组件（如 Filter 影响 Action Button）的状态，**必须**提升至 Zustand Global Store。
- **测试规避**: 编写集成测试（如 `MainContentClient.test.tsx`）时，除了验证渲染结果，还必须通过 `expect(useUIStore.getState()....)` 显式验证全局状态是否同步更新。

---

---

## 5. 自动化与提交规范 (Automation & Pre-commit)

我们配置了 **Husky** + **Pro-commit** 钩子，确保每一行代码在提交前都经过质量门禁。

### 提交前自动检查 (Pre-commit)

当你执行 `git commit` 时，系统会自动触发：

1. **TSC 类型检查**: 全量检查是否存在 TypeScript 类型错误 (防止 CI 报错)。
2. **Lint-staged**: 仅针对本次暂存区 (`staged`) 的文件。
3. **ESLint & Prettier**: 自动修复格式问题。
   - _注意_: 单元测试 (`Vitest`) 已移至 CI 流水线运行，以保证本地提交的极致速度。

---

## 6. 常用命令速查

- **本地可视化开发**: `vitest --ui` (推荐 Vibe Coding 模式)
- **单元与集成测试**: `pnpm run test` (Vitest 持续监听)
- **CI 模式冒烟测试**: `CI=true pnpm test:e2e` (使用 Mock 数据，稳定极速)
- **全栈真机测试**: `pnpm run test:e2e` (连接真实后端，本地调试用)
- **生产环境验证**: `pnpm build` -> `pnpm run start` -> `CI=true pnpm test:e2e`
