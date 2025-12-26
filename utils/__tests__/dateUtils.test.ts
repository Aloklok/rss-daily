import { describe, it, expect } from 'vitest';
import { getArticleTimeSlot } from '../dateUtils';

describe('dateUtils', () => {
  describe('getArticleTimeSlot', () => {
    it('上海时间 00:00 - 11:59 应返回 "morning" (早晨)', () => {
      // 2023-10-27T02:00:00Z is 10:00 in Shanghai (UTC+8) -> Morning
      expect(getArticleTimeSlot('2023-10-27T02:00:00Z')).toBe('morning');

      // 2023-10-27T03:59:00Z is 11:59 in Shanghai -> Morning
      expect(getArticleTimeSlot('2023-10-27T03:59:00Z')).toBe('morning');
    });

    it('上海时间 12:00 - 18:59 应返回 "afternoon" (下午)', () => {
      // 2023-10-27T04:00:00Z is 12:00 in Shanghai -> Afternoon
      expect(getArticleTimeSlot('2023-10-27T04:00:00Z')).toBe('afternoon');

      // 2023-10-27T10:59:00Z is 18:59 in Shanghai -> Afternoon
      expect(getArticleTimeSlot('2023-10-27T10:59:00Z')).toBe('afternoon');
    });

    it('上海时间 19:00 - 23:59 应返回 "evening" (晚上)', () => {
      // 2023-10-27T11:00:00Z is 19:00 in Shanghai -> Evening
      expect(getArticleTimeSlot('2023-10-27T11:00:00Z')).toBe('evening');

      // 2023-10-27T15:59:00Z is 23:59 in Shanghai -> Evening
      expect(getArticleTimeSlot('2023-10-27T15:59:00Z')).toBe('evening');
    });

    it('输入未定义时应返回默认值 "morning"', () => {
      expect(getArticleTimeSlot(undefined)).toBe('morning');
    });
  });
});
