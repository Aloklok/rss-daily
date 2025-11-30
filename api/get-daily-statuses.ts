// api/get-daily-statuses.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
// 【查】确保从 _utils.js 导入了正确的辅助函数
import { apiHandler, getSupabaseClient } from './_utils.js';

async function getDailyStatuses(req: VercelRequest, res: VercelResponse) {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
        return res.status(400).json({ message: 'start_date and end_date parameters are required.' });
    }

    // Prevent Vercel/Browser caching for this endpoint
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    // 【改】使用 getSupabaseClient() 来获取 Supabase 实例
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('daily_briefing_status')
        .select('date, is_completed')
        .gte('date', start_date)
        .lte('date', end_date);

    if (error) {
        console.error('Supabase error in get-daily-statuses:', error);
        return res.status(500).json({ message: 'Error fetching daily statuses', error: error.message });
    }

    const statuses = (data || []).reduce((acc, row) => {
        acc[row.date] = row.is_completed;
        return acc;
    }, {} as Record<string, boolean>);

    return res.status(200).json(statuses);
}

export default apiHandler(['GET'], getDailyStatuses);