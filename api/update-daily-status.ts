// api/update-daily-status.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
// 【查】确保从 _utils.js 导入了正确的辅助函数
import { apiHandler, getSupabaseClient, verifyAdmin } from './_utils.js';

async function updateDailyStatus(req: VercelRequest, res: VercelResponse) {
    if (!verifyAdmin(req)) {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
    }

    const { date, is_completed } = req.body;

    if (!date || typeof is_completed !== 'boolean') {
        return res.status(400).json({ message: 'date (YYYY-MM-DD) and is_completed (boolean) are required.' });
    }

    // 【改】使用 getSupabaseClient() 来获取 Supabase 实例
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('daily_briefing_status')
        .upsert(
            { date: date, is_completed: is_completed },
            { onConflict: 'date' }
        );

    if (error) {
        console.error('Supabase error in update-daily-status:', error);
        return res.status(500).json({ message: 'Error updating daily status', error: error.message });
    }

    return res.status(200).json({ success: true, date, is_completed });
}

export default apiHandler(['POST'], updateDailyStatus);