import 'server-only';

export interface FreshRSSItem {
  id: string;
  title: string;
  published: number; // Unix timestamp
  alternate?: { href: string }[];
  origin?: { title: string };
  canonical?: { href: string }[];
  categories?: string[];
  tags?: string[]; // Validated: contains user labels only
  annotations?: { id: string }[];
  summary?: { content: string };
  content?: { content: string };
}

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
      throw new Error('FreshRSS environment variables are not configured.');
    }

    const headers = {
      Authorization: `GoogleLogin auth=${authToken}`,
    };

    const request = async <T>(
      path: string,
      options: RequestInit = {},
      params: Record<string, string> = {},
    ): Promise<T> => {
      const url = new URL(`${apiUrl}/greader.php/reader/api/0${path}`);
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

      const fetchTimeout = process.env.CI ? 3000 : 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

      try {
        const response = await fetch(url.toString(), {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`FreshRSS API Error: ${response.status} ${errorText}`);
        }
        if (response.headers.get('Content-Type')?.includes('application/json')) {
          return response.json();
        }
        // @ts-expect-error -- return type mismatch with stream processing
        return response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
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
      },
    };
  }
  return freshRssClient;
}
