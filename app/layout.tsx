import './globals.css';
import { cookies } from 'next/headers';
import Providers from './providers';
import { Metadata } from 'next';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import GlobalUI from './components/GlobalUI';
import MainLayoutClient from './components/MainLayoutClient';
import { Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair',
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://www.alok-rss.top'),
    title: {
        default: 'RSS Briefing Hub - 全栈技术资讯雷达 | 聚焦架构设计、AI趋势与云原生',
        template: '%s | RSS简报',
    },
    description: '一站式全栈技术资讯雷达。深度聚合 Martin Fowler、ACM Queue、Netflix Tech Blog 及 CNCF 等权威信源。内容覆盖大规模分布式系统设计、Kubernetes 云原生实践、高并发后端工程及前沿 AI技术落地。为架构师与开发者提供去噪后的核心技术洞察。',
    keywords: [
        "RSS", "技术简报", "软件架构", "AI趋势", "云原生",
        "前端开发", "后端工程", "分布式系统", "Martin Fowler"
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
        description: '一站式全栈技术资讯雷达。深度聚合全球权威技术博客与架构实践，为开发者提供高价值的技术简报。',
    },
    verification: {
        other: {
            'baidu-site-verification': 'codeva-GgB4Vw1uYR',
            'msvalidate.01': 'F748D268BBC7001EA01E6B1ECF6BD15B',
        },
    },
};

export const viewport = {
    themeColor: '#ffffff',
};



import { fetchAvailableDates, getAvailableFilters, fetchStarredArticleHeaders } from './lib/data';

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('site_token');
    const isAdmin = token?.value === process.env.ACCESS_TOKEN;

    // Parallel Data Fetching for Sidebar SSR
    const [dates, availableFilters, starredHeaders] = await Promise.all([
        fetchAvailableDates().catch(() => []),
        getAvailableFilters().catch(() => ({ tags: [], categories: [] })),
        fetchStarredArticleHeaders().catch(() => [])
    ]);

    return (
        <html lang="zh-CN" className={`${inter.variable} ${playfair.variable}`}>
            <body className="font-sans antialiased">
                <Providers>
                    <MainLayoutClient
                        isAdmin={isAdmin}
                        initialDates={dates}
                        initialAvailableFilters={availableFilters}
                        initialStarredHeaders={starredHeaders}
                    >
                        {children}
                    </MainLayoutClient>
                    <GlobalUI />
                </Providers>

                {!isAdmin && (
                    <>
                        <SpeedInsights />
                        <Analytics />
                        <Script
                            id="microsoft-clarity"
                            strategy="lazyOnload"
                        >
                            {`
                                (function(c,l,a,r,i,t,y){
                                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                                })(window, document, "clarity", "script", "ugwlylpe1l");
                            `}
                        </Script>
                        {/* Cloudflare Web Analytics */}
                        <Script
                            defer
                            src='https://static.cloudflareinsights.com/beacon.min.js'
                            data-cf-beacon='{"token": "134bcf9865674fdd9600e9ce14992b59"}'
                        />
                    </>
                )}
            </body>
        </html>
    );
}

