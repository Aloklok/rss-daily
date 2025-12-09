/**
 * IndexNow API Integration
 * 
 * Submits URLs to Bing and other IndexNow-enabled search engines to reflect
 * content changes (create, update, delete) immediately.
 * 
 * Host: alok-rss.top
 * Key: 5053a5ea56874c8e9ee65c7100006ca9
 */

export const INDEXNOW_HOST = 'www.alok-rss.top';
export const INDEXNOW_KEY = '5053a5ea56874c8e9ee65c7100006ca9';

/**
 * Submits a list of URLs to IndexNow.
 * 
 * @param urls Array of absolute URLs to submit (e.g. ['https://alok-rss.top/article/123'])
 * @returns Promise that resolves to true if successful, false otherwise.
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<boolean> {
    if (!urls || urls.length === 0) {
        console.warn('[IndexNow] No URLs provided for submission.');
        return false;
    }

    const endpoint = 'https://api.indexnow.org/indexnow';

    const payload = {
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls
    };

    try {
        console.log(`[IndexNow] Submitting ${urls.length} URL(s) to ${endpoint}...`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log('[IndexNow] Submission successful.');
            return true;
        } else {
            const errorText = await response.text();
            console.error(`[IndexNow] Submission failed. Status: ${response.status}. Response: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error('[IndexNow] Error submitting URLs:', error);
        return false;
    }
}
