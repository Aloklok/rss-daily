import { headers } from 'next/headers';

/**
 * CDN Pre-warming Utility
 * Triggers a background fetch to hit the page and populate the ISR/CDN cache.
 * This should be called AFTER revalidateTag/revalidatePath.
 */
export async function prewarmCache(date: string, lang: 'zh' | 'en' = 'zh') {
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';

    // We don't use absolute URLs in fetch usually if it's internal,
    // but for CDN pre-warming we want a real request to the edge.
    const baseUrl = `${protocol}://${host}`;
    const prefix = lang === 'en' ? '/en' : '';

    const targets = [`${baseUrl}${prefix}/date/${date}`];

    // If it's today, also warm the homepage
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
      new Date(),
    );
    if (date === today) {
      // Home
      targets.push(`${baseUrl}${prefix === '' ? '/' : prefix}`);
    }

    console.log(`[Pre-warm] Starting background warming for: ${targets.join(', ')}`);

    // We do NOT await these to avoid blocking the API response
    // We use a small delay to ensure Next.js has processed the revalidation internally
    setTimeout(() => {
      targets.forEach((url) => {
        fetch(url, {
          headers: {
            'User-Agent': 'BriefingHub-Prewarmer/1.0',
            // We might need to bypass our own auth cookies if we have middleware,
            // but for ISR/Static pages they are public.
          },
        }).catch((err) => console.error(`[Pre-warm] Failed to warm ${url}:`, err));
      });
    }, 1000);
  } catch (error) {
    console.error('[Pre-warm] Error in prewarm logic:', error);
  }
}
