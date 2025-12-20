import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */


const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});
const nextConfig = {
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  reactCompiler: true,
  experimental: {
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Only externalize supabase during bundle analysis (Webpack build) to avoid build errors.
  // In normal production builds (Turbopack/Default), externalizing it causes "Cannot use import statement" runtime errors.
  serverExternalPackages: process.env.ANALYZE === 'true' ? ['@supabase/supabase-js'] : [],

  async headers() {
    return [
      {
        source: '/((?!widget|trends).*)', // Apply security headers to everything EXCEPT /widget and /trends
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
        source: '/:path(widget|trends)', // Matches /widget or /trends exactly
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Allow CORS for fonts/assets
          },
        ],
      },
      {
        source: '/:path(widget|trends)/:path*', // Matches subpaths like /widget/clock
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Allow CORS for fonts/assets
          },
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

export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: 'alok-rss',

    project: 'sentry-amber-house',

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: '/monitoring',



    // Transpiles SDK to be compatible with Next.js setup, enabling better tree shaking
    transpileClientSDK: true,

    // Hides source maps from generated client bundles
    hideSourceMaps: true,
  })
);
