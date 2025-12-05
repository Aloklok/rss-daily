import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// --- Supabase Client (Server-Side Only) ---
let supabase: SupabaseClient;
export function getSupabaseClient(): SupabaseClient {
    if (!supabase) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Supabase environment variables are not configured.");
        }
        supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    }
    return supabase;
}

// --- FreshRSS Client ---
interface FreshRssClient {
    get: <T>(path: string, params?: Record<string, string>) => Promise<T>;
    post: <T>(path: string, body: URLSearchParams) => Promise<T>;
    getActionToken: () => Promise<string>;
}

let freshRssClient: FreshRssClient;
export function getFreshRssClient(): FreshRssClient {
    if (!freshRssClient) {
        const apiUrl = process.env.FRESHRSS_API_URL;
        const authToken = process.env.FRESHRSS_AUTH_TOKEN;
        if (!apiUrl || !authToken) {
            throw new Error("FreshRSS environment variables are not configured.");
        }

        const headers = {
            'Authorization': `GoogleLogin auth=${authToken}`,
        };

        const request = async <T>(path: string, options: RequestInit = {}, params: Record<string, string> = {}): Promise<T> => {
            const url = new URL(`${apiUrl}/greader.php/reader/api/0${path}`);
            Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

            const response = await fetch(url.toString(), { ...options, headers });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`FreshRSS API Error: ${response.status} ${errorText}`);
            }
            if (response.headers.get('Content-Type')?.includes('application/json')) {
                return response.json();
            }
            // @ts-ignore
            return response.text();
        };

        freshRssClient = {
            get: <T>(path: string, params: Record<string, string> = {}): Promise<T> => {
                return request<T>(path, {}, params);
            },
            post: <T>(path: string, body: URLSearchParams): Promise<T> => {
                return request<T>(path, {
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body,
                });
            },
            getActionToken: async (): Promise<string> => {
                const token = await request<string>('/token');
                return token.trim();
            }
        };
    }
    return freshRssClient;
}

// --- Admin Verification Helper ---
export function verifyAdmin(cookieStore: Awaited<ReturnType<typeof cookies>>): boolean {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) return false;

    const siteToken = cookieStore.get('site_token')?.value;
    return siteToken === accessToken;
}
