import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

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
      // 1. 设置 filter 和 slot
      useUIStore.setState({ activeFilter: 'some-filter', timeSlot: 'morning' });

      const { setActiveFilter } = useUIStore.getState();
      // 2. 切换 filter
      setActiveFilter('new-filter');

      const state = useUIStore.getState();
      expect(state.activeFilter).toBe('new-filter');
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
  });
});
