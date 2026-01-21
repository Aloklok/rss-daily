import { fetchSubscriptions } from '@/domains/reading/services';
import SourceFilterClient from '@/domains/reading/components/search/SourceFilterClient';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: '按订阅源浏览 | RSS Briefing Hub',
  description: 'Browse articles by RSS source subscription.',
};

// Use ISR for best performance and crawl stability
// Revalidate daily (86400s) or aligned with filters (604800s)
export const revalidate = 604800;

export default async function SourcesPage() {
  const subscriptions = await fetchSubscriptions();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfcf8]" />}>
      <SourceFilterClient subscriptions={subscriptions} />
    </Suspense>
  );
}
