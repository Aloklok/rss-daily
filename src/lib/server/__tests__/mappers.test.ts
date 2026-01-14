import { describe, it, expect } from 'vitest';
import { mapFreshItemToMinimalArticle } from '@/domains/reading/adapters/fresh-rss-mapper';

describe('mappers (数据映射)', () => {
  describe('mapFreshItemToMinimalArticle', () => {
    it('应正确映射基础字段 (ID, Title, Link)', () => {
      const rawItem: any = {
        id: 'hex_id_123',
        title: 'Test Article',
        alternate: [{ href: 'https://example.com' }],
        origin: { title: 'Example Source' },
        published: 1700000000,
        categories: ['cat1'],
        annotations: [],
      };

      const result = mapFreshItemToMinimalArticle(rawItem);

      expect(result.id).toBe('hex_id_123');
      expect(result.title).toBe('Test Article');
      expect(result.link).toBe('https://example.com');
      expect(result.sourceName).toBe('Example Source');
      // 验证时间戳转换 (1700000000 * 1000)
      expect(result.published).toBe(new Date(1700000000000).toISOString());
    });

    it('应正确合并 categories 和 annotations 为 tags', () => {
      const rawItem: any = {
        id: '1',
        title: 'Title',
        published: 1234567890,
        categories: ['Tech'],
        annotations: [{ id: 'user/label/Important' }],
      };

      const result = mapFreshItemToMinimalArticle(rawItem);
      expect(result.tags).toEqual(['Tech', 'user/label/Important']);
    });

    it('应处理缺失的字段，提供默认空值', () => {
      const rawItem: any = {
        // 只有 ID 和时间，其他全缺
        id: 'empty_item',
        published: 1234567890,
      };

      const result = mapFreshItemToMinimalArticle(rawItem);
      expect(result.title).toBe('');
      expect(result.link).toBe('');
      expect(result.sourceName).toBe('');
      expect(result.tags).toEqual([]);
    });
  });
});
