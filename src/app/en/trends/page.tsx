import { TrendsPage, generateTrendsMetadata } from '@/domains/reading/features/TrendsPageServer';

export const dynamic = 'force-static';

export const metadata = generateTrendsMetadata({ lang: 'en' });

export default function Page() {
    return <TrendsPage lang="en" />;
}
