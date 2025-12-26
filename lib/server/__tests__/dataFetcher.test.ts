import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchArticleById } from '../dataFetcher';

// 1. Mock apiUtils BEFORE importing modules that use it
// We need to intercept calls to getSupabaseClient and getFreshRssClient
vi.mock('../apiUtils', () => ({
  getSupabaseClient: vi.fn(),
  getFreshRssClient: vi.fn(),
}));

import { getSupabaseClient, getFreshRssClient } from '../apiUtils';

describe('dataFetcher (数据获取逻辑)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchArticleById - Fallback Logic', () => {
    it('当 Supabase 返回正常数据时，应该直接返回该数据', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'full_id', title: 'Supabase Article', highlights: 'raw content' },
          error: null,
        }),
      };
      (getSupabaseClient as any).mockReturnValue(mockSupabase);

      const result = await fetchArticleById('full_id');

      expect(result?.title).toBe('Supabase Article');
      expect(mockSupabase.from).toHaveBeenCalledWith('articles');
      // 验证没有调用 FreshRSS
      expect(getFreshRssClient).not.toHaveBeenCalled();
    });

    it('当 Supabase 返回错误或空时，应该尝试降级调用 FreshRSS', async () => {
      // Mock Supabase Failure
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not Found' } }),
      };
      (getSupabaseClient as any).mockReturnValue(mockSupabase);

      // Mock FreshRSS Success
      const mockFreshRss = {
        post: vi.fn().mockResolvedValue({
          items: [
            {
              id: 'fallback_id',
              title: 'Fallback Article',
              published: 123456,
              origin: { title: 'Source' },
            },
          ],
        }),
      };
      (getFreshRssClient as any).mockReturnValue(mockFreshRss);

      const result = await fetchArticleById('fallback_id');

      // 验证虽然 Supabase 失败，但我们拿到了 FreshRSS 的数据
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Fallback Article');
      expect(result?.sourceName).toBe('Source');

      // 验证降级路径被触发
      expect(getFreshRssClient).toHaveBeenCalled();
    });

    it('当 Supabase 和 FreshRSS 都失败时，应返回 null', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: 'Not Found' }),
      };
      (getSupabaseClient as any).mockReturnValue(mockSupabase);

      const mockFreshRss = {
        post: vi.fn().mockResolvedValue({ items: [] }), // Return empty
      };
      (getFreshRssClient as any).mockReturnValue(mockFreshRss);

      const result = await fetchArticleById('missing_id');
      expect(result).toBeNull();
    });
  });

  describe('fetchBriefingData (时区与日期范围)', () => {
    it('应正确将 "YYYY-MM-DD" (上海时间) 转换为 UTC 查询范围 (前一天 16:00 到 当天 15:59)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      // Need to mock the promise resolution mechanism used in the function (Promise.race)
      // We can make the chain return a promise-like object or just ensure the promise resolves
      const mockResult = { data: [], error: null };
      // The implementation awaits Promise.race([dataPromise, timeoutPromise])
      // dataPromise is the chain. We need the chain to be valid.
      // Ideally we mock the whole chain to return a Promise that resolves to mockResult
      // But here `lte` returns the builder. The builder is awaited?
      // Wait, in code: `const dataPromise = supabase...lte(...)`. This is a thenable.
      // So we make `lte` return a thenable that resolves to mockResult.

      const thenable = Promise.resolve(mockResult);
      mockSupabase.lte.mockReturnValue(thenable);

      (getSupabaseClient as any).mockReturnValue(mockSupabase);

      // Input: 2023-12-25 (Shanghai)
      await import('../dataFetcher').then((m) => m.fetchBriefingData('2023-12-25'));

      // Verification
      // Shanghai 2023-12-25 00:00:00 = UTC 2023-12-24 16:00:00
      const expectedStart = '2023-12-24T16:00:00.000Z';
      // Shanghai 2023-12-25 23:59:59.999 = UTC 2023-12-25 15:59:59.999
      const expectedEnd = '2023-12-25T15:59:59.999Z';

      expect(mockSupabase.gte).toHaveBeenCalledWith('n8n_processing_date', expectedStart);
      expect(mockSupabase.lte).toHaveBeenCalledWith('n8n_processing_date', expectedEnd);
    });
  });
});
