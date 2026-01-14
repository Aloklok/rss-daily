import './globals.css';
import Providers from '@/shared/providers/Providers';
import { Metadata } from 'next';
import GlobalUI from '@/shared/components/layout/GlobalUI';
import MainLayoutClient from '@/shared/components/layout/MainLayoutClient';
import { Inter, Playfair_Display } from 'next/font/google';
import AnalyticsScripts from '@/shared/components/analytics/AnalyticsScripts';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true, // Default, but making it explicit. Used everywhere.
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true, // Only used in articles, avoid preloading on home page to fix warnings
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.alok-rss.top'),
  title: {
    default: 'RSS Briefing Hub - 全栈技术资讯雷达 | 聚焦架构设计、AI趋势与云原生',
    template: '%s | RSS简报',
  },
  description:
    '一站式全栈技术资讯雷达。深度聚合 Martin Fowler、ACM Queue、Netflix Tech Blog 及 CNCF 等权威信源。内容覆盖大规模分布式系统设计、Kubernetes 云原生实践、高并发后端工程及前沿 AI技术落地。为架构师与开发者提供去噪后的核心技术洞察。',
  keywords: [
    'RSS',
    '技术简报',
    '软件架构',
    'AI趋势',
    '云原生',
    '前端开发',
    '后端工程',
    '分布式系统',
    'Martin Fowler',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/computer_cat_180.jpeg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Briefing',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://www.alok-rss.top',
    siteName: 'RSS Briefing Hub',
    title: 'RSS Briefing Hub - 全栈技术资讯雷达',
    description:
      '一站式全栈技术资讯雷达。深度聚合全球权威技术博客与架构实践，为开发者提供高价值的技术简报。',
  },
  verification: {
    other: {
      'baidu-site-verification': 'codeva-GgB4Vw1uYR',
      'msvalidate.01': 'F748D268BBC7001EA01E6B1ECF6BD15B',
    },
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#2e2a36' }, // Approximate dark purple for sidebar
  ],
};

import {
  fetchAvailableDates,
  getAvailableFilters,
  fetchStarredArticleHeaders,
} from '@/domains/reading/services';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Parallel Data Fetching for Sidebar SSR
  const [dates, availableFilters, starredHeaders] = await Promise.all([
    fetchAvailableDates().catch(() => []),
    getAvailableFilters().catch(() => ({ tags: [], categories: [] })),
    fetchStarredArticleHeaders().catch(() => []),
  ]);

  return (
    <html lang="zh-CN" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <MainLayoutClient
            initialDates={dates}
            initialAvailableFilters={availableFilters}
            initialStarredHeaders={starredHeaders}
          >
            {children}
          </MainLayoutClient>
          <GlobalUI />
        </Providers>

        <AnalyticsScripts />
      </body>
    </html>
  );
}
