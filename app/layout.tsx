import './globals.css';
import Providers from './providers';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import GlobalUI from './components/GlobalUI';
import { Inter, Playfair_Display } from 'next/font/google';

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
    themeColor: '#ffffff',
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

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
            <body className="font-sans">
                <Providers>{children}</Providers>
                <GlobalUI />
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}
