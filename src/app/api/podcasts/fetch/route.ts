import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/infrastructure/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const date = url.searchParams.get('date');

        if (!date) {
            return Response.json({ error: 'Date is required' }, { status: 400 });
        }

        const supabase = getSupabaseClient();
        const { data: existingPodcast } = await supabase
            .from('daily_podcasts')
            .select('script_content')
            .eq('date', date)
            .eq('language', 'zh')
            .maybeSingle();

        if (existingPodcast?.script_content) {
            return Response.json({ script: existingPodcast.script_content });
        } else {
            return Response.json({ script: null }); // explicitly indicate not found
        }
    } catch (error: any) {
        console.error('[Podcast] Fetch API Error:', error);
        return Response.json({ error: '获取文稿失败' }, { status: 500 });
    }
}
