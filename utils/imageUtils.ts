export async function resolveBriefingImage(date: string): Promise<string> {
  // Direct return of Seed URL to avoid 1.5s TTFB blocking.
  // Next.js Image component handles URL and redirects automatically.
  return `https://picsum.photos/seed/${date}/1600/1200`;
}
