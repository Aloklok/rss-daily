import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';

test.describe('文章详情路由测试', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullApp(page);
  });

  test('文章详情页直接访问测试', async ({ page }) => {
    // 验证直接访问 /article/[id] 路由是否正常渲染 (SSR/Layout)
    // 逻辑交互由 Vitest Browser 覆盖
    await page.goto('/article/id-morning-insight');

    // 验证标题存在
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();

    console.log('[E2E] Article Direct Route Passed');
  });
});
