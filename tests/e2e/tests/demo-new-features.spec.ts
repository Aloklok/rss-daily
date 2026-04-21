import { test, expect } from '@playwright/test';

// 演示：一个支持 1.59.1 await using 语法的 Disposable 资源
// 即使你现在不需要，未来如果你有复杂的设置清理逻辑（如临时账号、DB 状态），这个语法会让代码非常整洁。
class TestResource {
  constructor(public id: string) {
    console.log(`[Demo] 资源 ${id} 已分配`);
  }

  // 实现 AsyncDisposable 接口
  async [Symbol.asyncDispose]() {
    console.log(`[Demo] 资源 ${this.id} 已在测试结束时自动释放 (await using)`);
    // 在这里写清理逻辑，比如删除临时数据
  }
}

test.describe('Playwright 1.59.1 新特性演示', () => {
  test('演示：使用 await using 自动管理资源', async ({ page }) => {
    // 使用新的 await using 语法
    // 这个资源会在当前 scope 结束时自动调用 [Symbol.asyncDispose]
    await using _resource = new TestResource('temp-article-data');
    
    console.log('[Demo] 正在执行测试逻辑...');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // 验证页面基础内容
    await expect(page.locator('main')).toBeVisible();
    
    // 无需手动 call resource.dispose()
  });

  test('演示：Screencast 视觉辅助 (即使你现在不用，失败时它非常有用)', async ({ page }) => {
    // 即使你不在 package.json 里配置录制，你也可以在特定测试中开启
    // 配合 showActions 可以直观看到 Agent/测试点击了哪里
    if (process.env.CI) {
      // CI 环境下简单录制
      await page.screencast.start({ path: 'reports/demo-actions.webm' });
      await page.screencast.showActions({ position: 'top-right' });
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const main = page.locator('main');
    await expect(main).toBeVisible();

    if (process.env.CI) {
      await page.screencast.stop();
    }
  });
});
