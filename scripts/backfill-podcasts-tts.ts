/**
 * 播客语音音频 (TTS) 批量合成回填脚本
 *
 * 用于为数据库中已经有 `script_content` 但缺少 `audio_url` 
 * 或者需要重新生成音频的播客记录，批量调用 Edge TTS 并上传到 Supabase Storage。
 *
 * 使用方法：
 *   npx tsx scripts/backfill-podcasts-tts.ts [--days=90] [--delay=5] [--overwrite]
 *
 * 参数：
 *   --days N     检查过去 N 天的数据（默认 90）
 *   --delay N    两次合成之间的延迟秒数，建议适度休眠以免触发 Edge TTS 机制（默认 5）
 *   --overwrite  是否覆盖已存在的 audio_url（默认 false，即只合成空的）
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { generateEdgeTTSAudio } from '../src/domains/intelligence/services/edge-tts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 解析命令行参数
const daysArg = process.argv.find((arg) => arg.startsWith('--days='));
const daysToLookBack = daysArg ? parseInt(daysArg.split('=')[1], 10) : 90;

const delayArg = process.argv.find((arg) => arg.startsWith('--delay='));
const delayMs = delayArg ? parseInt(delayArg.split('=')[1], 10) * 1000 : 5000;

const overwrite = process.argv.includes('--overwrite');

// 工具函数：获取过去 N 天的日期字符串数组 (YYYY-MM-DD)
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

// 延迟函数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillPodcastTTS() {
    console.log(`🎙️ Starting podcast TTS audio backfill...`);
    console.log(`📅 Look back days: ${daysToLookBack}`);
    console.log(`⏳ Delay between generation: ${delayMs / 1000}s`);
    console.log(`⚠️ Overwrite existing audio: ${overwrite ? 'YES' : 'NO'}`);

    const datesToCheck = getPastDates(daysToLookBack);

    // 0. 列出当前 Storage 中已有的所有音频文件，做全量预加载作为防重缓存
    console.log(`🔎 Pre-loading existing audio files from Storage 'podcasts'...`);
    const { data: existingFiles, error: listError } = await supabase.storage.from('podcasts').list();
    const existingFileNames = new Set((existingFiles || []).map(f => f.name));
    if (listError) {
        console.warn(`  ⚠️ Failed to pre-load storage list:`, listError.message);
    } else {
        console.log(`  ✅ Loaded ${existingFileNames.size} files for deduplication check.`);
    }

    // 1. 获取满足条件的播客记录 (拥有 script 但可能没有 audio)
    const { data: podcasts, error: queryError } = await supabase
        .from('daily_podcasts')
        .select('id, date, script_content, audio_url')
        .in('date', datesToCheck)
        .eq('language', 'zh')
        .not('script_content', 'is', null) // 必须要有稿子
        .neq('script_content', '');

    if (queryError) {
        console.error('❌ Failed to fetch podcasts:', queryError);
        return;
    }

    // 2. 筛选需要生成 TTS 的记录
    const pendingPodcasts = (podcasts || []).filter((p) => {
        if (overwrite) return true; // 如果强制覆盖，只要有稿子就上
        return !p.audio_url || p.audio_url.trim() === ''; // 否则只合成没有音频的
    });

    if (pendingPodcasts.length === 0) {
        console.log('✨ All podcasts have audio or no pending records found!');
        return;
    }

    console.log(`📉 Found ${pendingPodcasts.length} records need TTS generation.`);

    let successCount = 0;
    let failCount = 0;

    // 从新到旧或从旧到新排序（这里按日志习惯从旧到新排）
    const sortedPodcasts = pendingPodcasts.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < sortedPodcasts.length; i++) {
        const record = sortedPodcasts[i];
        console.log(`\n⏳ [${i + 1}/${sortedPodcasts.length}] Processing TTS for date: ${record.date}`);

        try {
            // 计算当前 script 的 MD5 Hash 值
            const textHash = crypto.createHash('md5').update(record.script_content).digest('hex').substring(0, 16);
            const fileName = `podcast-${record.date}-zh-${textHash}.mp3`;
            const expectedUrl = `${supabaseUrl}/storage/v1/object/public/podcasts/${fileName}`;

            // 特效能力：基于哈希判断云端是否早已有相同的录音？(通过精确判断白嫖逻辑)
            if (!overwrite && existingFileNames.has(fileName)) {
                console.log(`  🎉 [Hash Match] Found identical audio file already exists: ${fileName}`);
                console.log(`  🚀 Bypassing Edge TTS generation, performing instant DB re-link...`);

                // 直接更新 DB 关联到这个 URL 就行了
                const { error: dbFastAuthError } = await supabase.from('daily_podcasts')
                    .update({ audio_url: expectedUrl, updated_at: new Date().toISOString() })
                    .eq('id', record.id);

                if (!dbFastAuthError) {
                    successCount++;
                    console.log(`  🔗 Successfully quick-linked for ${record.date}.`);
                } else {
                    console.error(`  ❌ Database Quick-link error:`, dbFastAuthError);
                    failCount++;
                }
                continue; // 彻底跳过生成逻辑，处理下一条
            }

            // ================= 防重失败，进入硬扛合成流程 ==================
            // 1. 生成音频 Buffer
            console.log(`  🗣️ Generating Edge TTS for ${record.script_content.length} chars...`);
            const audioBuffer = await generateEdgeTTSAudio(record.script_content);
            console.log(`  🔊 TTS generated successfully (${audioBuffer.length} bytes)`);

            // 2. 上传到 Supabase Storage
            console.log(`  ☁️ Uploading to storage bucket 'podcasts' -> ${fileName}...`);

            const { error: uploadError } = await supabase.storage
                .from('podcasts')
                .upload(fileName, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                });

            if (uploadError) {
                console.error(`  ❌ Failed to upload audio for ${record.date}:`, uploadError);
                failCount++;
                continue;
            }

            const { data: urlData } = supabase.storage.from('podcasts').getPublicUrl(fileName);
            const audioUrl = urlData.publicUrl;
            console.log(`  ✅ Audio uploaded to: ${audioUrl}`);

            // 3. 删除旧的文件（如果有）
            if (record.audio_url && record.audio_url !== audioUrl) {
                try {
                    const oldFileName = record.audio_url.split('/').pop();
                    if (oldFileName) {
                        await supabase.storage.from('podcasts').remove([oldFileName]);
                        console.log(`  🗑️ Old audio deleted: ${oldFileName}`);
                    }
                } catch (err) {
                    console.warn(`  ⚠️ Failed to delete old audio file for ${record.date}:`, err);
                }
            }

            // 4. 更新数据库表中的 url
            const { error: dbError } = await supabase
                .from('daily_podcasts')
                .update({
                    audio_url: audioUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', record.id);

            if (dbError) {
                console.error(`  ❌ Failed to save URL to database for ${record.date}:`, dbError);
                failCount++;
            } else {
                console.log(`  💾 Successfully updated DB for ${record.date}.`);
                successCount++;
            }

        } catch (error: any) {
            console.error(`  💥 Fatal error creating TTS for ${record.date}:`, error.message);
            failCount++;
        }

        if (i < sortedPodcasts.length - 1) {
            console.log(`  💤 Sleeping for ${delayMs / 1000}s...`);
            await sleep(delayMs);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Podcast TTS audio backfill completed!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('='.repeat(60));
}

backfillPodcastTTS().catch(console.error);
