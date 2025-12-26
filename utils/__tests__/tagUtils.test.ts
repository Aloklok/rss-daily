import { describe, it, expect } from 'vitest';
import { calculateNewAvailableTags, isUserTag } from '../tagUtils';
import { Tag } from '@/types';

describe('tagUtils (标签工具)', () => {
  describe('isUserTag', () => {
    it('应正确识别用户自定义标签', () => {
      expect(isUserTag('user/1/label/MyTag')).toBe(true);
    });

    it('应排除 Google 系统标签', () => {
      expect(isUserTag('user/-/state/com.google/starred')).toBe(false);
    });

    it('应排除 FreshRSS 系统标签', () => {
      expect(isUserTag('user/-/state/org.freshrss/read')).toBe(false);
    });
  });

  describe('calculateNewAvailableTags', () => {
    const initialTags: Tag[] = [
      { id: 'tag1', label: 'Tech', count: 10 },
      { id: 'tag2', label: 'AI', count: 5 },
    ];

    it('当没有标签变化时，应返回原数组', () => {
      const oldTags = ['tag1', 'tag2'];
      const newTags = ['tag1', 'tag2'];
      expect(calculateNewAvailableTags(initialTags, oldTags, newTags)).toEqual(initialTags);
    });

    it('当新增标签时，应增加计数', () => {
      const oldTags = ['tag1']; // 原来只有 Tech
      const newTags = ['tag1', 'tag2']; // 新增了 AI

      const result = calculateNewAvailableTags(initialTags, oldTags, newTags);
      const aiTag = result.find((t) => t.id === 'tag2');
      expect(aiTag?.count).toBe(6); // 5 + 1
    });

    it('当移除标签时，应减少计数', () => {
      const oldTags = ['tag1', 'tag2'];
      const newTags = ['tag1']; // 移除了 AI

      const result = calculateNewAvailableTags(initialTags, oldTags, newTags);
      const aiTag = result.find((t) => t.id === 'tag2');
      expect(aiTag?.count).toBe(4); // 5 - 1
    });

    it('当出现全新的标签时，应自动创建并添加到列表中', () => {
      const oldTags = ['tag1'];
      const newTags = ['tag1', 'user/1/label/NewTag']; // 一个之前不存在的标签

      const result = calculateNewAvailableTags(initialTags, oldTags, newTags);
      const newTag = result.find((t) => t.id === 'user/1/label/NewTag');

      expect(newTag).toBeDefined();
      expect(newTag?.label).toBe('NewTag');
      expect(newTag?.count).toBe(1); // 初始创建并加 1
    });

    it('计数不应减为负数', () => {
      const tagsWithZero: Tag[] = [{ id: 'tag1', label: 'Zero', count: 0 }];
      const oldTags = ['tag1'];
      const newTags: string[] = []; // 移除了

      const result = calculateNewAvailableTags(tagsWithZero, oldTags, newTags);
      expect(result[0].count).toBe(0);
    });
  });
});
