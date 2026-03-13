/**
 * 播客清空与重置脚本
 *
 * 用于一键清空 `daily_podcasts` 表的所有数据，
 * 并且遍历清空 Supabase Storage `podcasts` 存储桶中的所有音频文件。
 *
 * ⚠️ 警告：该操作不可逆，执行后需要重新跑整个生成流程。
 *
 * 使用方法：
 *   npx tsx scripts/clear-podcasts.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 必须要求有 Role Key 才有权大面积删库删水桶
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearPodcasts() {
    console.log(`🧹 开始清空所有播客数据与音频资产...`);
    console.log(`⚠️  此操作不可逆！\n`);

    try {
        // 1. 清空 daily_podcasts 表中的所有中文播客数据
        console.log(`正在清空 PostgreSQL 数据库 daily_podcasts 表...`);
        // 注意: Supabase 默认不允许无 eq 条件的全表 delete，所以我们加上条件 id is not null 绕过
        const { count, error: dbError } = await supabase
            .from('daily_podcasts')
            .delete({ count: 'exact' })
            .not('id', 'is', null);

        if (dbError) {
            console.error(`❌ 数据库清空失败:`, dbError);
        } else {
            console.log(`✅ 数据库清空成功！共删除 ${count} 条记录。`);
        }

        // 2. 清空 Storage Bucket 中的所有文件
        console.log(`\n正在列出 Storage [podcasts] 中的所有文件...`);
        const { data: files, error: listError } = await supabase.storage.from('podcasts').list();

        if (listError) {
            console.error(`❌ 列出 Storage 文件失败:`, listError);
            return;
        }

        if (!files || files.length === 0) {
            console.log(`✅ Storage [podcasts] 目前是空的，无需清理。`);
            return;
        }

        console.log(`🔎 发现了 ${files.length} 个文件，开始批量删除...`);
        const fileNames = files.map((file) => file.name);

        // Supabase 限制 100个批次的批量操作，这里做分批删除保障
        const BATCH_SIZE = 100;
        let deletedFilesCount = 0;

        for (let i = 0; i < fileNames.length; i += BATCH_SIZE) {
            const batch = fileNames.slice(i, i + BATCH_SIZE);
            const { error: removeError } = await supabase.storage.from('podcasts').remove(batch);

            if (removeError) {
                console.error(`❌ 删除批次报错 (${i} ~ ${i + batch.length}):`, removeError);
            } else {
                deletedFilesCount += batch.length;
                console.log(`  🗑️  成功删除 ${deletedFilesCount}/${fileNames.length} 个文件...`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🏁 全部清空操作执行完毕，您可以重新运行生成脚本了！');
        console.log('='.repeat(60));

    } catch (err: any) {
        console.error('💥 未知异常:', err);
    }
}

clearPodcasts().catch(console.error);
