import { test, expect } from '@playwright/test';
import { mockFullApp } from '../utils/mock-api';

test.describe('侧边栏基础存活测试', () => {
  test.beforeEach(async ({ page }) => {
    await mockFullApp(page);
  });

  // '侧边栏在桌面端应显示' logic is now covered by components/layout/Sidebar/__tests__/SidebarVisibility.test.tsx
});

  // '搜索功能 URL 跳转检查' logic is now covered by components/layout/Sidebar/__tests__/Navigation.test.tsx
  // to avoid E2E timeouts and instability.
});
