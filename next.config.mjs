/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/((?!widget/).*)', // Apply security headers to everything EXCEPT /widget/
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
            {
                source: '/widget/:path*', // Explicitly allow framing for widget
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors *", // Allow any site (including start.me) to iframe this path
                    },
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*', // Allow CORS for fonts/assets
                    }
                    // Removed invalid 'X-Frame-Options: ALLOWALL'.
                    // To include everything, we simply DO NOT send the X-Frame-Options header for this route.
                ],
            },
            {
                source: '/(.*).(jpg|jpeg|png|webp|avif|ico|svg)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/sitemap.xml',
                destination: '/api/sitemap',
            },
        ];
    },
};

export default nextConfig;
