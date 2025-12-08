// components/ArticleDetail.tsx

import React, { useEffect, useState, useRef } from 'react';
import { Article, CleanArticleContent, Tag } from '../types'; // 导入 Tag
import { getCleanArticleContent } from '../services/api';
import { useArticleMetadata } from '../hooks/useArticleMetadata';
import { getRandomColorClass } from '../utils/colorUtils';

interface ArticleDetailProps {
  article: Article;
  onClose?: () => void;
}



import { removeEmptyParagraphs } from '../utils/contentUtils';

function stripLeadingTitle(contentHtml: string, title: string): string {
  if (!contentHtml || !title) return contentHtml;
  try {
    const h1Match = contentHtml.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      const h1Text = h1Match[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
      const titleLower = title.toLowerCase().trim();
      if (h1Text && (h1Text === titleLower || h1Text.includes(titleLower) || titleLower.includes(h1Text))) {
        return contentHtml.replace(h1Match[0], '');
      }
    }
    const textStart = contentHtml.replace(/^\s+/, '');
    if (textStart.toLowerCase().startsWith(title.toLowerCase().trim())) {
      return contentHtml.replace(new RegExp('^\\s*' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '');
    }
  } catch (e) {
    console.error('stripLeadingTitle error', e);
  }
  return contentHtml;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [content, setContent] = useState<CleanArticleContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content || !contentRef.current) return;
    try {
      const text = contentRef.current.innerText;
      const fullText = `${content.title || article.title}\n\n${text}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const isSentinel = article.link === 'about:blank' || String(article.id).startsWith('empty-');

  // 【新增】调用辅助函数获取标签文本
  const { userTagLabels } = useArticleMetadata(article);


  useEffect(() => {
    // 【增】添加键盘事件监听器
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        if (contentRef.current) {
          event.preventDefault();
          const range = document.createRange();
          range.selectNodeContents(contentRef.current);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    };
    // 【增】组件挂载时添加监听，卸载时移除
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // 【查】空依赖数组确保只在挂载和卸载时运行


  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (isSentinel) {
        if (!mounted) return;
        setIsLoading(false);
        setError(null);
        setContent(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setContent(null);
      try {
        const url = article.link;
        const data = await getCleanArticleContent({ ...article, link: url });
        if (!mounted) return;

        let contentHtml = (data && data.content) || '';
        const hasUsefulContent = contentHtml && contentHtml.trim().length > 40;

        if (!hasUsefulContent) {
          if (article.summary && article.summary.trim().length > 0) {
            contentHtml = article.summary;
          } else {
            contentHtml = `<p>无法从目标站点提取可读内容。您可以点击下面的链接查看原文：</p><p><a href="${article.link}" target="_blank" rel="noopener noreferrer">打开原文</a></p>`;
          }
        }

        const cleanedHtml = stripLeadingTitle(contentHtml, (data && data.title) || article.title || '');
        const finalHtml = removeEmptyParagraphs(cleanedHtml);
        setContent({ title: (data && data.title) || article.title, source: (data && data.source) || article.sourceName, content: finalHtml });
      } catch (e: any) {
        console.error('ArticleDetail fetch error', e);
        if (mounted) setError(e.message || 'Failed to load article');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [article, isSentinel]);

  // Determine display data: prefer fetched content, fallback to prop article
  const displayTitle = (content && content.title) || article.title;
  const displaySource = (content && content.source) || article.sourceName;
  const displayContent = (content && content.content);

  return (
    <div className="p-2 md:p-8">
      <article className="select-none">
        <header className="mb-6 border-b pb-6">
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-gray-900 dark:text-midnight-text-reader mb-2">{displayTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">来源: {displaySource}</p>

          {/* 【核心修改】在这里渲染标签 */}
          {userTagLabels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {userTagLabels.map(label => (
                <span key={label} className={`text-sm font-semibold inline-block py-1 px-3 rounded-full ${getRandomColorClass(label)}`}>
                  #{label}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-3">

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors"
              title="复制全文"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 dark:text-green-400">已复制</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  <span>复制</span>
                </>
              )}
            </button>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors"
              title="打开原文"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span>原文</span>
            </a>
          </div>
        </header>

        {/* Body content section */}
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>无法加载文章内容：{error}</p>
          </div>
        ) : displayContent ? (
          <div id="article-detail-content" ref={contentRef} className="prose prose-lg max-w-none text-gray-800 dark:text-midnight-text-reader dark:prose-invert leading-relaxed mt-6 select-text" dangerouslySetInnerHTML={{ __html: displayContent }} />
        ) : (
          <div className="text-gray-500 py-10">
            <p>正在获取全文内容...</p>
            <p className="text-sm mt-2">如果长时间未加载，请尝试点击上方“原文”按钮。</p>
          </div>
        )}
      </article>
    </div>
  );
};

export default ArticleDetail;