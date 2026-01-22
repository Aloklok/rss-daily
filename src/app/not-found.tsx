import Link from 'next/link';
import { headers } from 'next/headers';
import { logServerBotHit } from '@/domains/security/services/bot-logger';

// 兜底日志：只在 Next.js 直接触发 404（非页面组件主动调用）时记录
async function logFallbackError(headersList: Headers) {
  try {
    const userAgent = headersList.get('user-agent') || '';
    const path =
      headersList.get('x-current-path') || headersList.get('x-invoke-path') || '/unknown';
    const routePattern = headersList.get('x-route-pattern');

    // 只有当 edge 层识别了路由，但页面依然 404 时（且没有被页面组件捕获），才是"未知错误"
    // 或者是真正的"路由不存在"（routePattern 为空）
    const reason = routePattern ? `未知错误: ${routePattern}` : '路由不存在';

    // 注意：这里我们无法区分"已经记录过日志的 notFound() 调用"和"原生 404"
    // 但由于我们在页面组件中记录的是 API 调用，这里是服务端组件渲染
    // 如果 bot_hits 表中已经有了 API 记录的日志，这里可能会有一条重复的 "未知错误" 或 "路由不存在"
    // 但这是可接受的，作为最后的防线。
    // 更优化的做法是：页面组件 notFound() 前设置一个 header 标记，但这需要 middleware 配合，过于复杂。
    // 目前保持简单：兜底记录。

    await logServerBotHit(path, userAgent, headersList, 404, {
      source: 'not-found-fallback',
      reason,
    });
  } catch (e) {
    console.error('Failed to log 404 fallback:', e);
  }
}

export default async function NotFound() {
  const headersList = await headers();

  // 尝试记录兜底日志 fire-and-forget
  logFallbackError(headersList).catch(() => {});

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-stone-100 p-4">
        <svg
          className="h-8 w-8 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
        404 Not Found
      </h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-stone-600">
        抱歉，我们找不到您要访问的页面。
        <span className="mt-2 block text-sm text-stone-400">
          可能是链接已过期或您输入的地址有误。
        </span>
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-800 focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:outline-none"
        >
          返回首页
        </Link>
        <Link
          href="/archive"
          className="rounded-full border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:outline-none"
        >
          浏览归档
        </Link>
      </div>
    </div>
  );
}
