import { generateBriefingMetadata, BriefingPage } from '@/domains/reading/features/BriefingPageServer';
import { fetchAvailableDates } from '@/domains/reading/services';
import { getTodayInShanghai } from '@/domains/reading/utils/date';

// UNIFIED ISR STRATEGY:
export const revalidate = 604800; // 7 days
export const dynamic = 'force-static';

export async function generateStaticParams() {
  const dates = await fetchAvailableDates();
  const today = getTodayInShanghai();

  // [Optimization] Only pre-generate the last 7 days
  return dates
    .filter((date) => date !== today)
    .slice(0, 7)
    .map((date) => ({
      date: date,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  return generateBriefingMetadata({ params, lang: 'zh' });
}

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
  return <BriefingPage params={params} lang="zh" />;
}
