import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabaseBrowserClient = (): SupabaseClient => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase environment variables are missing. Please check your .env.local file.');
        throw new Error('Supabase environment variables are missing');
    }
    return createClient(supabaseUrl, supabaseAnonKey);
};
