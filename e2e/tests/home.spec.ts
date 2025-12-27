import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';

test.describe('首页与简报展示测试', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullApp(page);
  });

  test('验证首页基本元素与时段切换', async ({ page }) => {
    console.log('[TEST] Navigating to home');
    await page.goto('/', { waitUntil: 'networkidle' });

    // 1. 标题校验
    await expect(page).toHaveTitle(/RSS Briefing Hub/);

    // 2. 检查主区域可见
    await expect(page.locator('main')).toBeVisible();

    // 3. 验证时段按钮并点击
    // 默认可能没有选中任何时段 (如果是全天视图)
    const afternoonButton = page.getByTitle('中午');
    const eveningButton = page.getByTitle('晚上');

    await expect(afternoonButton).toBeVisible();
    await expect(eveningButton).toBeVisible();

    console.log('[TEST] Clicking Afternoon Slot');
    await afternoonButton.click();

    // 页面应显示加载状态或更新内容 (Mock 会拦截 /api/briefings?slot=afternoon)
    // 由于我们 Mock 总是返回数据，所以应该能看到内容
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
  });

  test('验证洞察与新闻过滤器', async ({ page }) => {
    await page.goto('/date/2025-01-01', { waitUntil: 'networkidle' });

    const insightFilter = page.getByTitle('深度知识与洞察');
    const newsFilter = page.getByTitle('时事新闻与更新');

    await expect(insightFilter).toBeVisible();
    await expect(newsFilter).toBeVisible();

    console.log('[TEST] Clicking Insight Filter');
    await insightFilter.click();

    // 这里不验证数据过滤的准确性 (由单元测试负责),
    // 仅验证 UI 允许点击且未崩溃
    await expect(insightFilter).toHaveClass(/bg-white/); // 选中状态样式
  });
});
