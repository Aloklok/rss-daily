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
    metadataBase: new URL('https://alok-rss.top'),
    title: {
        default: 'Briefing Hub | 每日简报',
        template: '%s | Briefing Hub',
    },
    description: 'Personal RSS Briefing Hub & Daily AI Summaries | 个人 RSS 简报中心与每日 AI 精选',
    keywords: ['RSS', 'Briefing', 'AI', 'Daily Updates', 'Technology', 'News', '简报', '每日更新', '科技', '新闻'],
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
        url: 'https://alok-rss.top',
        siteName: 'RSS Briefing Hub | 每日简报',
        title: 'RSS Briefing Hub | 每日简报',
        description: 'Your personal AI-curated daily briefing. | 您的个人 AI 每日简报。',
    },
    verification: {
        other: {
            'baidu-site-verification': 'odeva-7lgkDNRxbE',
            'msvalidate.01': 'F748D268BBC7001EA01E6B1ECF6BD15B',
        },
    },
};

export const viewport = {
    themeColor: '#ffffff',
};



export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('site_token');
    const isAdmin = token?.value === process.env.ACCESS_TOKEN;

    return (
        <html lang="zh-CN" className={`${inter.variable} ${playfair.variable}`}>
            <body className="font-sans antialiased">
                <Providers>
                    <MainLayoutClient>
                        {children}
                    </MainLayoutClient>
                    <GlobalUI />
                </Providers>

                {/* 仅在非管理员模式下加载统计脚本 */}
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
                    </>
                )}
            </body>
        </html>
    );
}

