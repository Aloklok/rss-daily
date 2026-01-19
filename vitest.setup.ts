import { beforeAll, afterAll, vi } from 'vitest';
import { setupWorker } from 'msw/browser';
import { handlers } from './tests/e2e/mocks/handlers';
import '@testing-library/jest-dom';

// 在浏览器环境中启动 MSW
if (typeof window !== 'undefined') {
  const worker = setupWorker(...handlers);

  beforeAll(async () => {
    // 启动 MSW 模拟
    await worker.start({
      onUnhandledRequest: 'bypass',
    });
  });

  afterAll(() => {
    worker.stop();
  });

  // 通用 Mock：Next.js Navigation
  // 解决 Sidebar 等组件依赖 useRouter 的问题
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    __esModule: true,
  }));
  // 全局：Hydration 错误检测
  // 监听 console.error，一旦发现 "Hydration failed" 或 "hydration mismatch" 直接让测试失败
  // 这能有效捕获时区不匹配、随机数不匹配等导致的 SSR 问题
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('Hydration failed') || msg.includes('hydration mismatch')) {
        throw new Error(`[Hydration Error Detected]: ${msg}`);
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });
}
