'use client';

import { useEffect } from 'react';

/**
 * 路由级别错误边界 (Error Boundary)
 * 捕捉嵌套路由中的运行时错误，触发 5xx 日志记录
 *
 * 注意：这是客户端组件，无法直接调用服务端函数
 * 通过 API 调用来记录错误日志
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录 5xx 错误到 Bot 日志（仅针对爬虫访问）
    const userAgent = navigator.userAgent;
    const path = window.location.pathname;

    // 检测是否为爬虫（简化检测，服务端会再次验证）
    const isBotLike = /bot|crawl|spider|slurp|Googlebot|Bingbot|Baiduspider/i.test(userAgent);

    if (isBotLike) {
      // Fire-and-forget 日志记录
      fetch('/api/system/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          userAgent,
          status: 500,
          errorDigest: error.digest,
          reason: `Runtime 500: ${error.message || 'Unknown Error'}`,
        }),
      }).catch(() => {
        // 静默失败，不影响用户体验
      });
    }

    // 控制台记录用于调试
    console.error('[Error Boundary] Runtime error:', error);
  }, [error]);

  return (
    <div className="dark:bg-midnight-bg flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <h1 className="mb-4 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-6xl font-bold text-transparent">
        500
      </h1>
      <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">服务器错误</h2>
      <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
        抱歉，服务器遇到了意外错误。请稍后重试。
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-indigo-600 px-6 py-2 text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-700"
        >
          重试
        </button>
        <a
          href="/"
          className="dark:hover:bg-midnight-card rounded-full border border-gray-200 bg-white px-6 py-2 text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-200"
        >
          返回首页
        </a>
      </div>
      {error.digest && <p className="mt-8 text-xs text-gray-400">错误 ID: {error.digest}</p>}
    </div>
  );
}
