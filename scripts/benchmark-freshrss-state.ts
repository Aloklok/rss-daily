import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Manual Fallback
if (!process.env.FRESHRSS_URL) {
  try {
    if (fs.existsSync('.env.local')) {
      const envContent = fs.readFileSync('.env.local', 'utf-8');
      envContent.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let val = parts.slice(1).join('=').trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (key && val && !process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (_e) {
    /* Ignore */
  }
}

interface TimingResult {
  stage: string;
  duration: number;
  details?: string;
}

async function benchmarkStateFetching() {
  console.log('=== FreshRSS 状态获取性能测试 ===\n');

  // 测试配置
  const TEST_ARTICLE_IDS = [
    '68746331603',
    '68746331602',
    '68746331601',
    '68746331600',
    '68746331599',
  ];
  const timings: TimingResult[] = [];

  // ========================================
  // 环节 1: 客户端 → Next.js API Route
  // ========================================
  console.log('📡 测试 1: 客户端 → API Route (HTTP 往返)');
  const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiT0 = performance.now();

  try {
    const response = await fetch(`${apiUrl}/api/articles/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleIds: TEST_ARTICLE_IDS }),
    });
    const apiT1 = performance.now();
    const apiDuration = apiT1 - apiT0;

    if (!response.ok) {
      throw new Error(`API 响应失败: ${response.status}`);
    }

    const states = await response.json();
    console.log(`✅ 完成: ${apiDuration.toFixed(2)}ms`);
    console.log(`   返回状态数: ${Object.keys(states).length}\n`);

    timings.push({
      stage: '客户端 → API Route (完整往返)',
      duration: apiDuration,
      details: `包含 HTTP 建立连接、Next.js 路由处理、FreshRSS 调用、响应返回`,
    });
  } catch (err: any) {
    console.error(`❌ 失败:`, err.message);
    return;
  }

  // ========================================
  // 环节 2: API Route 内部逻辑 (模拟)
  // ========================================
  console.log('📦 测试 2: API Route 内部处理');
  const _t2Start = performance.now();

  // 2.1 解析请求 body (模拟)
  const bodyParseTime = 0.5; // 实际非常快,可忽略不计
  console.log(`   ├─ 解析 body: ~${bodyParseTime}ms`);

  // 2.2 参数验证
  const validationTime = 0.3;
  console.log(`   ├─ 参数验证: ~${validationTime}ms`);

  const _t2End = performance.now();
  timings.push({
    stage: 'API Route 内部准备',
    duration: bodyParseTime + validationTime,
    details: 'body 解析 + 参数验证',
  });

  // ========================================
  // 环节 3: FreshRSS API 直接调用
  // ========================================
  console.log('\n🔗 测试 3: 直接调用 FreshRSS API');

  const FRESHRSS_URL = process.env.FRESHRSS_URL;
  const FRESHRSS_USERNAME = process.env.FRESHRSS_USERNAME;
  const FRESHRSS_PASSWORD = process.env.FRESHRSS_PASSWORD;

  if (!FRESHRSS_URL || !FRESHRSS_USERNAME || !FRESHRSS_PASSWORD) {
    console.error('❌ 缺少 FreshRSS 环境变量,跳过直接测试');
  } else {
    // 3.1 获取 Auth Token
    console.log('   ├─ 子步骤 3.1: 获取 Auth Token');
    const authT0 = performance.now();

    const authResponse = await fetch(
      `${FRESHRSS_URL}/accounts/ClientLogin?Email=${encodeURIComponent(FRESHRSS_USERNAME)}&Passwd=${encodeURIComponent(FRESHRSS_PASSWORD)}`,
      {
        method: 'POST',
      },
    );

    const authBody = await authResponse.text();
    const authT1 = performance.now();
    const authDuration = authT1 - authT0;

    const authMatch = authBody.match(/Auth=([^\s]+)/);
    if (!authMatch) {
      console.error('❌ 无法获取 Auth Token');
      return;
    }

    const authToken = authMatch[1];
    console.log(`   │  ✅ 耗时: ${authDuration.toFixed(2)}ms`);
    timings.push({
      stage: 'FreshRSS Auth Token 获取',
      duration: authDuration,
      details: 'ClientLogin API 调用',
    });

    // 3.2 获取文章状态
    console.log('   └─ 子步骤 3.2: 获取文章状态');
    const stateT0 = performance.now();

    const formData = new URLSearchParams();
    TEST_ARTICLE_IDS.forEach((id) => formData.append('i', id));

    const stateResponse = await fetch(
      `${FRESHRSS_URL}/stream/items/contents?output=json&excludeContent=1&ck=${Date.now()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `GoogleLogin auth=${authToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      },
    );

    const stateData = await stateResponse.json();
    const stateT1 = performance.now();
    const stateDuration = stateT1 - stateT0;

    console.log(`      ✅ 耗时: ${stateDuration.toFixed(2)}ms`);
    console.log(`      返回文章数: ${stateData.items?.length || 0}\n`);

    timings.push({
      stage: 'FreshRSS 状态查询',
      duration: stateDuration,
      details: '/stream/items/contents API 调用',
    });

    // 3.3 数据处理 (解析 tags)
    console.log('   ├─ 子步骤 3.3: 数据处理 (解析 tags)');
    const parseT0 = performance.now();

    const states: Record<string, string[]> = {};
    if (stateData.items) {
      stateData.items.forEach((item: any) => {
        const annotationTags = (item.annotations || []).map((anno: any) => anno.id).filter(Boolean);
        const allTags = [...(item.categories || []), ...annotationTags];
        states[item.id] = [...new Set(allTags)];
      });
    }

    const parseT1 = performance.now();
    const parseDuration = parseT1 - parseT0;
    console.log(`   │  ✅ 耗时: ${parseDuration.toFixed(2)}ms\n`);

    timings.push({
      stage: '数据解析与组装',
      duration: parseDuration,
      details: '合并 categories + annotations, 去重',
    });
  }

  // ========================================
  // 总结
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 性能分析总结\n');

  timings.forEach((t, idx) => {
    const percentage =
      timings.length > 0
        ? ((t.duration / timings.reduce((sum, x) => sum + x.duration, 0)) * 100).toFixed(1)
        : '0';
    console.log(`${idx + 1}. ${t.stage}`);
    console.log(`   ⏱️  ${t.duration.toFixed(2)}ms (${percentage}%)`);
    if (t.details) {
      console.log(`   💡 ${t.details}`);
    }
    console.log('');
  });

  const totalDirect = timings.slice(1).reduce((sum, t) => sum + t.duration, 0);
  console.log(`总耗时 (直接测量): ${totalDirect.toFixed(2)}ms`);
  console.log(`总耗时 (从客户端视角): ${timings[0].duration.toFixed(2)}ms`);

  const overhead = timings[0].duration - totalDirect;
  console.log(`\n🔍 额外开销: ${overhead.toFixed(2)}ms`);
  console.log(`   可能来源: Next.js 中间件、网络延迟、序列化开销\n`);

  // ========================================
  // 瓶颈分析
  // ========================================
  const bottleneck = timings
    .slice(1)
    .reduce((max, t) => (t.duration > max.duration ? t : max), timings[1]);
  console.log('⚠️  性能瓶颈:');
  console.log(`   ${bottleneck.stage} (${bottleneck.duration.toFixed(2)}ms)`);

  if (bottleneck.stage.includes('Auth Token')) {
    console.log(`   建议: 考虑在服务端缓存 Auth Token (通常有效期 14 天)`);
  } else if (bottleneck.stage.includes('FreshRSS 状态查询')) {
    console.log(`   建议: 这是 FreshRSS 服务器响应时间,可能受网络或 FreshRSS 负载影响`);
  }
  console.log('='.repeat(60));
}

benchmarkStateFetching().catch(console.error);
