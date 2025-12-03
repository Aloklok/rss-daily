import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getSupabaseClient, verifyAdmin } from './_utils.js';
import { withCache } from './_cache.js';

async function getDailyStatuses(req: VercelRequest, res: VercelResponse) {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
        return res.status(400).json({ message: 'start_date and end_date parameters are required.' });
    }

    // Prevent Vercel/Browser caching for this endpoint
    res.setHeader('Cache-Control', 'no-store, max-age=0');

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

async function updateDailyStatus(req: VercelRequest, res: VercelResponse) {
    if (!verifyAdmin(req)) {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
    }

    const { date, is_completed } = req.body;

    if (!date || typeof is_completed !== 'boolean') {
        return res.status(400).json({ message: 'date (YYYY-MM-DD) and is_completed (boolean) are required.' });
    }

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

async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        return withCache(getDailyStatuses)(req, res);
    } else if (req.method === 'POST') {
        return updateDailyStatus(req, res);
    }
    return res.status(405).json({ message: 'Method not allowed' });
}

export default apiHandler(['GET', 'POST'], handler);
