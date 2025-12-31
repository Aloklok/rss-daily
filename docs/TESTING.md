# 测试指南

本项目采用 **双层测试金字塔 (Two-Layer Testing Pyramid)** 策略，结合 Vitest 和 Playwright，旨在确保从底层业务逻辑到顶层用户流程的全面稳定性。

## 1. 测试体系概览

| 层级             | 工具       | 关注点                                 | 运行频率          | 覆盖范围                   |
| :--------------- | :--------- | :------------------------------------- | :---------------- | :------------------------- |
| **端到端 (E2E)** | Playwright | 真实浏览器交互、集成流程、视觉回归     | CI (Pull Request) | 核心用户路径 (18 Tests)    |
| **单元/集成**    | Vitest     | 业务逻辑、状态管理、工具函数、边界情况 | Pre-commit        | 工具函数 > 80%, 核心 Store |

---

## 2. 单元测试

侧重于**高价值、高风险**的逻辑覆盖，运行速度极快。

### 核心覆盖区域

| 模块类型           | 测试重点                                   | 状态    | 关键文件示例                               |
| :----------------- | :----------------------------------------- | :------ | :----------------------------------------- |
| **Utils (工具库)** | HTML 清洗 pipeline, 日期格式化, 正则匹配   | ✅ 完成 | `lib/server/__tests__/dataFetcher.test.ts` |
| **Stores (状态)**  | 乐观更新 UI, 异步 Admin 检查, 状态回滚     | ✅ 完成 | `store/__tests__/uiStore.test.ts`          |
| **Server (数据)**  | Fetch 降级逻辑, 超时熔断 (10s), 跨时区计算 | ✅ 完成 | `dataFetcher.test.ts`                      |

### 运行命令

```bash
npm run test           # 运行所有单元测试
npm run test:coverage  # 生成覆盖率报告 (coverage/index.html)
npm run test:report    # 生成静态 HTML 报告 (html/index.html)
```

---

## 3. 端到端测试 (E2E Testing)

使用 Playwright 在真实浏览器 (Chromium, Firefox, Mobile Chrome) 中模拟用户操作，涵盖了应用的**生命线功能**。

### 当前覆盖范围 (18 Verified Tests)

1.  **核心阅读体验 (`article.spec.ts`)**:
    - **文章详情**: 点击卡片 -> 模态框弹出 -> API 数据加载 -> 内容渲染。
    - **Mock 策略**: 拦截 `/api/briefings` 和 `/api/articles`，返回确定性的 Mock 数据。
      - **数据源**: `e2e/mocks/data.ts` (包含真实抓取的 API 样本，用于验证 Tags/Folder 结构)。

2.  **导航与管理 (`sidebar.spec.ts`)**:
    - **侧边栏交互**: 桌面端折叠/展开，移动端汉堡菜单手势。
    - **维度切换**: "日历" (按日期浏览) vs "分类" (按 Topic 浏览) 的 Tab 切换。
    - **管理员搜索**: 模拟 Admin 登录 (Cookie注入) -> 输入关键词 -> URL 跳转 (`?filter=search`) -> 结果展示。

3.  **页面展示与布局 (`home.spec.ts`)**:
    - **首页渲染**: 标题、Logo、核心组件可见性。
    - **时段筛选**: 切换 "早/午/晚" 时段，验证列表刷新。
    - **响应式**: 验证 Mobile View下的布局适配。

### 运行命令

```bash
# 运行完整测试套件 (在本地如果不带参数会启动所有浏览器，较慢)
npm run test:e2e

# 仅运行特定文件 (推荐调试用)
pnpm exec playwright test e2e/tests/sidebar.spec.ts

4.  **首页交互与筛选 (`homepage-interactions.spec.ts`)**:
    - **加载稳定性**: 验证首页默认选中正确时段且无闪烁。
    - **多维筛选**: 验证 [时段] + [类型] (例如：中午 + 洞察) 的组合筛选准确性。
    - **批量操作**: 验证 "Mark All as Read" 仅针对当前筛选结果生效 (通过 Mock API 拦截验证 Payload)。
```

### E2E 最佳实践 (针对本项目环境)

由于项目采用 SSR (服务端渲染) 优化且在本地开发环境下存在频繁重绘，编写 E2E 测试时应遵循以下准则以避免 **Timeout** 和 **Flakiness**:

1.  **处理 SSR 优化与 API 拦截**:
    - **现象**: 当页面已包含 SSR 数据时，客户端可能跳过 API 请求。
    - **策略**: 使用未来日期（如 `/date/2099-12-31`）访问，强制 SSR 返回空数据，从而“诱导”客户端发起 API 请求，确保拦截器 (`waitForResponse`) 生效。

2.  **应对响应式组件的 DOM 复用**:
    - **现象**: 由于 Mobile 和 Desktop 副本共存，Playwright 可能会找到多个匹配（其中一个可能是隐藏的），导致 `strict mode` 报错或选中了不可点击的元素。
    - **策略**: 始终在定位器后链式调用 `.filter({ visible: true }).first()`。

3.  **开发环境下的动作稳定性**:
    - **现象**: `next dev` 模式下的组件重绘会导致原生 `.click()` 动作在布局抖动时判定失败。
    - **策略**:
      - 使用 `click({ force: true })` 强制触发。
      - 在关键状态变更点击后，增加 `await page.waitForTimeout(2000)` 给 Zustand 状态同步和 DOM 重刷留出缓冲。
      - 为断言增加显式超时，例如 `expect(...).toBeVisible({ timeout: 15000 })`。

4.  **避免 `networkidle`**:
    - **建议**: 尽量使用 `waitUntil: 'domcontentloaded'` 或默认状态。在包含第三方分析脚本（Analytics）的环境下，`networkidle` 可能导致无限期挂起直到 60s 超时。

---

---

## 4. CI/CD 集成策略

为了平衡开发效率与代码质量，我们实施了 **"快慢分离"** 的自动化策略。

### 本地开发 (Husky + Lint-staged)

- **触发时机**: `git commit`
- **执行任务**:
  - ❌ **不运行** E2E 测试 (太慢)。
  - ✅ **运行** Lint (ESLint)。
  - ✅ **运行** Format (Prettier)。
  - ✅ **运行** Type Check (TSC)。
  - _(可选)_ 运行受影响文件的单元测试。

### 云端流水线 (GitHub Actions)

- **触发时机**: `push main` 或 `Pull Request`
- **配置文件**: `.github/workflows/ci.yml`
- **流程**:
  1.  **Fast Checks Job**: 并行运行 Lint, Type Check, Unit Tests。
  2.  **E2E Job**: **仅当** Fast Checks 通过后，启动 Playwright 容器，并发运行所有 E2E 测试。
