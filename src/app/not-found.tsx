import Link from 'next/link';
import { headers } from 'next/headers';
import { logServerBotHit } from '@/domains/security/services/bot-logger';

export default async function NotFound({ reason }: { reason?: string }) {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  // Enhanced path detection - capture ALL possible path indicators
  const path = headersList.get('x-current-path') || headersList.get('x-invoke-path') || '/unknown';
  const rawInvokePath = headersList.get('x-invoke-path'); // Original request path
  const nextMatchedPath = headersList.get('x-nextjs-matched-path'); // Next.js routing info

  const referer = headersList.get('referer');
  const meta = {
    referer,
    headers: {
      'accept-language': headersList.get('accept-language'),
      'sec-ch-ua': headersList.get('sec-ch-ua'),
    },
    source: 'not-found-page',
    reason: reason || 'Path not matched',
    // Enhanced path tracking
    real_hit_path: path, // Path we're logging
    raw_invoke_path: rawInvokePath, // Raw path from x-invoke-path
    next_matched_path: nextMatchedPath, // Next.js matched pattern
    // Vercel Edge diagnostics (helps identify if request reached Vercel)
    edge_region: headersList.get('x-vercel-id')?.split('::')[0] || null, // e.g. hnd1 = Tokyo
    vercel_request_id: headersList.get('x-vercel-id') || null,
    request_timestamp: new Date().toISOString(),
  };

  // Fire and forget logging for 404s
  logServerBotHit(path, userAgent, headersList, 404, meta).catch(console.error);

  return (
    <div className="dark:bg-midnight-bg flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <h1 className="mb-4 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-6xl font-bold text-transparent">
        404
      </h1>
      <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
        Page Not Found
      </h2>
      <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
        Sorry, the page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-full bg-indigo-600 px-6 py-2 text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-700"
        >
          Return Home
        </Link>
        <Link
          href="/trends"
          className="dark:hover:bg-midnight-card rounded-full border border-gray-200 bg-white px-6 py-2 text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-200"
        >
          Explore Trends
        </Link>
      </div>
    </div>
  );
}
