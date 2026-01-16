import React from 'react';
import TrendsView from '@/domains/reading/components/trends/TrendsPage';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Trends - Briefing Hub',
  description: 'Explore the latest technology trends and industry updates.',
};

export default function TrendsPage() {
  return (
    <div className="dark:bg-midnight-bg min-h-screen">
      <TrendsView />
    </div>
  );
}
