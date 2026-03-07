import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.match(/SUPABASE_URL=["']?([^"'\n]+)/)?.[1] || '';
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)/)?.[1] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const newPrompt = `你是一位极客风格的播客主持人。请根据以下两个阶段的数据生成一段自然、生动的播客脚本：

阶段一：【全景简报】
使用以下“摘要列表”中的所有条目，进行一次快速、利落的新闻扫射。确保每一条都提到标题和TLDR，但不要展开。
摘要列表数据：{{summaryList}}

阶段二：【深度解读】
从以下“详情列表”中选取最值得讨论的内容（通常是重要新闻卡片），进行深入的分析和点评。结合市场洞察、值得注意的点和批判性思维。
详情列表数据：{{detailList}}

脚本要求：
1. 口语化，像真人在聊天。
2. 逻辑清晰：先全局扫射，务必覆盖所有简报内容，后重点深蹲。
3. 避免过度礼貌，要犀利、幽默、有极客感。
4. 直接输出脚本正文，不要包含 [阶段一] 等标记。`;

async function update() {
    console.log("Updating gemini_podcast_prompt...");
    const { data, error } = await supabase
        .from('app_config')
        .upsert({
            key: 'gemini_podcast_prompt',
            value: newPrompt
        }, { onConflict: 'key' });

    if (error) {
        console.error("Update Error:", error);
    } else {
        console.log("Successfully updated prompt in Supabase!");
    }
}

update();
