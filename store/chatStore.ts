import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  toggleSearchGrounding: () => void;

  // 辅助函数：消息压缩 (Tapering)
  archiveOldMessages: () => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedModel: 'gemini-2.0-flash',
      isExpanded: false,
      isOpen: false,
      isStreaming: false,
      streamingContent: '',
      sessionMetadata: [],
      searchGroundingEnabled: true, // 默认开启 Google Search Grounding

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

      toggleSearchGrounding: () =>
        set((state) => ({
          searchGroundingEnabled: !state.searchGroundingEnabled,
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
        selectedModel: state.selectedModel,
      }),
    },
  ),
);
