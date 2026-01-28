import '../globals.css';
import Providers from '@/shared/providers/Providers';
import { Metadata } from 'next';
import GlobalUI from '@/shared/components/layout/GlobalUI';
import MainLayoutServer from '@/shared/components/layout/MainLayoutServer';
import { Inter, Playfair_Display } from 'next/font/google';
import AnalyticsScripts from '@/shared/components/analytics/AnalyticsScripts';
import { getAvailableFilters } from '@/domains/reading/services';
import { en } from '@/app/i18n/dictionaries';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.alok-rss.top'),
  title: {
    default: 'RSS Briefing Hub - Full Stack Tech Radar',
    template: '%s | RSS Briefing',
  },
  description:
    'One-stop Full Stack Tech Radar. Aggregating insights from Martin Fowler, ACM Queue, Netflix Tech Blog, and CNCF. Covering Distributed Systems, Kubernetes, Backend Engineering, and Applied AI.',
  keywords: [
    'RSS',
    'Tech Briefing',
    'Software Architecture',
    'AI Trends',
    'Cloud Native',
    'Backend Engineering',
    'Distributed Systems',
  ],
  manifest: '/manifest.json', // Shared
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
    locale: 'en_US',
    url: 'https://www.alok-rss.top/en',
    siteName: 'RSS Briefing Hub',
    title: 'RSS Briefing Hub - Full Stack Tech Radar',
    description: 'Aggregating insights from global tech blogs and architecture practices.',
  },
  // Verification codes shared
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
    { media: '(prefers-color-scheme: dark)', color: '#2e2a36' },
  ],
};

export default async function EnRootLayout({ children }: { children: React.ReactNode }) {
  // Parallel Data Fetching for Sidebar SSR (English specific)
  const [dates, rawAvailableFilters] = await Promise.all([
    import('@/domains/reading/services').then((mod) => mod.fetchAvailableDatesEn()),
    getAvailableFilters().catch(() => ({ tags: [], categories: [] })),
  ]);

  const { getDisplayLabel } = await import('@/domains/reading/utils/label-display');
  const { getSlug } = await import('@/domains/reading/utils/slug-helper');

  const availableFilters = {
    categories: (rawAvailableFilters.categories || [])
      .map((c) => ({
        ...c,
        id: getSlug(c.id), // Transform ID to slug
        label: getDisplayLabel(c.label, 'category', 'en'),
      }))
      // Filter out any categories where label still contains Chinese
      .filter((c) => !/[\u4e00-\u9fa5]/.test(c.label)),
    tags: (rawAvailableFilters.tags || [])
      .map((t) => ({
        ...t,
        id: getSlug(t.id), // Transform ID to slug
        label: getDisplayLabel(t.label, 'tag', 'en'),
      }))
      // Filter out any tags where label still contains Chinese
      .filter((t) => !/[\u4e00-\u9fa5]/.test(t.label)),
  };

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <noscript>
          <style>{`
            #sidebar-ssr-nav { display: block !important; }
            #sidebar-skeleton { display: none !important; }
            #sidebar-client-nav { display: none !important; }
          `}</style>
        </noscript>
        <Providers>
          <MainLayoutServer
            initialDates={dates}
            initialAvailableFilters={availableFilters}
            dict={en}
          >
            {children}
          </MainLayoutServer>
          <GlobalUI dict={en} />
        </Providers>

        <AnalyticsScripts />
      </body>
    </html>
  );
}
