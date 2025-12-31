import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';
import { MOCK_ARTICLES_POOL } from '../mocks/data';

test.describe('首页交互与筛选逻辑测试', () => {
  // 增加超时时间以应对慢速开发环境
  test.setTimeout(60000);

  test.beforeEach(async ({ context, page }) => {
    // 注入 Admin Cookie 以显示 "Mark All Read" 按钮
    await context.addCookies([
      { name: 'site_token', value: 'test-admin-token', domain: '127.0.0.1', path: '/' },
    ]);

    // 拦截并 Mock 所有 API
    await mockFullApp(page);
  });

  test('1. 首页加载 (基本冒烟测试)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/RSS Briefing Hub/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('2. 多维筛选交互 (时段 + 类型)', async ({ page }) => {
    // 使用未来日期确保 SSR 为空，从而触发客户端 Mock
    await page.goto('/date/2099-12-31');

    // 1. 切换时段：中午
    await page.getByTitle('中午').click({ force: true });
    await page.waitForTimeout(2000);

    // 验证中午的文章出现，早上的消失
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.afternoon_insight.title).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.morning_insight.title).filter({ visible: true }).first(),
    ).toBeHidden({ timeout: 15000 });

    // 2. 过滤类型：深度洞察
    await page.getByTitle('深度知识与洞察').click({ force: true });
    await page.waitForTimeout(2000);

    // 验证：显示对应类型的文章，隐藏其他类型
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.afternoon_insight.title).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.afternoon_news.title).filter({ visible: true }).first(),
    ).toBeHidden({ timeout: 15000 });

    // 3. 切换类型：时事新闻
    await page.getByTitle('时事新闻与更新').click({ force: true });
    await page.waitForTimeout(2000);

    // 验证：显示新闻，隐藏洞察
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.afternoon_news.title).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.afternoon_insight.title).filter({ visible: true }).first(),
    ).toBeHidden({ timeout: 15000 });
  });

  test('3. “全部已读”精准性验证', async ({ page }) => {
    await page.goto('/date/2099-12-31');

    // 切换到“晚上”
    await page.getByTitle('晚上').click({ force: true });
    await page.waitForTimeout(2000);

    await expect(
      page.getByText(MOCK_ARTICLES_POOL.evening_insight.title).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });

    // 准备拦截请求
    const markReadRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/api/articles/state') && request.method() === 'POST',
    );

    // 点击“全部已读”
    const markAllBtn = page.getByLabel('Mark all as read');
    await expect(markAllBtn).toBeVisible({ timeout: 15000 });
    await markAllBtn.click({ force: true });

    const request = await markReadRequestPromise;
    const payload = await request.postDataJSON();
    const ids = payload.ids || payload.articleIds;

    // 验证 Payload: 应该只包含晚上可见的文章
    expect(ids).toContain(MOCK_ARTICLES_POOL.evening_insight.id);
    expect(ids).toContain(MOCK_ARTICLES_POOL.evening_news.id);
    // 不应该包含早上的
    expect(ids).not.toContain(MOCK_ARTICLES_POOL.morning_insight.id);
  });

  test('4. 日期页面的默认状态', async ({ page }) => {
    await page.goto('/date/2099-12-31');

    // 验证默认不选中时段 (全选状态)
    const morningBtn = page.getByTitle('早上');
    await expect(morningBtn).not.toHaveClass(/\bbg-white\b/);

    // 验证所有文章均可见
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.morning_insight.title).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(MOCK_ARTICLES_POOL.evening_news.title).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
