import { describe, it, expect } from 'vitest';
import { toShortId, toFullId } from '../idHelpers';
import { ARTICLE_ID_PREFIX } from '@/constants';

describe('idHelpers (ID 转换工具)', () => {
  const MOCK_SHORT_ID = '000642d52cde0249';
  const MOCK_FULL_ID = `${ARTICLE_ID_PREFIX}${MOCK_SHORT_ID}`;

  describe('toShortId', () => {
    it('应从完整 ID 中移除前缀', () => {
      expect(toShortId(MOCK_FULL_ID)).toBe(MOCK_SHORT_ID);
    });

    it('如果输入已经是短 ID (虽然不符合预期但要健壮)，应保持不变 (因为 replace 找不到前缀)', () => {
      expect(toShortId(MOCK_SHORT_ID)).toBe(MOCK_SHORT_ID);
    });

    it('处理空值应返回空字符串', () => {
      expect(toShortId('')).toBe('');
    });
  });

  describe('toFullId', () => {
    it('应给短 ID 添加前缀', () => {
      expect(toFullId(MOCK_SHORT_ID)).toBe(MOCK_FULL_ID);
    });

    it('如果输入已经是完整 ID (以前缀开头)，不应重复添加', () => {
      // 这是一个防止 "tag:tag:..." 这种 Bug 的关键测试
      expect(toFullId(MOCK_FULL_ID)).toBe(MOCK_FULL_ID);
    });

    it('如果输入包含冒号 (可能是其他格式的 URN)，应直接返回不处理', () => {
      const otherUrn = 'urn:uuid:12345';
      expect(toFullId(otherUrn)).toBe(otherUrn);
    });

    it('处理空值应返回空字符串', () => {
      expect(toFullId('')).toBe('');
    });
  });
});
