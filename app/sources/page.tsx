import { fetchSubscriptions } from '../../lib/server/dataFetcher';
import SourceFilterClient from '../../components/features/search/SourceFilterClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '按订阅源浏览 | RSS Briefing Hub',
  description: 'Browse articles by RSS source subscription.',
};

// Force dynamic rendering because we rely on searchParams and external API data
export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const subscriptions = await fetchSubscriptions();

  return <SourceFilterClient subscriptions={subscriptions} />;
}
