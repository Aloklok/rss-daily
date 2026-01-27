/**
 * 翻译模型测试脚本
 * 测试硅基流动的 Hunyuan-MT-7B 和 Qwen3-8B 翻译效果
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SILICONFLOW_API_KEY = process.env.GUIJI_API_KEY;
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 测试用的文章数据
const TEST_ARTICLE = {
  title: '2026年1月24日',
  category: '国际时事',
  tldr: '全球政治经济科技多点动态。',
  summary: `全球要闻速览：
1. 江苏动物园过腊八节
2. **日本国会众院解散**
3. **普京会见美国总统特使**
4. **第3届北京商业航天展**
在我看来，这是一份信息量广但深度不足的泛新闻简报。`,
  highlights: `1. 2025年中国航天行业融资总额达186亿元，同比增长32%，显示资本对**中国商业航天**的持续信心。
2. 印度2025年GDP达4.18万亿美元超日本，有望三年内跻身世界前三。`,
  critiques: `1. 日本众议院解散到投票仅16天，这种短周期选举，**政治操弄痕迹太重**。
2. 特朗普"和平委员会"章程规定主席有权罢免成员国，这玩意儿就是个**"特朗普一言堂"**。`,
  marketTake:
    '中国商业航天市场融资额创新高，但与国际竞品如**SpaceX**在垂直整合能力和成本控制上仍有显著差距。',
  keywords: ['国际政治', '经济发展', '商业航天', '载人航天', '地缘战略'],
};

// 翻译模型配置
const MODELS = {
  hunyuan: 'tencent/Hunyuan-MT-7B',
  qwen: 'Qwen/Qwen3-8B',
};

/**
 * 调用硅基流动 API 进行翻译
 */
async function translateWithModel(
  content: string,
  modelId: string,
  isStructured: boolean = false,
): Promise<string> {
  if (!SILICONFLOW_API_KEY) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  // 构建 Prompt
  let prompt: string;

  if (isStructured) {
    // 结构化翻译：要求返回 JSON
    prompt = `将以下中文内容翻译成专业的英文。保留 Markdown 格式（如 **加粗**）。

${content}

请按照以下 JSON 格式返回（只返回 JSON，不要添加任何其他内容）:
{
  "title": "...",
  "category": "...",
  "tldr": "...",
  "summary": "...",
  "highlights": "...",
  "critiques": "...",
  "marketTake": "...",
  "keywords": ["...", "..."]
}`;
  } else {
    // 纯翻译模式：直接翻译
    prompt = `将以下中文翻译成英文，保留原有 Markdown 格式：

${content}`;
  }

  const body = {
    model: modelId,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
    temperature: 0.3, // 降低随机性，提高翻译一致性
    max_tokens: 4096,
  };

  console.log(`\n🚀 调用模型: ${modelId}`);
  console.log(`📝 Prompt 长度: ${prompt.length} 字符`);

  const startTime = Date.now();

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error: ${response.status}`);
    console.error(errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content || '';

  console.log(`⏱️ 耗时: ${elapsed}ms`);
  console.log(`📊 Token 使用: ${JSON.stringify(data.usage)}`);

  return result;
}

/**
 * 测试 Hunyuan-MT-7B（专业翻译模型）
 */
async function testHunyuan() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试 1: Hunyuan-MT-7B（纯翻译模式）');
  console.log('='.repeat(60));

  // 测试单字段翻译
  const titleResult = await translateWithModel(TEST_ARTICLE.title, MODELS.hunyuan, false);
  console.log('\n📌 标题翻译结果:');
  console.log(titleResult);

  const summaryResult = await translateWithModel(TEST_ARTICLE.summary, MODELS.hunyuan, false);
  console.log('\n📌 摘要翻译结果:');
  console.log(summaryResult);

  // 测试结构化输出（预期可能失败）
  console.log('\n🧪 测试 Hunyuan 结构化输出...');
  const structuredContent = `标题: ${TEST_ARTICLE.title}
分类: ${TEST_ARTICLE.category}
一句话总结: ${TEST_ARTICLE.tldr}
关键词: ${TEST_ARTICLE.keywords.join(', ')}`;

  try {
    const structuredResult = await translateWithModel(structuredContent, MODELS.hunyuan, true);
    console.log('\n📌 结构化翻译结果:');
    console.log(structuredResult);

    // 尝试解析 JSON
    try {
      JSON.parse(structuredResult);
      console.log('✅ JSON 解析成功！Hunyuan 支持结构化输出');
    } catch {
      console.log('⚠️ JSON 解析失败，Hunyuan 不支持结构化输出');
    }
  } catch (e: any) {
    console.log(`⚠️ 结构化测试失败: ${e.message}`);
  }
}

/**
 * 测试 Qwen3-8B（通用大模型）
 */
async function testQwen() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试 2: Qwen3-8B（结构化翻译模式）');
  console.log('='.repeat(60));

  const fullContent = `标题: ${TEST_ARTICLE.title}
分类: ${TEST_ARTICLE.category}
一句话总结 (TLDR): ${TEST_ARTICLE.tldr}
摘要: ${TEST_ARTICLE.summary}
技术亮点: ${TEST_ARTICLE.highlights}
犀利点评: ${TEST_ARTICLE.critiques}
市场观点: ${TEST_ARTICLE.marketTake}
关键词: ${TEST_ARTICLE.keywords.join(', ')}`;

  try {
    const result = await translateWithModel(fullContent, MODELS.qwen, true);
    console.log('\n📌 Qwen 结构化翻译结果:');
    console.log(result);

    // 尝试解析 JSON
    try {
      // Qwen3 可能会输出 <think> 标签，需要清理
      let cleanResult = result;
      if (result.includes('</think>')) {
        cleanResult = result.split('</think>').pop()?.trim() || result;
      }
      // 提取 JSON 部分
      const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('\n✅ JSON 解析成功！');
        console.log('📋 解析后的对象:');
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log('⚠️ 未找到有效 JSON');
      }
    } catch (e: any) {
      console.log(`⚠️ JSON 解析失败: ${e.message}`);
    }
  } catch (e: any) {
    console.log(`❌ Qwen 测试失败: ${e.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🌐 翻译模型测试开始');
  console.log(`🔑 API Key: ${SILICONFLOW_API_KEY ? '已配置' : '❌ 未配置'}`);

  if (!SILICONFLOW_API_KEY) {
    console.error('请在 .env.local 中配置 GUIJI_API_KEY');
    process.exit(1);
  }

  // 测试 Hunyuan
  await testHunyuan();

  // 测试 Qwen
  await testQwen();

  console.log('\n' + '='.repeat(60));
  console.log('🏁 测试完成！');
  console.log('='.repeat(60));
}

main().catch(console.error);
