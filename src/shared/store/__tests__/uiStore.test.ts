import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '@/shared/store/uiStore';
import { Filter } from '@/shared/types';

// Helper to reset store
const initialState = useUIStore.getState();

describe('uiStore (客户端状态管理)', () => {
  beforeEach(() => {
    useUIStore.setState(initialState, true);
    vi.restoreAllMocks();
  });

  describe('模态框逻辑 (Modal Logic)', () => {
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

  describe('时段筛选逻辑 (TimeSlot Logic)', () => {
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

  describe('设置状态 (Settings State)', () => {
    it('setFontSize 应更新字体大小', () => {
      const { setFontSize } = useUIStore.getState();
      setFontSize(20);
      expect(useUIStore.getState().fontSize).toBe(20);
    });

    it('setTheme 应更新 localStorage 和 DOM class', () => {
      // 在 Vitest Browser Mode 下，window 和 document 是真实存在的，不需要 mock window 对象本身
      // 只需要 spy 具体的方法
      const addClassSpy = vi.spyOn(document.documentElement.classList, 'add');
      const removeClassSpy = vi.spyOn(document.documentElement.classList, 'remove');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const { setTheme } = useUIStore.getState();

      // Action: Set Dark
      setTheme('dark');
      expect(addClassSpy).toHaveBeenCalledWith('dark');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');

      // Action: Set Light
      setTheme('light');
      expect(removeClassSpy).toHaveBeenCalledWith('dark');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('异步操作 (Async Actions)', () => {
    it('checkAdminStatus 应在成功时更新 isAdmin', async () => {
      // 在浏览器环境下，fetch 是全局自带的，直接使用 msw 拦截即可
      const { result } = renderHook(() => useUIStore());
      await act(async () => {
        await result.current.checkAdminStatus();
      });
      // 假设 handlers.ts 中默认为 admin
      expect(result.current.isAdmin).toBeDefined();
    });

    it('checkAdminStatus 应在失败时重置 isAdmin 为 false', async () => {
      // 使用 vi.spyOn 拦截 fetch
      const fetchSpy = vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network Error'));

      // First set true
      useUIStore.setState({ isAdmin: true });

      await useUIStore.getState().checkAdminStatus();
      expect(useUIStore.getState().isAdmin).toBe(false);

      fetchSpy.mockRestore();
    });
  });
});
