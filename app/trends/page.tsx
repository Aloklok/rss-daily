import React from 'react';
import TrendsView from '../../components/TrendsView';

export const dynamic = 'force-static';

export const metadata = {
    title: 'Trends - Briefing Hub',
    description: 'Explore the latest technology trends and industry updates.',
};

export default function TrendsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-midnight-bg">
            <TrendsView />
        </div>
    );
}
