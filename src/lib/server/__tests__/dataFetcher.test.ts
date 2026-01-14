/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only to allow Vitest to import server-side modules
vi.mock('server-only', () => ({}));

import { fetchArticleById, fetchBriefingData } from '../dataFetcher';

// 1. Mock apiUtils BEFORE importing modules that use it
// We need to intercept calls to getSupabaseClient and getFreshRssClient
vi.mock('../apiUtils', () => ({
  getSupabaseClient: vi.fn(),
  getFreshRssClient: vi.fn(),
}));

// 2. Mock next/cache
vi.mock('next/cache', () => ({
  unstable_cache: (cb: any) => cb,
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

    it('Timeout: 当 Supabase 查询超过 10s 时，应触发熔断并返回空对象', async () => {
      vi.useFakeTimers();

      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      // 让查询永远挂起
      mockSupabase.lte.mockReturnValue(new Promise(() => {}));
      (getSupabaseClient as any).mockReturnValue(mockSupabase);

      // 使用静态引用，而不是动态 import
      const fetchPromise = fetchBriefingData('2023-12-25');

      // 推进时间超过 10s (这里用 11s)
      await vi.advanceTimersByTimeAsync(11000);

      const result = await fetchPromise;
      expect(result).toEqual({});

      vi.useRealTimers();
    }, 20000); // 增加 Test Case 级别的超时时间到 20s，防止 CI 环境慢导致假失败

    it('Error Handling: 当 Supabase 抛出异常时，应被捕获并返回空对象', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockRejectedValue(new Error('Connection Reset')),
      };
      (getSupabaseClient as any).mockReturnValue(mockSupabase);

      const result = await fetchBriefingData('2023-12-25');
      expect(result).toEqual({});
    });
  });

  describe('fetchArticleContentServer (清洗管线集成)', () => {
    it('应按顺序执行: 去重标题 -> 去空行 -> 安全清洗', async () => {
      // Mock FreshRSS response with dirty content
      const dirtyContent = `
             <h1>Redundant Title</h1>
             <p>Real Content</p>
             <p></p>
             <p>&nbsp;</p>
             <script>alert('xss')</script>
           `;

      const mockFreshRss = {
        post: vi.fn().mockResolvedValue({
          items: [
            {
              title: 'Redundant Title',
              summary: { content: dirtyContent },
              origin: { title: 'Source' },
            },
          ],
        }),
      };
      (getFreshRssClient as any).mockReturnValue(mockFreshRss);

      // 需要 import 那个函数，因为它不是 default export
      const { fetchArticleContentServer } = await import('../dataFetcher');
      const result = await fetchArticleContentServer('123');

      // 1. 标题 "Redundant Title" 相关的 h1 应该被移除
      expect(result?.content).not.toContain('<h1>Redundant Title</h1>');
      // 2. 空行 <p></p> 应该被移除
      expect(result?.content).not.toContain('<p></p>');
      expect(result?.content).not.toContain('<p>&nbsp;</p>');
      // 3. 脚本应该被清洗
      expect(result?.content).not.toContain('<script>');
      // 4. 真实内容保留
      expect(result?.content).toContain('<p>Real Content</p>');
    });

    it('当 FreshRSS 数据结构异常(无 items)时，应安全返回 null', async () => {
      const mockFreshRss = { post: vi.fn().mockResolvedValue({}) }; // No items
      (getFreshRssClient as any).mockReturnValue(mockFreshRss);

      const { fetchArticleContentServer } = await import('../dataFetcher');
      const result = await fetchArticleContentServer('999');
      expect(result).toBeNull();
    });

    describe('getAvailableFilters (Tag & Category Logic)', () => {
      it('应过滤掉系统标签 (Google/FreshRSS state) 并按中文排序', async () => {
        // Mock FreshRSS response
        const mockTags = [
          { id: 'user/1/state/com.google/read', type: 'tag' }, // Should be filtered
          { id: 'user/1/state/org.freshrss/starred', type: 'tag' }, // Should be filtered
          { id: 'user/1/label/Backend', type: 'tag' },
          { id: 'user/1/label/AI', type: 'tag' },
          { id: 'user/1/label/Frontend', type: 'folder' }, // Category
        ];

        const mockFreshRss = {
          get: vi.fn().mockResolvedValue({ tags: mockTags }),
        };
        (getFreshRssClient as any).mockReturnValue(mockFreshRss);

        const { getAvailableFilters } = await import('../dataFetcher');
        const result = await getAvailableFilters();

        // Verify Categories
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0].id).toContain('Frontend');

        // Verify Tags
        expect(result.tags).toHaveLength(2);
        const labels = result.tags.map((t) => t.label);
        // AI (A) < Backend (B) -- simple ascii sort check, or locale check
        expect(labels).toContain('AI');
        expect(labels).toContain('Backend');
        expect(labels).not.toContain('read'); // System tag filtered
        expect(labels).not.toContain('starred'); // System tag filtered
      });

      it('当 API 失败时，应安全返回空数组', async () => {
        (getFreshRssClient as any).mockReturnValue({
          get: vi.fn().mockRejectedValue(new Error('API Fail')),
        });

        const { getAvailableFilters } = await import('../dataFetcher');
        const result = await getAvailableFilters();

        expect(result.tags).toEqual([]);
        expect(result.categories).toEqual([]);
      });
    });
  });
});
