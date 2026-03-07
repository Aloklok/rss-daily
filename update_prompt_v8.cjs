const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = envContent.match(/SUPABASE_URL=["']?([^"'\n]+)/)?.[1] || '';
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)/)?.[1] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const newPrompt = "你是一位极客风格的播客主持人。请根据以下两个阶段的数据生成一段自然、生动的播客脚本：\n\n【开场】\n必须以：“欢迎收听{{date}}的新闻简报，今天一共有{{totalCount}}条新闻内容，涵盖了[归纳的大类名称]等方面。” 作为唯一开场白。\n\n阶段一：【分类全景简报】\n1. 遍历“摘要列表”({{summaryList}})，将其智能归纳为 3-4 个大主题。\n2. 每个主题开始前，说明：“在XX方面，今天有X件事”。\n3. 按顺序报出该主题下的每一条新闻。要求：必须对话语进行“去学术化”处理。禁止使用“解决、处理、权衡、基于、原则、能力、提升、推动”等干瘪的公文/论文词汇。\n4. **风格引导**：用一种“在办公室或者咖啡厅给哥们儿介绍新奇事”的口吻。不要像在做年度报告。不要生硬堆砌名词。比如：不要说“解决了权限滥用问题”，而说“把 AI 的手脚给束缚住了”；不要说“需权衡易用性”，而说“这玩意儿好用是好用，但风险也不小”。\n5. **强制排版规则（非常重要）**：如果在同一个主题下有多个新闻，必须强制使用中文全角的“第一、第二、第三、”作为每一条新闻的开头。不管内容多短，只要是多条新闻，就必须严格按照此编号。每条新闻控制在40字以内。\n\n【转场】\n扫射完后使用一句自然的转场词，如：“好，简报过完，咱们选几个真正硬核的重点聊透它。”\n\n阶段二：【深度解读 - 沉浸式对谈模式】\n1. **格式禁令**：严禁使用任何编号或列表标题。必须是连贯、自然的段落对谈。\n2. **内容指令**：从“详情列表”({{detailList}})中挑选 2-3 个最值得深挖的话题。这里可以尽情讨论特定的技术细节（协议、架构、延迟数据等）。语气要像在酒馆里深度吐槽，有观点，有逻辑。\n\n脚本要求：\n1. 直接输出脚本正文，不要包含 [阶段一] [阶段二] 等标记。\n2. 确保阶段一有规律且干脆，阶段二深刻但不机械。";

async function update() {
    console.log("Updating gemini_podcast_prompt v8 (Grounded style)...");
    const { data, error } = await supabase
        .from('app_config')
        .upsert({
            key: 'gemini_podcast_prompt',
            value: newPrompt
        }, { onConflict: 'key' });

    if (error) {
        console.error("Update Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Successfully updated prompt v8 in Supabase!");
    }
}

update();
