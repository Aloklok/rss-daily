import { HomePage, generateHomePageMetadata } from '@/domains/reading/features/HomePageServer';

export const revalidate = 604800; // 7 days
export const dynamic = 'force-static';

export async function generateMetadata() {
    return generateHomePageMetadata({ lang: 'en' });
}

export default function HomeEn() {
    return <HomePage lang="en" />;
}
