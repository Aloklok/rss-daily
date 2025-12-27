import { test, expect } from '@playwright/test';
import { MOCK_ARTICLE } from '../mocks/data';
import { mockFullApp } from '../utils/mock-api';

test.describe('文章详情页测试', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all API calls with mock data
    await mockFullApp(page);
  });

  test('点击卡片应加载文章详情', async ({ page }) => {
    // 1. 访问日期页面
    console.log('[TEST] Navigating to date page');
    await page.goto('/date/2025-01-01', { waitUntil: 'networkidle' });

    // 2. 点击“早上”按钮触发客户端获取 (因为我们 Mock 的是客户端 API)
    console.log('[TEST] Clicking Morning Slot button');
    const morningButton = page.getByTitle('早上');
    await expect(morningButton).toBeVisible({ timeout: 10000 });
    await morningButton.click();

    // 3. 验证文章卡片已渲染 (使用稳定 TestID)
    console.log('[TEST] Waiting for article card to appear');
    const articleCard = page.getByTestId('article-card');
    await expect(articleCard).toBeVisible({ timeout: 15000 });

    // 验证标题匹配 (确保不是旧缓存或错误数据)
    await expect(articleCard).toContainText(MOCK_ARTICLE.title.substring(0, 10));

    // 4. 点击文章标题 (或链接)
    console.log('[TEST] Clicking article link');
    const articleLink = articleCard.getByTestId(`article-link-${MOCK_ARTICLE.id}`);
    await articleLink.click();

    // 5. 验证弹窗出现且内容正确
    console.log('[TEST] Verifying modal content');
    const modal = page.getByTestId('article-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // 验证 Mock 数据中的标题出现在 Modal 中
    await expect(modal).toContainText(MOCK_ARTICLE.title.substring(0, 10));

    // 验证内容已加载
    await expect(modal).toContainText('核心技术');

    console.log('[TEST] Article Modal Test Passed');
  });
});
