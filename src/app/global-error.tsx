'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * 全局错误边界 (Global Error Boundary)
 * 捕捉根布局及其子组件的致命错误
 *
 * 注意：这是最后的防线，触发时表示整个应用崩溃
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 报告到 Sentry
    Sentry.captureException(error);

    // 记录 5xx 错误到 Bot 日志（仅针对爬虫访问）
    const userAgent = navigator.userAgent;
    const path = window.location.pathname;

    // 检测是否为爬虫
    const isBotLike = /bot|crawl|spider|slurp|Googlebot|Bingbot|Baiduspider/i.test(userAgent);

    if (isBotLike) {
      fetch('/api/system/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          userAgent,
          status: 500,
          errorDigest: error.digest,
          reason: `Client 500: ${error.message || 'Unknown Error'}`,
        }),
      }).catch(() => { });
    }
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h1 className="mb-4 text-6xl font-bold text-red-500">500</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          {window.location.pathname.startsWith('/en') ? 'Critical Error' : '致命错误'}
        </h2>
        <p className="mb-8 max-w-md text-gray-600">
          {window.location.pathname.startsWith('/en')
            ? 'The application encountered an unrecoverable error. Please refresh the page or try again later.'
            : '应用遇到了无法恢复的错误。请刷新页面或稍后重试。'
          }
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-indigo-600 px-6 py-2 text-white shadow-lg transition-colors hover:bg-indigo-700"
        >
          {window.location.pathname.startsWith('/en') ? 'Refresh Page' : '刷新页面'}
        </button>
        {error.digest && <p className="mt-8 text-xs text-gray-400">Error ID: {error.digest}</p>}
      </body>
    </html>
  );
}
