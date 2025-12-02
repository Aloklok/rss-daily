import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VercelRequest, VercelResponse } from '@vercel/node';

const CACHE_DIR = path.join(process.cwd(), '.cache');



// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    try {

        fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch (e) {
        console.error('[DEV CACHE] Failed to create cache directory:', e);
    }
}

export function withCache(
    handler: (req: VercelRequest, res: VercelResponse) => Promise<any>
) {
    return async (req: VercelRequest, res: VercelResponse) => {


        // Only cache in development mode (or if we force it for debugging)
        // Relaxed check: allow if NODE_ENV is undefined (common in local) or 'development'
        const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

        if (!isDev) {
            return handler(req, res);
        }

        // Generate cache key based on URL path and query parameters (excluding _t)
        const urlPath = (req.url || '').split('?')[0];
        const queryParams = { ...req.query };
        delete queryParams._t; // Remove timestamp to allow caching

        // Sort keys to ensure consistent hash
        const sortedQuery = Object.keys(queryParams).sort().reduce((acc, key) => {
            acc[key] = queryParams[key];
            return acc;
        }, {} as Record<string, any>);

        const key = crypto
            .createHash('md5')
            .update(urlPath)
            .update(JSON.stringify(sortedQuery))
            .digest('hex');

        const cacheFile = path.join(CACHE_DIR, `${key}.json`);

        // Try to serve from cache
        if (fs.existsSync(cacheFile)) {
            try {
                const cachedData = fs.readFileSync(cacheFile, 'utf-8');
                const { body, headers } = JSON.parse(cachedData);



                // Restore headers
                if (headers) {
                    Object.entries(headers).forEach(([k, v]) => {
                        res.setHeader(k, v as string | number | readonly string[]);
                    });
                }

                return res.status(200).json(body);
            } catch (e) {
                console.error('[DEV CACHE] Error reading cache:', e);
            }
        }



        // Intercept response to cache it
        const originalJson = res.json;

        res.json = function (body: any) {
            // Only cache successful responses
            if (res.statusCode === 200) {
                try {
                    // Save to cache
                    fs.writeFileSync(cacheFile, JSON.stringify({
                        body,
                        headers: res.getHeaders(),
                        timestamp: Date.now()
                    }));

                } catch (e) {
                    console.error('[DEV CACHE] Error writing cache:', e);
                }
            }

            return originalJson.call(this, body);
        };

        return handler(req, res);
    };
}
