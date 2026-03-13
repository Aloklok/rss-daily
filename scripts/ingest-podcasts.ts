/**
 * 数据录入脚本 (Assistant-Led Backfill Phase 3)
 *
 * 用于将 AI 助手撰写好的播客文稿批量导入数据库。
 *
 * 使用方法：
 *   npx tsx scripts/ingest-podcasts.ts '{"2026-03-08": "文稿内容...", "2026-03-07": "..."}'
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function ingestData() {
    // 支持两种输入方式：命令行 JSON 字符串 或 --file=path 读取文件
    const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
    let jsonStr: string;
    if (fileArg) {
        const filePath = fileArg.split('=')[1];
        jsonStr = fs.readFileSync(filePath, 'utf-8');
        console.log(`📄 Reading input from file: ${filePath}`);
    } else {
        jsonStr = process.argv[2];
    }
    if (!jsonStr) {
        console.error('❌ Missing JSON input. Use: npx tsx scripts/ingest-podcasts.ts --file=path.json  OR  \'{"date":"text"}\'');
        process.exit(1);
    }

    const data = JSON.parse(jsonStr);
    console.log(`🚀 Ingesting ${Object.keys(data).length} podcast(s)...`);

    for (const [date, script] of Object.entries(data)) {
        console.log(`  💾 Saving for ${date}...`);
        const { error } = await supabase.from('daily_podcasts').upsert({
            date,
            language: 'zh',
            script_content: script,
            audio_url: 'pending_backfill', // 临时占位，满足数据库非空约束
            model_id: 'assistant-direct', // 标记为助手直出
            updated_at: new Date().toISOString()
        }, { onConflict: 'date,language' });

        if (error) {
            console.error(`  ❌ Failed for ${date}:`, error);
        } else {
            console.log(`  ✅ Saved ${date}.`);
        }
    }

    console.log('🏁 Ingestion completed!');
}

ingestData().catch(console.error);
