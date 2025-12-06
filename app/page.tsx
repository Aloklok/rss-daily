import { fetchAvailableDates } from './lib/data';
import MainContentClient from './components/MainContentClient';
import { resolveBriefingImage } from '../services/articleLoader';

export const dynamic = 'force-dynamic';

export default async function Home() {
    const dates = await fetchAvailableDates();
    const initialDate = dates.length > 0 ? dates[0] : undefined;

    let headerImageUrl = undefined;
    if (initialDate) {
        headerImageUrl = await resolveBriefingImage(initialDate);
    }

    const recentDates = dates.slice(0, 10);

    // Construct CollectionPage Schema
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        headline: 'RSS Briefing Hub - Daily AI Updates | 每日简报归档',
        description: 'Index of daily AI-curated technology briefings. | 每日 AI 科技简报索引。',
        url: 'https://alok-rss.top',
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: recentDates.map((date, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://alok-rss.top/date/${date}`,
                name: `${date} Briefing | 每日简报`
            }))
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <MainContentClient initialDate={initialDate} initialHeaderImageUrl={headerImageUrl} />
        </>
    );
}
