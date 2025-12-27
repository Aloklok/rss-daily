import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';

test.describe('侧边栏导航与功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullApp(page);
  });

  test('桌面端: 验证侧边栏基础导航', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // 1. 侧边栏可见
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // 2. 验证 Logo
    await expect(page.getByAltText('Logo')).toBeVisible();

    // 3. 验证标签切换 ("分类" / "日历")
    const filtersTab = page.getByRole('button', { name: '分类' });
    const calendarTab = page.getByRole('button', { name: '日历' });

    await expect(filtersTab).toBeVisible();
    await expect(calendarTab).toBeVisible();

    // 切换到日历
    await calendarTab.click();
    // 验证日历内容可见 (检查隐藏的 select 或可见的月份显示容器)
    // 使用 getByLabel 对应 select 的 aria-label="选择月份"
    await expect(page.getByLabel('选择月份')).toBeAttached();

    // 切换回分类
    await filtersTab.click();

    // 4. 验证“按订阅源浏览”按钮
    const sourceButton = page.getByRole('button', { name: '按订阅源浏览' });
    await expect(sourceButton).toBeVisible();
    await sourceButton.click();
    await expect(page).toHaveURL(/\/sources/);
  });

  test('管理员权限: 搜索功能验证', async ({ context, page }) => {
    // 直接注入 Cookie 模拟登录状态，绕过 middleware/proxy 的复杂性
    await context.addCookies([
      {
        name: 'site_token',
        value: 'test-admin-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.goto('/');

    // 确保在首页
    await expect(page).toHaveURL(/\/$/);

    // 搜索框应出现
    const searchInput = page.getByPlaceholder('搜索简报关键词...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 执行搜索
    await searchInput.fill('Next.js');
    await searchInput.press('Enter');

    // Debug: Log URL to see if it changes at all
    console.log('URL after search:', page.url());

    // 验证 URL 跳转 (使用查询参数)
    await expect(page).toHaveURL(/filter=search&value=Next.js/, { timeout: 10000 });
  });

  test('移动端: 侧边栏状态切换', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // 1. 初始状态下侧边栏及其内容不可见 (在视口外)
    const sourceButton = page.getByRole('button', { name: '按订阅源浏览' });
    await expect(sourceButton).not.toBeInViewport();

    // 2. 点击汉堡菜单
    const toggleButton = page.getByLabel('Toggle Mobile Sidebar');
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // 3. 侧边栏内容应可见
    await expect(sourceButton).toBeInViewport();

    // 4.再次点击关闭
    await toggleButton.click();
    await expect(sourceButton).not.toBeInViewport();
  });
});
