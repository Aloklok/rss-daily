import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../uiStore';
import { Filter } from '../../types';

// Helper to reset store
const initialState = useUIStore.getState();

describe('uiStore (客户端状态管理)', () => {
  beforeEach(() => {
    useUIStore.setState(initialState, true);
  });

  describe('Modal Logic', () => {
    it('openModal 应正确设置 ID 和模式', () => {
      const { openModal } = useUIStore.getState();
      openModal('123', 'reader');

      const state = useUIStore.getState();
      expect(state.modalArticleId).toBe('123');
      expect(state.modalInitialMode).toBe('reader');
    });

    it('closeModal 应重置 ID', () => {
      const { openModal, closeModal } = useUIStore.getState();
      openModal('123');
      closeModal();

      const state = useUIStore.getState();
      expect(state.modalArticleId).toBeNull();
    });
  });

  describe('TimeSlot Logic', () => {
    it('设置 timeSlot 应更新状态', () => {
      const { setTimeSlot } = useUIStore.getState();
      setTimeSlot('evening');
      expect(useUIStore.getState().timeSlot).toBe('evening');
    });

    it('切换 activeFilter 时应自动重置 timeSlot', () => {
      const filter: Filter = { type: 'category', value: 'some-filter' };
      useUIStore.setState({ activeFilter: filter, timeSlot: 'morning' });

      const { setActiveFilter } = useUIStore.getState();
      // 2. 切换 filter
      const newFilter: Filter = { type: 'category', value: 'new-filter' };
      setActiveFilter(newFilter);

      const state = useUIStore.getState();
      expect(state.activeFilter).toEqual(newFilter);
      // 3. 验证 slot 被重置
      expect(state.timeSlot).toBeNull();
    });
  });

  describe('Settings State', () => {
    it('setFontSize 应更新字体大小', () => {
      const { setFontSize } = useUIStore.getState();
      setFontSize(20);
      expect(useUIStore.getState().fontSize).toBe(20);
    });

    it('setTheme 应更新 localStorage 和 DOM class', () => {
      const { setTheme } = useUIStore.getState();

      // Mock document and localStorage
      const addClassSpy = vi.fn();
      const removeClassSpy = vi.fn();
      const setItemSpy = vi.fn();

      // Replace global objects temporarily?
      // Since tests run in Node, 'document' might be undefined or simple jsdom if environment is jsdom. Not sure if we are in node or jsdom. Config says 'node'.
      // In 'node' environment, document is undefined.
      // So we need to ensure the code handles it safely or we mock it globally.

      // The code has: if (typeof window !== 'undefined') { ... }
      // In 'node', this block is skipped.
      // So to test it, we must mock window/document globally OR we trust that we covered the 'else' branch (skipping).
      // But the user asked for Side Effects testing.

      // Let's create a fake window/document for this test scope
      vi.stubGlobal('window', {});
      vi.stubGlobal('document', {
        documentElement: {
          classList: {
            add: addClassSpy,
            remove: removeClassSpy,
          },
        },
      });
      vi.stubGlobal('localStorage', {
        setItem: setItemSpy,
      });

      // Action: Set Dark
      setTheme('dark');
      expect(addClassSpy).toHaveBeenCalledWith('dark');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');

      // Action: Set Light
      setTheme('light');
      expect(removeClassSpy).toHaveBeenCalledWith('dark');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');

      vi.unstubAllGlobals();
    });
  });

  describe('Async Actions', () => {
    it('checkAdminStatus 应在成功时更新 isAdmin', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ isAdmin: true }),
      });

      await useUIStore.getState().checkAdminStatus();
      expect(useUIStore.getState().isAdmin).toBe(true);
    });

    it('checkAdminStatus 应在失败时重置 isAdmin 为 false', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

      // First set true
      useUIStore.setState({ isAdmin: true });

      await useUIStore.getState().checkAdminStatus();
      expect(useUIStore.getState().isAdmin).toBe(false);
    });
  });
});
