/**
 * 数据提取脚本 (Assistant-Led Backfill Phase 1)
 *
 * 用于从 Supabase 中提取指定日期的文章数据，格式化为 JSON 输出到控制台，
 * 供 AI 助手直接读取并撰写播客文稿。
 *
 * 使用方法：
 *   npx tsx scripts/extract-briefing-data.ts --days=7
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const daysArg = process.argv.find((arg) => arg.startsWith('--days='));
const daysToExtract = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;

function getPastDates(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

async function extractData() {
    console.log(`🔍 Extracting data for the past ${daysToExtract} days...`);
    const dates = getPastDates(daysToExtract);
    const results: any = {};

    for (const date of dates) {
        // 计算当天的 UTC 范围（上海时间 UTC+8）
        const startIso = new Date(`${date}T00:00:00+08:00`).toISOString();
        const endIso = new Date(`${date}T23:59:59.999+08:00`).toISOString();

        const { data: rawArticles } = await supabase
            .from('articles_view')
            .select('title, summary, tldr, highlights, critiques, "marketTake"')
            .gte('n8n_processing_date', startIso)
            .lte('n8n_processing_date', endIso);

        if (rawArticles && rawArticles.length > 0) {
            results[date] = rawArticles.map((a: any) => ({
                title: a.title,
                summary: a.summary,
                tldr: a.tldr,
                highlights: a.highlights,
                critiques: a.critiques,
                marketTake: a.marketTake,
            }));
        }
    }

    console.log('---DATA_START---');
    const summary: any = {};
    for (const [date, articles] of Object.entries(results)) {
        const count = (articles as any[]).length;
        // 为 AI 提供明确的“策略建议”
        summary[date] = {
            count,
            strategy: count > 15 ? "HI-LOAD (Hierarchical Reporting Required)" : "NORMAL (Detail Everything)"
        };
    }
    console.log(`// TOTAL_SUMMARY: ${JSON.stringify(summary)}`);
    console.log(JSON.stringify(results, null, 2));
    console.log('---DATA_END---');
}

extractData().catch(console.error);
