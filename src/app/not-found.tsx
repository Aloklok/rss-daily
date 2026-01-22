import Link from 'next/link';
import { headers } from 'next/headers';
import { logServerBotHit } from '@/domains/security/services/bot-logger';

// 兜底日志：只在 Next.js 直接触发 404（非页面组件主动调用）时记录
async function logFallbackError(headersList: Headers) {
  try {
    const userAgent = headersList.get('user-agent') || '';
    // 优先使用中间件传递的 path，其次尝试 Next.js 内部 header，最后兜底
    // 辅助函数：获取 header 值，忽略无效值和 /_not-found
    const getPath = (key: string) => {
      const val = headersList.get(key);
      return val && val !== '/_not-found' ? val : null;
    };

    let path =
      getPath('x-current-path') ||
      getPath('x-invoke-path') ||
      getPath('x-matched-path') ||
      getPath('x-url') || // 某些环境可能存在的原始 URL
      '';

    const routePattern = headersList.get('x-route-pattern');

    // 策略调整：
    // 如果 edge 识别了路由 (routePattern 存在)，说明这是一次由页面组件触发的 (notFound())
    // 或者页面组件未能处理的 404。
    // 在新架构下，页面组件负责记录详细的业务/服务错误 (logBotError)。
    // 因此，这里如果再记录 "未知错误"，会造成日志重复。
    // 所以：只有当 routePattern 存在时，我们才跳过（由页面组件负责）。
    if (routePattern) return;

    // 如果没有 routePattern (绕过中间件) 且没有 path (通常是静态资源)，
    // 我们仍然记录，但尝试提供更多调试信息。
    let reason = '路由不存在';
    let debugMeta = {};

    if (!path) {
      path = '(unknown_path)';
      reason = '静态资源缺失或绕过';
      // 收集所有 headers 用于调试诊断
      const headerDump: Record<string, string> = {};
      headersList.forEach((v, k) => (headerDump[k] = v));
      debugMeta = { debug_headers: headerDump };
    }

    await logServerBotHit(path, userAgent, headersList, 404, {
      source: 'not-found-fallback',
      reason,
      ...debugMeta,
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
