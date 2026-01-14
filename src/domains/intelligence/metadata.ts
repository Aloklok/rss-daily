import { Metadata } from 'next';
import { getTodayInShanghai } from '@/domains/reading/utils/date';

export function generateBriefingMetadata(): Metadata {
  const today = getTodayInShanghai();
  return {
    title: `Daily Briefing - ${today}`,
    description: 'AI-curated daily tech news briefing and insights.',
    openGraph: {
      title: `Daily Briefing - ${today}`,
      description: 'AI-curated tech news.',
      type: 'article',
    },
  };
}
