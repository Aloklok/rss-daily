import { ArchivePage, generateArchiveMetadata } from '@/domains/reading/features/ArchivePageServer';

export async function generateMetadata() {
  return generateArchiveMetadata({ lang: 'zh' });
}

export default function ArchivePageZh() {
  return <ArchivePage lang="zh" />;
}
