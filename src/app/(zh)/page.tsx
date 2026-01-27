import { HomePage, generateHomePageMetadata } from '@/domains/reading/features/HomePageServer';

export const revalidate = 604800; // 7 days
export const dynamic = 'force-static';

export async function generateMetadata() {
  return generateHomePageMetadata({ lang: 'zh' });
}

export default function Home() {
  return <HomePage lang="zh" />;
}
