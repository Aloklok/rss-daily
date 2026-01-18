import Link from 'next/link';
import { headers } from 'next/headers';
import { logServerBotHit } from '@/domains/security/services/bot-logger';

export default async function NotFound() {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  // Try custom header from proxy first, then Vercel header, finally fallback
  const path = headersList.get('x-current-path') || headersList.get('x-invoke-path') || '/unknown';

  // Fire and forget logging for 404s
  logServerBotHit(path, userAgent, headersList, 404).catch(console.error);

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
