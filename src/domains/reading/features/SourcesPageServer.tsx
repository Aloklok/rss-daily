import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { fetchSubscriptions } from '@/domains/reading/services';
import SourceFilterClient from '@/domains/reading/components/search/SourceFilterClient';
import { logBotError } from '@/app/lib/server/log-bot-error'; // Fix import path if needed
import { zh, en } from '@/app/i18n/dictionaries';

type Lang = 'zh' | 'en';

interface PageProps {
  lang: Lang;
}

export function generateSourcesMetadata({ lang }: { lang: Lang }): Metadata {
  const isEn = lang === 'en';
  const baseUrl = 'https://www.alok-rss.top';

  return {
    title: isEn ? 'Browse by Source | RSS Briefing Hub' : '按订阅源浏览 | RSS Briefing Hub',
    description: isEn ? 'Browse articles by RSS source subscription.' : '按 RSS 订阅源浏览文章。',
    alternates: {
      canonical: isEn ? `${baseUrl}/en/sources` : `${baseUrl}/sources`,
      languages: {
        zh: `${baseUrl}/sources`,
        en: `${baseUrl}/en/sources`,
      },
    },
  };
}

export async function SourcesPage({ lang }: PageProps) {
  const isEn = lang === 'en';
  const dict = isEn ? en : zh;
  const tableName = isEn ? 'articles_view_en' : 'articles_view';
  const path = isEn ? '/en/sources' : '/sources';

  let subscriptions;
  let errorReason: string | undefined;

  try {
    subscriptions = await fetchSubscriptions();
  } catch (e: any) {
    console.error(`[SourcesPage ${lang}] fetchSubscriptions failed:`, e);
    errorReason = `FreshRSS Error: ${e.message || 'unknown'}`;
  }

  // If service call failed, log and show 404
  if (errorReason) {
    await logBotError(path, errorReason);
    notFound();
  }

  const { purifySubscriptions } = await import('@/domains/reading/utils/label-display');
  const purifiedSubscriptions = isEn
    ? purifySubscriptions(subscriptions || [], 'en')
    : subscriptions;

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfcf8]" />}>
      <SourceFilterClient
        subscriptions={purifiedSubscriptions || []}
        dict={dict}
        tableName={tableName}
      />
    </Suspense>
  );
}
