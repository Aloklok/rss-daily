// @deprecated Use @/infra/supabase
export { getSupabaseClient } from '@/infra/supabase';
// @deprecated Use @/infra/fresh-rss
export { getFreshRssClient } from '@/infra/fresh-rss';
// @deprecated Use @/domains/interaction/services/admin-auth
export { verifyAdmin } from '@/domains/interaction/services/admin-auth';

// Also check FreshRssClient type export if it was exported?
// Original file had: interface FreshRssClient ... export function getFreshRssClient
// The return type of existing calls shouldn't break.
