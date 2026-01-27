import React from 'react';
import TrendsView from '@/domains/reading/components/trends/TrendsPage';
import { zh, en } from '@/app/i18n/dictionaries';

type Lang = 'zh' | 'en';

interface PageProps {
    lang: Lang;
}

export function generateTrendsMetadata({ lang }: { lang: Lang }) {
    const isEn = lang === 'en';
    const baseUrl = 'https://www.alok-rss.top';

    return {
        title: 'Trends - Briefing Hub',
        description: isEn
            ? 'Explore the latest technology trends and industry updates.'
            : '探索最新的技术趋势和行业动态。',
        alternates: {
            canonical: isEn ? `${baseUrl}/en/trends` : `${baseUrl}/trends`,
            languages: {
                'zh': `${baseUrl}/trends`,
                'en': `${baseUrl}/en/trends`,
            },
        },
    };
}

export function TrendsPage({ lang }: PageProps) {
    const isEn = lang === 'en';
    const dict = isEn ? en : zh;
    const baseUrl = 'https://www.alok-rss.top';
    const url = isEn ? `${baseUrl}/en/trends` : `${baseUrl}/trends`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Trends & Tools',
        description: isEn
            ? 'Explore the latest technology trends and industry updates.'
            : '探索最新的技术趋势和行业动态。',
        url: url,
        inLanguage: isEn ? 'en-US' : 'zh-CN',
    };

    return (
        <div className="dark:bg-midnight-bg min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <TrendsView dict={dict} />
        </div>
    );
}
