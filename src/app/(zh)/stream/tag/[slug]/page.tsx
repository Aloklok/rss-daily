import { StreamPage, generateStreamMetadata } from '@/domains/reading/features/StreamPageServer';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    return generateStreamMetadata({ params, lang: 'zh', type: 'tag' });
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
    return <StreamPage params={params} lang="zh" type="tag" />;
}
