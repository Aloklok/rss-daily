import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';

test.describe('核心流程冒烟测试 (存活验证)', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台错误，捕获水合失败等运行时异常
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // 排除掉一些已知的可忽略错误：图标加载失败等非业务逻辑错误
        if (text.includes('__cf_bm') || text.includes('Cookie') || text.includes('favicon.ico')) {
          return;
        }
        throw new Error(`[Browser Console Error]: ${text}`);
      }
    });

    await mockFullApp(page);
  });

  test('首页 SSR 存活检查', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/RSS Briefing Hub/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('日期页面路由检查', async ({ page }) => {
    await page.goto('/date/2025-01-01', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/date\/2025-01-01/);
    // 只要页面主体出现了，路由就算通了
    await expect(page.locator('main')).toBeVisible();
  });

  // '全部已读交互验证' logic is now covered by components/features/briefing/__tests__/MarkAllRead.test.tsx
});
