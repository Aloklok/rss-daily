import { NextResponse } from 'next/server';

/**
 * RFC 9727 API Catalog
 * Allows AI Agents to discover public APIs and documentation.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const catalog = {
    linkset: [
      {
        anchor: `${origin}/api/feed`,
        rel: 'alternate',
        type: 'application/rss+xml',
        title: 'RSS Feed'
      },
      {
        anchor: `${origin}/api/briefings`,
        rel: 'service-desc',
        type: 'application/json',
        title: 'Daily News Briefings API'
      },
      {
        anchor: `${origin}/docs/API.md`, // Assuming this might be available or served
        rel: 'service-doc',
        type: 'text/markdown',
        title: 'API Documentation'
      }
    ]
  };

  return NextResponse.json(catalog, {
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
