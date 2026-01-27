import { ArchivePage, generateArchiveMetadata } from '@/domains/reading/features/ArchivePageServer';

export async function generateMetadata() {
    return generateArchiveMetadata({ lang: 'en' });
}

export default function ArchivePageEn() {
    return <ArchivePage lang="en" />;
}
