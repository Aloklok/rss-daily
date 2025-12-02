import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getSupabaseClient } from './_utils.js';

async function getAvailableDates(req: VercelRequest, res: VercelResponse) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('articles')
        .select('n8n_processing_date')
        .order('n8n_processing_date', { ascending: false });

    if (error) {
        console.error('Supabase error in get-available-dates:', error);
        return res.status(500).json({ message: 'Error fetching available dates', error: error.message });
    }

    // Process the data to get unique dates based on the Asia/Shanghai timezone
    const dateSet = new Set<string>();
    if (data) {
        const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA format is YYYY-MM-DD
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Shanghai',
        });

        data.forEach(item => {
            if (item.n8n_processing_date) {
                const date = new Date(item.n8n_processing_date);
                dateSet.add(formatter.format(date));
            }
        });
    }

    const dates = Array.from(dateSet);
    return res.status(200).json(dates);
}

import { withCache } from './_cache.js';

export default apiHandler(['GET'], withCache(getAvailableDates));