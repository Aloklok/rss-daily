'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useArticleStore } from '../../../store/articleStore';
import { useChatStore, ChatMessage } from '../../../store/chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- 性能常量：提取到顶层避免重复创建 ---
const UNICODE_MAP: Record<string, string> = {
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁰': '0',
};

const CITATION_REGEX = /(\[\s*\d+(?:\.\d+)?\s*\]|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g;

/**
 * 辅助：从原始内容片段中提取数字索引字符串
 */
const getOriginalIndex = (raw: string): string => {
  const match = raw.match(/^\[\s*(\d+(?:\.\d+)?)\s*\]$/);
  const unicodeMatch = raw.match(/^[¹²³⁴⁵⁶⁷⁸⁹⁰]+$/);
  if (match) return match[1];
  if (unicodeMatch)
    return raw
      .split('')
      .map((char) => UNICODE_MAP[char] || '')
      .join('');

  // 处理 [¹] 这种混合格式
  const inner = raw.replace(/[[\]\s]/g, '');
  if (/^\d+(\.\d+)?$/.test(inner)) return inner;

  const unicodeInner = inner
    .split('')
    .map((c) => UNICODE_MAP[c] || c)
    .join('');
  if (/^\d+(\.\d+)?$/.test(unicodeInner)) return unicodeInner;

  return '';
};

import { ModelSelector } from './ModelSelector';
import { MODELS } from '@/lib/ai-models';

/**
 * 递归处理文本节点中的引用标签，将其转换为交互按钮
 */
const renderCitations = (
  node: React.ReactNode,
  citations: ChatMessage['citations'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionMetadata: any[],
  openArticleModal: (article: any) => void,
  isInteractive: boolean = true,
  displayMapping?: Map<string, string>,
): React.ReactNode => {
  if (typeof node === 'string') {
    if (!node.trim()) return node;
    const parts = node.split(CITATION_REGEX);
    return parts.map((part, i) => {
      const originalIndex = getOriginalIndex(part);

      if (originalIndex && /^\d+(\.\d+)?$/.test(originalIndex)) {
        // 如果开启了唯一性检查且该索引在本消息中已出现过，则不再重复渲染为交互角标（仅保留占位以维持文本完整性）
        const displayIndex = displayMapping?.get(originalIndex) || originalIndex;
        const citation = citations?.find((c) => c.index.toString() === originalIndex);
        const meta = citation || (sessionMetadata && sessionMetadata[parseInt(originalIndex) - 1]);

        if (!meta || !isInteractive) {
          return (
            <sup key={i} className="mx-0.5 font-bold text-indigo-500/80 transition-opacity">
              {displayIndex}
            </sup>
          );
        }

        return (
          <sup key={i} className="mx-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openArticleModal(meta);
              }}
              className="font-bold text-indigo-500 transition-colors hover:text-indigo-600 active:scale-95"
            >
              {displayIndex}
            </button>
          </sup>
        );
      }
      return part;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (React.isValidElement(node) && (node as any).props.children) {
    return React.cloneElement(node as React.ReactElement, {
      ...(node as any).props,
      children: React.Children.map((node as any).props.children, (child) =>
        renderCitations(
          child,
          citations,
          sessionMetadata,
          openArticleModal,
          isInteractive,
          displayMapping,
        ),
      ),
    });
  }
  return node;
};

// --- 辅助：清洗 Markdown 内容 (去除加粗内部的冗余符号) ---
// --- 辅助：清洗 Markdown 内容 (去除加粗内部的冗余符号 + 拆分合并的引用) ---
const cleanMessageContent = (content: string): string => {
  if (!content) return '';

  let cleaned = content;

  // 1. 拆分合并的引用：将 [1, 3] 或 [1.1, 1.2] 拆分为 [1.1][1.2]
  // 这样后续的 CITATION_REGEX 就能正确识别每个引用了
  cleaned = cleaned.replace(/\[((?:\d+(?:\.\d+)?\s*,\s*)+\d+(?:\.\d+)?\s*)\]/g, (match, inner) => {
    return inner
      .split(',')
      .map((n: string) => `[${n.trim()}]`)
      .join('');
  });

  // 2. 核心逻辑：移除加粗内容内部的特殊符号 (支持中英文双引号、括号)
  // 之前的逻辑只去除首尾，无法处理 "数据中心（对标..." 这种符号在中间的情况
  // 现在改为：匹配所有 **...** 块，并将内部的所有指定符号移除
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, (match, innerContent) => {
    // 移除字符并用空格代替，防止语义粘连 (如 "A(B)" -> "A B")
    // 最后 trim() 去除首尾多余空格
    const cleanInner = innerContent.replace(/["“(\uFF08"”)\uFF09]/g, ' ').trim();
    return `**${cleanInner}**`;
  });

  return cleaned;
};

// --- 性能优化：消息项 Memo 化 ---
const ChatMessageItem = React.memo(
  ({
    msg,
    sessionMetadata,
    handleOpenArticle,
    isExpanded,
  }: {
    msg: ChatMessage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionMetadata: any[];
    handleOpenArticle: (article: any) => void;
    isExpanded: boolean;
  }) => {
    // 预处理内容：清洗冗余符号
    const cleanContent = React.useMemo(() => cleanMessageContent(msg.content), [msg.content]);

    // 改为使用顶层的通用渲染函数
    // 动态生成显示映射：按引用在正文中出现的先后顺序重新编号 [1], [2], [3]...
    const displayMapping = React.useMemo(() => {
      const map = new Map<string, string>();
      let nextIndex = 1;
      const matches = [...cleanContent.matchAll(CITATION_REGEX)];
      for (const match of matches) {
        const originalIndex = getOriginalIndex(match[0]);
        if (originalIndex && !map.has(originalIndex)) {
          map.set(originalIndex, (nextIndex++).toString());
        }
      }
      return map;
    }, [cleanContent]);

    const components = React.useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrap = (children: any) =>
        React.Children.map(children, (child) =>
          renderCitations(
            child,
            msg.citations,
            sessionMetadata,
            handleOpenArticle,
            true,
            displayMapping,
          ),
        );

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p: ({ children }: any) => <p className="mb-4 last:mb-0">{wrap(children)}</p>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h1: ({ children }: any) => <h1 className="mb-4 text-xl font-bold">{wrap(children)}</h1>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h2: ({ children }: any) => <h2 className="mb-3 text-lg font-bold">{wrap(children)}</h2>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h3: ({ children }: any) => <h3 className="mb-2 text-base font-bold">{wrap(children)}</h3>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blockquote: ({ children }: any) => (
          <blockquote className="mb-4 border-l-4 border-stone-200 pl-4 italic dark:border-white/10">
            {wrap(children)}
          </blockquote>
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        li: ({ children }: any) => <li className="mb-1">{wrap(children)}</li>,
        strong: ({ children }: any) => <strong className="font-bold">{wrap(children)}</strong>,
        em: ({ children }: any) => <em className="italic">{wrap(children)}</em>,

        a: ({ node: _node, ...props }: any) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline hover:text-indigo-300"
          />
        ),
      };
    }, [msg.citations, sessionMetadata, handleOpenArticle, displayMapping]);

    return (
      <div className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}>
        <div
          className={`rounded-2xl px-6 py-4 shadow-lg ${isExpanded ? (msg.role === 'user' ? 'max-w-2xl' : msg.citations?.length ? 'w-full max-w-5xl' : 'w-full max-w-xl') : 'max-w-[92%]'} ${
            msg.role === 'user'
              ? 'bg-indigo-600 text-white shadow-indigo-500/20'
              : 'border border-stone-200 bg-white text-stone-800 dark:border-white/10 dark:bg-stone-800 dark:shadow-xl'
          } `}
        >
          <div
            className={`flex ${isExpanded && msg.role === 'model' && msg.citations?.length ? 'flex-col items-stretch justify-center gap-4 lg:flex-row lg:gap-8' : 'flex-col items-start'} `}
          >
            {/* Main Content Area */}
            <div
              className={`text-sm leading-relaxed ${isExpanded && msg.role === 'model' ? 'w-full lg:max-w-xl' : ''} ${msg.role === 'user' ? '' : 'prose prose-sm dark:prose-invert ai-chat-content prose-p:leading-relaxed prose-pre:bg-stone-100 dark:prose-pre:bg-stone-900/50 dark:prose-headings:!text-white dark:prose-p:!text-stone-100 dark:prose-strong:!text-indigo-300 dark:prose-code:!text-indigo-200 dark:prose-code:!bg-indigo-500/20 max-w-none dark:!text-stone-100'} `}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {cleanContent}
                </ReactMarkdown>
              )}
            </div>

            {/* Citations Area */}
            {msg.role === 'model' &&
              ((msg.citations?.length || 0) > 0 || (msg.contextCount || 0) > 0) && (
                <div
                  className={`flex flex-col gap-2 ${
                    isExpanded && msg.citations?.length
                      ? 'w-full flex-shrink-0 border-t border-stone-100 pt-4 lg:w-64 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 dark:border-white/5'
                      : 'mt-4 w-full max-w-xl border-t border-stone-100 pt-3 dark:border-white/5'
                  } `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest whitespace-nowrap text-stone-400 uppercase">
                      {msg.citations && msg.citations.length > 0
                        ? '直接引用文献:'
                        : '结合参考资料:'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {msg.citations && msg.citations.length > 0 ? (
                      [...displayMapping.entries()]
                        .sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
                        .map(([originalIdx, displayIdx]) => {
                          const citation = msg.citations?.find(
                            (c) => c.index.toString() === originalIdx,
                          );
                          // 优先从 sessionMetadata 找完整对象，找不到则从消息自带的引用信息中恢复（持久化支持）
                          const metaFromSession = sessionMetadata.find(
                            (m) => m.id === citation?.id,
                          );
                          const article = metaFromSession || citation;

                          if (!article || !article.title) return null;
                          const dateStr = article.published
                            ? new Date(article.published).toLocaleDateString()
                            : '';

                          return (
                            <div
                              key={originalIdx}
                              className="group flex items-start gap-2 text-left text-[11px]"
                            >
                              <span className="mt-[0.5px] flex-shrink-0 font-bold text-indigo-500">
                                [{displayIdx}]
                              </span>
                              <div className="min-w-0 flex-1 leading-snug">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenArticle(article);
                                  }}
                                  className="inline cursor-pointer text-left font-medium text-stone-600 transition-colors hover:text-indigo-600 hover:underline dark:text-stone-300 dark:hover:text-indigo-400"
                                  title={article?.title}
                                >
                                  {article?.title}
                                </button>
                                {dateStr && (
                                  <span className="ml-1.5 inline-block font-mono text-[9px] whitespace-nowrap text-stone-400 opacity-50">
                                    {dateStr}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="flex flex-col gap-1 pr-4">
                        <p className="text-[10px] leading-relaxed text-stone-300 italic">
                          AI 已综合分析了检索到的 {msg.contextCount} 篇文章。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  },
);
ChatMessageItem.displayName = 'ChatMessageItem';

// --- 性能优化：流式内容组件 (避免主 Modal 在打字时全量刷新) ---
const StreamingResponse = React.memo(
  ({
    isExpanded,
    handleOpenArticle,
    scrollRef,
    sessionMetadata,
  }: {
    isExpanded: boolean;
    handleOpenArticle: (article: any) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    sessionMetadata: any[];
  }) => {
    const streamingContent = useChatStore((state) => state.streamingContent);
    const isStreaming = useChatStore((state) => state.isStreaming);

    // 局部滚动逻辑：仅在流式内容更新时触发，不会影响主模态框的其他部分
    useEffect(() => {
      if (scrollRef?.current && isStreaming) {
        // 只有当用户没有手动向上滚动时才自动探底
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (isAtBottom) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }, [streamingContent, isStreaming, scrollRef]);

    if (!isStreaming) return null;

    // 如果正在流式传输但内容为空，显示加载动画
    if (!streamingContent) {
      return (
        <div className="flex justify-start">
          <div className="animate-pulse rounded-2xl border border-stone-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-stone-800">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400 delay-100"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400 delay-200"></span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white px-6 py-4 text-stone-800 shadow-lg dark:border-white/10 dark:bg-stone-800 dark:shadow-xl">
          <div
            className={`flex items-start ${isExpanded ? 'w-full flex-col justify-center gap-4 lg:flex-row lg:gap-8' : 'flex-col'} `}
          >
            <div
              className={`${isExpanded ? 'w-full lg:max-w-xl' : ''} prose prose-sm dark:prose-invert ai-chat-content prose-p:leading-relaxed dark:prose-headings:!text-white dark:prose-p:!text-stone-100 dark:prose-strong:!text-indigo-300 max-w-none dark:!text-stone-100`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  p: ({ children }: any) => (
                    <p className="mb-4 last:mb-0">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </p>
                  ),
                  h1: ({ children }: any) => (
                    <h1 className="mb-4 text-xl font-bold">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </h1>
                  ),
                  h2: ({ children }: any) => (
                    <h2 className="mb-3 text-lg font-bold">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </h2>
                  ),
                  h3: ({ children }: any) => (
                    <h3 className="mb-2 text-base font-bold">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </h3>
                  ),
                  blockquote: ({ children }: any) => (
                    <blockquote className="mb-4 border-l-4 border-stone-200 pl-4 italic dark:border-white/10">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </blockquote>
                  ),
                  li: ({ children }: any) => (
                    <li className="mb-1">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </li>
                  ),
                  strong: ({ children }: any) => (
                    <strong className="font-bold">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </strong>
                  ),
                  em: ({ children }: any) => (
                    <em className="italic">
                      {React.Children.map(children, (c) =>
                        renderCitations(c, [], sessionMetadata, handleOpenArticle, false),
                      )}
                    </em>
                  ),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  a: ({ ...props }: any) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 underline hover:text-indigo-300"
                    />
                  ),
                }}
              >
                {cleanMessageContent(streamingContent)}
              </ReactMarkdown>
            </div>
            {isExpanded && (
              <div className="flex w-full flex-shrink-0 flex-col gap-2 border-t border-stone-100 pt-4 lg:w-64 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 dark:border-white/5">
                <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                  正在分析文献...
                </span>
                <div className="h-1 animate-pulse rounded-full bg-stone-100 dark:bg-white/5" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
StreamingResponse.displayName = 'StreamingResponse';

// --- 性能优化：消息列表组件 (隔离渲染) ---
const MessageList = React.memo(
  ({
    messages,
    sessionMetadata,
    handleOpenArticle,
    isExpanded,
  }: {
    messages: ChatMessage[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionMetadata: any[];
    handleOpenArticle: (article: any) => void;
    isExpanded: boolean;
  }) => {
    return (
      <>
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            msg={msg}
            sessionMetadata={sessionMetadata}
            handleOpenArticle={handleOpenArticle}
            isExpanded={isExpanded}
          />
        ))}
      </>
    );
  },
);
MessageList.displayName = 'MessageList';

// --- 性能优化：消息列表容器 (隔离背景和空状态渲染) ---
const MessageContainer = React.memo(
  ({
    messages,
    sessionMetadata,
    handleOpenArticle,
    isExpanded,
    isStreaming,
    scrollRef,
    handleScroll,
  }: {
    messages: ChatMessage[];
    sessionMetadata: any[];
    handleOpenArticle: (article: any) => void;
    isExpanded: boolean;
    isStreaming: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    handleScroll: () => void;
  }) => {
    return (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col items-center space-y-6 overflow-y-auto p-6"
      >
        <div
          className={`flex w-full flex-col space-y-6 ${isExpanded ? 'max-w-5xl' : 'max-w-full'} `}
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 text-4xl opacity-30 grayscale">🤖</div>
              <h4 className="mb-2 text-lg font-medium text-stone-900 dark:text-white">
                欢迎，架构师
              </h4>
              <p className="max-w-xs text-sm text-stone-500">
                我可以基于你的 1000+ 篇本地简报回答问题，也可以开启 Google 搜索获取最新时事。
              </p>
            </div>
          )}

          <MessageList
            messages={messages}
            sessionMetadata={sessionMetadata}
            handleOpenArticle={handleOpenArticle}
            isExpanded={isExpanded}
          />

          {isStreaming && (
            <StreamingResponse
              isExpanded={isExpanded}
              handleOpenArticle={handleOpenArticle}
              scrollRef={scrollRef}
              sessionMetadata={sessionMetadata}
            />
          )}
        </div>
      </div>
    );
  },
);
MessageContainer.displayName = 'MessageContainer';

// --- 性能优化：头部组件 ---
const ChatHeader = React.memo(
  ({
    isExpanded,
    setIsExpanded,
    clearHistory,
    setIsOpen,
  }: {
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    clearHistory: () => void;
    setIsOpen: (val: boolean) => void;
  }) => {
    return (
      <div className="flex items-center justify-between border-b border-stone-100 px-6 py-2.5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
            架构师助手
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? '收缩窗口' : '放大窗口'}
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-white/5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            onClick={clearHistory}
            title="清除聊天记录"
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-red-500 dark:hover:bg-white/5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  },
);
ChatHeader.displayName = 'ChatHeader';

// --- 性能优化：输入与模型选择区域 (解耦高频局部状态) ---
const ChatInputArea = React.memo(
  ({
    isStreaming,
    handleSend,
    selectedModel,
    setSelectedModel,
    isSmallTalkMode,
    toggleSmallTalkMode,
  }: {
    isStreaming: boolean;
    handleSend: (val: string) => void;
    selectedModel: string;
    setSelectedModel: (val: string) => void;
    isSmallTalkMode: boolean;
    toggleSmallTalkMode: () => void;
  }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const onSend = () => {
      if (!inputValue.trim() || isStreaming) return;
      handleSend(inputValue.trim());
      setInputValue('');
    };

    return (
      <div className="border-t border-stone-200 px-6 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="向 AI 咨询任何简报内容..."
            className="flex-1 rounded-xl border border-stone-200 bg-white/50 px-4 py-2.5 text-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-white/10 dark:bg-stone-900/50 dark:text-white"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            disabled={isStreaming}
          />
          <button
            onClick={onSend}
            disabled={isStreaming || !inputValue.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              disabled={isStreaming}
            />

            {/* Search Toggle */}
            {/* <button
              onClick={toggleSearchGrounding}
              disabled={isStreaming || !activeModel?.hasSearch}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest transition-all ${searchGroundingEnabled && activeModel?.hasSearch
                ? 'bg-blue-600/10 text-blue-600 shadow-[0_0_15px_-5px_rgba(37,99,235,0.4)] ring-1 ring-blue-600/20'
                : 'bg-stone-100 text-stone-400 dark:bg-white/5'
                } disabled:opacity-30`}
              title="联网搜索加速/事实核底"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchGroundingEnabled && activeModel?.hasSearch ? 'ON' : 'OFF'}
            </button> */}

            {/* Small Talk Toggle */}
            <button
              onClick={toggleSmallTalkMode}
              disabled={isStreaming}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest transition-all ${
                isSmallTalkMode
                  ? 'bg-purple-600/10 text-purple-600 shadow-[0_0_15px_-5px_rgba(147,51,234,0.4)] ring-1 ring-purple-600/20'
                  : 'bg-stone-100 text-stone-400 dark:bg-white/5'
              } disabled:opacity-30`}
              title="闲聊模式：跳过本地知识库检索，直接对话"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="hidden sm:inline">闲聊</span> {isSmallTalkMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <span className="hidden text-[10px] text-stone-400 sm:inline">Esc 关闭 | Enter 发送</span>
        </div>
      </div>
    );
  },
);
ChatInputArea.displayName = 'ChatInputArea';

const AIChatModal: React.FC = () => {
  // 1. 低频改变的状态 (主容器只订阅影响其自身显隐和布局的状态)
  const isOpen = useChatStore((state) => state.isOpen);
  const setIsOpen = useChatStore((state) => state.setIsOpen);
  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const setStreaming = useChatStore((state) => state.setStreaming);
  const setStreamingContent = useChatStore((state) => state.setStreamingContent);
  const sessionMetadata = useChatStore((state) => state.sessionMetadata);
  const setSessionMetadata = useChatStore((state) => state.setSessionMetadata);
  const clearHistory = useChatStore((state) => state.clearHistory);
  const searchGroundingEnabled = useChatStore((state) => state.searchGroundingEnabled);
  const setSearchGroundingEnabled = useChatStore((state) => state.setSearchGroundingEnabled);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const isExpanded = useChatStore((state) => state.isExpanded);
  const setIsExpanded = useChatStore((state) => state.setIsExpanded);
  const isSmallTalkMode = useChatStore((state) => state.isSmallTalkMode);
  const toggleSmallTalkMode = useChatStore((state) => state.toggleSmallTalkMode);

  const openArticleModalStore = useUIStore((state) => state.openModal);
  const addArticlesToStore = useArticleStore((state) => state.addArticles);

  const handleOpenArticle = React.useCallback(
    (article: any) => {
      if (!article?.id) return;
      addArticlesToStore([article]);
      openArticleModalStore(article.id);
    },
    [addArticlesToStore, openArticleModalStore],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingAtBottom = useRef(true);

  const activeModel = React.useMemo(
    () => MODELS.find((m) => m.id === selectedModel),
    [selectedModel],
  );

  // Auto-enable search when switching to a capable model (UX consistency)
  useEffect(() => {
    if (activeModel?.hasSearch) {
      setSearchGroundingEnabled(true);
    }
  }, [activeModel?.id, setSearchGroundingEnabled]);

  const handleScroll = React.useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isScrollingAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  useEffect(() => {
    if (scrollRef.current && isScrollingAtBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const isAdmin = useUIStore((state) => state.isAdmin);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        if (isAdmin) setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen, isAdmin]);

  const handleSend = async (val: string) => {
    if (!val.trim() || isStreaming) return;
    const userMsg = val.trim();
    addMessage({ role: 'user', content: userMsg });
    setStreaming(true);
    setStreamingContent('');
    setSessionMetadata([]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          useSearch: searchGroundingEnabled,
          isSmallTalkMode: isSmallTalkMode,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const serverMsg = errorData.details || errorData.message || 'Unknown Error';
        const quotaMsg = errorData.quota ? ` (限额指标: ${errorData.quota.metric})` : '';
        throw new Error(`[HTTP ${response.status}] ${serverMsg}${quotaMsg} `);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let currentMetadata: any[] = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.type === 'text') {
                assistantContent += data.content;
                setStreamingContent(assistantContent);
              } else if (data.type === 'metadata') {
                currentMetadata = data.articles || [];
                setSessionMetadata(currentMetadata);
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
        if (done) {
          if (buffer.trim() && buffer.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(buffer.trim().slice(6));
              if (data.type === 'text') {
                assistantContent += data.content;
                setStreamingContent(assistantContent);
              }
            } catch {
              /* ignore */
            }
          }
          break;
        }
      }

      const citationMatches = [...assistantContent.matchAll(CITATION_REGEX)];
      const extractedIndices = citationMatches
        .map((m) => getOriginalIndex(m[0]))
        .filter((idx) => idx !== '' && /^\d+(\.\d+)?$/.test(idx));

      const uniqueIndices = Array.from(new Set(extractedIndices.map((idx) => parseInt(idx)))).sort(
        (a, b) => a - b,
      );

      const extractedCitations = uniqueIndices
        .map((index) => {
          const meta = currentMetadata[index - 1];
          if (!meta) return null;
          return {
            id: meta.id,
            index,
            title: meta.title,
            link: meta.link,
            published: meta.published,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      const finalContent = assistantContent.replace(
        /\[统计：检索 \d+ 篇，引用了 \d+ 篇\]/,
        `[统计：检索 ${currentMetadata.length} 篇，引用了 ${extractedCitations.length} 篇]`,
      );

      addMessage({
        role: 'model',
        content: finalContent,
        citations: extractedCitations,
        contextCount: currentMetadata.length,
      });
      setStreamingContent('');
    } catch (error: any) {
      console.error('Chat Error:', error);
      addMessage({
        role: 'system',
        content: `错误: ${error.message || '助手连接异常，请稍后再试。'} `,
      });
    } finally {
      setStreaming(false);
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-in-out ${isExpanded ? 'p-0' : 'p-4 sm:p-6'} `}
    >
      <div
        className={`absolute inset-0 bg-stone-900/60 transition-opacity duration-500 ${isExpanded ? 'pointer-events-none opacity-0' : 'opacity-100'} `}
        onClick={() => setIsOpen(false)}
      />
      <div
        className={`relative flex flex-col overflow-hidden border-white/20 bg-white shadow-2xl transition-all duration-500 ease-out dark:bg-stone-900 ${isExpanded ? 'h-full w-full rounded-none border-0' : 'h-[85vh] w-full max-w-2xl rounded-3xl border shadow-xl'} `}
      >
        <ChatHeader
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          clearHistory={clearHistory}
          setIsOpen={setIsOpen}
        />

        <MessageContainer
          messages={messages}
          sessionMetadata={sessionMetadata}
          handleOpenArticle={handleOpenArticle}
          isExpanded={isExpanded}
          isStreaming={isStreaming}
          scrollRef={scrollRef}
          handleScroll={handleScroll}
        />

        <ChatInputArea
          isStreaming={isStreaming}
          handleSend={handleSend}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isSmallTalkMode={isSmallTalkMode}
          toggleSmallTalkMode={toggleSmallTalkMode}
        />
      </div>
    </div>
  );
};

export default AIChatModal;
