import { http, HttpResponse } from 'msw';
import { MOCK_ARTICLES_POOL, MOCK_FRESHRSS_TAG_LIST } from './data';

export const handlers = [
  // Mock available dates
  http.get('/api/meta/available-dates', () => {
    return HttpResponse.json(['2025-01-01', '2025-01-02']);
  }),

  // Mock tags
  http.get('/api/meta/tags', () => {
    return HttpResponse.json(MOCK_FRESHRSS_TAG_LIST);
  }),

  // Mock briefing articles
  http.get('/api/briefings', ({ request }) => {
    const url = new URL(request.url);
    const slot = url.searchParams.get('slot');

    let articles = Object.values(MOCK_ARTICLES_POOL);
    if (slot) {
      articles = articles.filter((a) => a.id.includes(slot));
    }

    return HttpResponse.json(articles);
  }),

  // Mock article state update (Mark all read)
  http.post('/api/articles/state', async ({ request }) => {
    const body = (await request.json()) as { ids: string[]; state: string };
    return HttpResponse.json({ success: true, count: body.ids.length });
  }),

  // Mock revalidate-date
  http.post('/api/system/revalidate-date', async ({ request }) => {
    const body = (await request.json()) as { date: string };
    return HttpResponse.json({ success: true, date: body.date });
  }),

  // Mock auth status
  http.get('/api/auth/status', () => {
    return HttpResponse.json({ isAuthenticated: true });
  }),
];
