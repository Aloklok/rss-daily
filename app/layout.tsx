import './globals.css';
import Providers from './providers';
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

export const metadata = {
    title: 'Briefing Hub',
    description: 'Personal RSS Briefing Hub',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Briefing',
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/computer_cat_180.jpeg',
    },
};

export const viewport = {
    themeColor: '#ffffff',
};

import { cookies } from 'next/headers';

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get('site_token');
    const isAdmin = token?.value === process.env.ACCESS_TOKEN;

    return (
        <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
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

