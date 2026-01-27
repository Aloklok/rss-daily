import { SourcesPage, generateSourcesMetadata } from '@/domains/reading/features/SourcesPageServer';

export const revalidate = 604800;

export const metadata = generateSourcesMetadata({ lang: 'zh' });

export default function Page() {
  return <SourcesPage lang="zh" />;
}
