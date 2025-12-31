import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';

test.describe('核心流程冒烟测试 (存活验证)', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullApp(page);
  });

  test('首页 SSR 存活检查', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RSS Briefing Hub/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('日期页面路由检查', async ({ page }) => {
    await page.goto('/date/2025-01-01');
    await expect(page).toHaveURL(/\/date\/2025-01-01/);
    // 只要页面主体出现了，路由就算通了
    await expect(page.locator('main')).toBeVisible();
  });

  // '全部已读交互验证' logic is now covered by components/features/briefing/__tests__/MarkAllRead.test.tsx
});
