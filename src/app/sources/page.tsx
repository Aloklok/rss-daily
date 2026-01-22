import { fetchSubscriptions } from '@/domains/reading/services';
import SourceFilterClient from '@/domains/reading/components/search/SourceFilterClient';
import { Metadata } from 'next';
import { Suspense } from 'react';
import NotFound from '../not-found';

export const metadata: Metadata = {
  title: '按订阅源浏览 | RSS Briefing Hub',
  description: 'Browse articles by RSS source subscription.',
};

// Use ISR for best performance and crawl stability
// Revalidate daily (86400s) or aligned with filters (604800s)
export const revalidate = 604800;

export default async function SourcesPage() {
  let subscriptions;
  let errorReason: string | undefined;

  try {
    subscriptions = await fetchSubscriptions();
  } catch (e: any) {
    console.error('[SourcesPage] fetchSubscriptions failed:', e);
    errorReason = `FreshRSS服务异常: ${e.message || 'unknown'}`;
  }

  // If service call failed, show NotFound with precise reason
  if (errorReason) {
    return <NotFound reason={errorReason} />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfcf8]" />}>
      <SourceFilterClient subscriptions={subscriptions || []} />
    </Suspense>
  );
}
