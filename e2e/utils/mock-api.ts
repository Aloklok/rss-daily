import { Page } from '@playwright/test';
import { MOCK_ARTICLE, MOCK_ARTICLES_POOL } from '../mocks/data';

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
        const slot = urlObj.searchParams.get('slot');
        const allArticles = Object.values(MOCK_ARTICLES_POOL);
        console.log(
          `[MockAPI] /api/briefings request. Slot: ${slot}, IDs requested: ${urlObj.searchParams.getAll('articleIds')}`,
        );

        // 如果明确请求特定的 ID 集合 (e.g. 详情页刷新)
        if (urlObj.searchParams.has('articleIds')) {
          const requestedIds = urlObj.searchParams.getAll('articleIds');
          const response: Record<string, any> = {};

          requestedIds.forEach((id) => {
            // 尝试在 Pool 中查找，找不到则回退到默认
            const found = allArticles.find((a) => a.id === id) || MOCK_ARTICLE;
            response[id] = { ...found, id };
          });

          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
          });
        }

        // 常规列表请求：根据 Slot 过滤
        let filteredArticles = allArticles;
        if (slot) {
          // 简单的过滤逻辑：假设我们的 Mock ID 包含 slot 名称 (e.g. 'id-morning-insight')
          // 或者根据 published 时间判断，但用 ID 更稳健
          filteredArticles = allArticles.filter((a) => a.id.includes(slot));
        }

        // 按 Section 分组构造响应
        const jsonResponse: Record<string, any[]> = {
          深度知识与洞察: [],
          时事新闻与更新: [],
          常规更新: [],
        };

        filteredArticles.forEach((article) => {
          const section = article.briefingSection || '常规更新';
          if (!jsonResponse[section]) jsonResponse[section] = [];
          jsonResponse[section].push(article);
        });

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(jsonResponse),
        });
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
      if (pathname === '/api/auth/status') {
        const headers = route.request().headers();
        const cookie = headers['cookie'] || '';
        const isAdmin = cookie.includes('site_token=test-admin-token');

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ isAdmin }),
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
