import { generateBriefingMetadata, BriefingPage } from '@/domains/reading/features/BriefingPageServer';
import { fetchAvailableDates } from '@/domains/reading/services';
import { getTodayInShanghai } from '@/domains/reading/utils/date';

export const revalidate = 604800;
export const dynamic = 'force-static';

export async function generateStaticParams() {
    const dates = await fetchAvailableDates();
    const today = getTodayInShanghai();

    return dates
        .filter((date) => date !== today)
        .slice(0, 7)
        .map((date) => ({
            date: date,
        }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
    return generateBriefingMetadata({ params, lang: 'en' });
}

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
    return <BriefingPage params={params} lang="en" />;
}
