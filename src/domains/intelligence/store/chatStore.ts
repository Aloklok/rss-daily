import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MODEL_ID } from '@/domains/intelligence/constants';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  id: string;
  timestamp: number;
  citations?: Array<{
    id: string;
    index: number;
    title?: string;
    published?: string;
  }>;
  contextCount?: number; // 这一轮对话匹配到的文章总数
}

interface ChatStoreState {
  messages: ChatMessage[];
  selectedModel: string;
  isExpanded: boolean;
  isOpen: boolean;
  isStreaming: boolean;
  streamingContent: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionMetadata: any[];
  searchGroundingEnabled: boolean;
  isSmallTalkMode: boolean;

  // Actions
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setIsOpen: (open: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSessionMetadata: (metadata: any[]) => void;
  clearHistory: () => void;
  setSelectedModel: (model: string) => void;
  setIsExpanded: (expanded: boolean) => void;
  setSearchGroundingEnabled: (enabled: boolean) => void;
  toggleSearchGrounding: () => void;
  setIsSmallTalkMode: (enabled: boolean) => void;
  toggleSmallTalkMode: () => void;

  // 辅助函数：消息压缩 (Tapering)
  archiveOldMessages: () => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedModel: DEFAULT_MODEL_ID,
      isExpanded: false,
      isOpen: false,
      isStreaming: false,
      streamingContent: '',
      sessionMetadata: [],
      searchGroundingEnabled: true, // 默认开启 Google Search Grounding
      isSmallTalkMode: false, // 默认关闭闲聊模式

      setIsOpen: (open) => set({ isOpen: open }),

      addMessage: (msg) => {
        const newMessage: ChatMessage = {
          ...msg,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...(state.messages || []), newMessage],
        }));

        get().archiveOldMessages();
      },

      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setStreamingContent: (content) => set({ streamingContent: content }),
      setSessionMetadata: (metadata) => set({ sessionMetadata: metadata }),

      clearHistory: () => set({ messages: [] }),

      setSearchGroundingEnabled: (enabled) => set({ searchGroundingEnabled: enabled }),

      toggleSearchGrounding: () =>
        set((state) => ({
          searchGroundingEnabled: !state.searchGroundingEnabled,
        })),

      setIsSmallTalkMode: (enabled) => set({ isSmallTalkMode: enabled }),

      toggleSmallTalkMode: () =>
        set((state) => ({
          isSmallTalkMode: !state.isSmallTalkMode,
          // 如果开启闲聊模式，默认关闭搜索以提速
          searchGroundingEnabled: !state.isSmallTalkMode ? false : state.searchGroundingEnabled,
        })),

      setSelectedModel: (model) => set({ selectedModel: model }),

      setIsExpanded: (expanded) => set({ isExpanded: expanded }),

      archiveOldMessages: () => {
        const { messages } = get();
        if (messages && messages.length > 16) {
          // 8 轮 = 16 条消息 (user + model)
          set({
            messages: messages.slice(-16),
          });
        }
      },
    }),
    {
      name: 'alok-rss-chat-storage',
      partialize: (state) => ({
        messages: state.messages,
        searchGroundingEnabled: state.searchGroundingEnabled,
        isSmallTalkMode: state.isSmallTalkMode,
        selectedModel: state.selectedModel,
      }),
    },
  ),
);
