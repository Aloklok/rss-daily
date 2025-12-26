# 测试指南 (Testing Guide)

本项目使用 **Vitest** 作为单元测试框架，旨在确保核心业务逻辑、工具函数和状态管理的稳定性。

## 1. 快速开始

### 运行所有测试

```bash
npm run test
```

### 运行覆盖率报告

```bash
npm run test:coverage
```

报告生成后，可以在 `coverage/index.html` 查看这视化的代码覆盖详情。

## 2. 测试策略 (Phase 1)

目前我们完成了第一阶段的单元测试建设，侧重于**高价值、高风险**的逻辑覆盖。

| 模块类型           | 测试重点                                | 覆盖率目标   | 是否已完成 |
| :----------------- | :-------------------------------------- | :----------- | :--------- |
| **Utils (工具库)** | 所有纯函数 (ID转换, 日期处理, 正则清洗) | > 80%        | ✅         |
| **Stores (状态)**  | 复杂交互逻辑 (收藏, 已读, Filter重置)   | 核心路径覆盖 | ✅         |
| **Server (数据)**  | 降级逻辑 (Fallback), 跨时区计算         | 核心路径覆盖 | ✅         |

### 已排除的文件

为了保证覆盖率报告的真实性和信噪比，我们排除了以下无需测试的文件：

- 纯 API 包装器 (`apiUtils.ts`, `gemini.ts`)
- 外部服务集成 (`imageUtils.ts`, `indexnow.ts`)
- 纯 UI 辅助函数 (`colorUtils.ts`, `toastStore.ts`)
- 类型定义与配置文件

## 3. 编写新测试

测试文件通常与源文件同级，位于 `__tests__` 目录下。

### 示例: 纯函数测试

```typescript
import { result } from '../someUtils';

describe('someUtils', () => {
  it('应当正确处理边界情况', () => {
    expect(result).toBe(true);
  });
});
```

### 示例: 包含 Mock 的测试

如果需要 Mock 外部依赖 (如 Supabase 或 fetch)，请参考 `lib/server/__tests__/dataFetcher.test.ts`。

```typescript
import { vi } from 'vitest';

vi.mock('../apiUtils', () => ({
  getSupabaseClient: vi.fn(),
}));
```

## 4. 深度逻辑覆盖 (Phase 2)

针对核心业务逻辑，我们进行了深度覆盖 (Deep Logic Coverage)：

- **🛡️ DataFetcher**:
  - **超时熔断**: 模拟 Supabase 10s 无响应，验证系统降级能力。
  - **清洗管线**: 验证 `HTML -> Text` 清洗链的严格执行顺序。
  - **标签逻辑**: 验证 `getAvailableFilters` 对系统标签的过滤和排序。
- **🧠 UIStore**:
  - **异步副作用**: 验证 `checkAdminStatus` 在网络异常下的状态回滚。

## 5. 下一步计划 (Phase 3)

- [ ] 引入 `@vitest/browser` 和 Playwright。
- [ ] 针对 React 组件 (`components/`) 进行真实浏览器渲染测试。
