import { TrendsPage, generateTrendsMetadata } from '@/domains/reading/features/TrendsPageServer';

export const dynamic = 'force-static';

export const metadata = generateTrendsMetadata({ lang: 'zh' });

export default function Page() {
  return <TrendsPage lang="zh" />;
}
