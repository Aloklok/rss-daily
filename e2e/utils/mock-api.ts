import { Page } from '@playwright/test';
import { MOCK_ARTICLE } from '../mocks/data';

/**
 * 模拟完整的应用 API
 * 确保所有 /api/ 请求都由 Mock 处理。
 */
export async function mockFullApp(page: Page) {
  // 拦截分析脚本
  await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, body: '' }));

  // 全球拦截器
  await page.route(
    (url) => url.pathname.includes('/api/'),
    async (route) => {
      const url = route.request().url();
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const method = route.request().method();

      // 详细日志
      console.log(`[MOCK] Intercepted ${method} ${pathname} ${urlObj.search}`);

      // 1. 简报 (GET) /api/briefings
      if (pathname === '/api/briefings') {
        // 兜底：无论请求什么日期或时段，都返回我们的 MOCK_ARTICLE，确保页面不为空
        if (urlObj.searchParams.has('articleIds')) {
          const requestedIds = urlObj.searchParams.getAll('articleIds');
          const response: Record<string, any> = {};
          requestedIds.forEach((id) => {
            response[id] = { ...MOCK_ARTICLE, id: id };
          });
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
          });
        } else {
          // 返回完整的分组数据，包含分类好的 Mock
          const jsonResponse = {
            [MOCK_ARTICLE.briefingSection]: [MOCK_ARTICLE],
            必知要闻: [],
            常规更新: [],
          };
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(jsonResponse),
          });
        }
      }

      // 2. 文章内容 (POST) /api/articles
      if (pathname === '/api/articles' && method === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            title: MOCK_ARTICLE.title,
            content: MOCK_ARTICLE.content,
            source: MOCK_ARTICLE.sourceName,
          }),
        });
      }

      // 3. 状态 (POST) /api/articles/state
      if (pathname === '/api/articles/state') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ [MOCK_ARTICLE.id]: [] }),
        });
      }

      // 4. 元数据
      if (pathname === '/api/meta/available-dates') {
        const today = new Date().toISOString().split('T')[0];
        return route.fulfill({ status: 200, body: JSON.stringify(['2025-01-01', today]) });
      }
      if (pathname === '/api/meta/tags') {
        return route.fulfill({ status: 200, body: JSON.stringify({ categories: [], tags: [] }) });
      }
      if (pathname === '/api/daily-statuses') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ['2025-01-01']: true }), // Ensure some status exists
        });
      }
      if (pathname === '/api/auth/check') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isAdmin: true }),
        });
      }
      if (pathname === '/api/articles/search') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            articles: [MOCK_ARTICLE],
            pagination: { total: 1, page: 1, pageSize: 20 },
          }),
        });
      }

      // 兜底拦截
      return route.fulfill({ status: 404, body: 'Not Found' });
    },
  );
}
