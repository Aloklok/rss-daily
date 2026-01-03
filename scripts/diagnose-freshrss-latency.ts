import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Manual Fallback for env loading
if (!process.env.FRESHRSS_API_URL) {
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

interface LatencyResult {
  test: string;
  latency: number;
  status: 'success' | 'error';
  details?: string;
}

async function measureNetworkLatency() {
  console.log('=== 网络延迟诊断 ===\n');

  const results: LatencyResult[] = [];
  const FRESHRSS_API_URL = process.env.FRESHRSS_API_URL;
  const FRESHRSS_AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

  if (!FRESHRSS_API_URL || !FRESHRSS_AUTH_TOKEN) {
    console.error('❌ 缺少 FreshRSS 环境变量');
    console.log('需要: FRESHRSS_API_URL, FRESHRSS_AUTH_TOKEN\n');
    return;
  }

  console.log(`FreshRSS 服务器: ${FRESHRSS_API_URL}\n`);

  // ========================================
  // 测试 1: TCP 连接建立延迟 (模拟 DNS + TCP handshake)
  // ========================================
  console.log('📡 测试 1: TCP 连接建立延迟');

  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      // 使用 HEAD 请求,最小化数据传输
      const response = await fetch(FRESHRSS_API_URL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      const t1 = performance.now();
      const latency = t1 - t0;

      console.log(`   尝试 ${i + 1}: ${latency.toFixed(2)}ms (${response.status})`);
      results.push({
        test: `TCP 连接延迟 (尝试 ${i + 1})`,
        latency,
        status: 'success',
      });
    } catch (err: any) {
      const t1 = performance.now();
      console.log(`   尝试 ${i + 1}: 失败 - ${err.message}`);
      results.push({
        test: `TCP 连接延迟 (尝试 ${i + 1})`,
        latency: t1 - t0,
        status: 'error',
        details: err.message,
      });
    }
  }

  const avgTcpLatency =
    results.filter((r) => r.test.includes('TCP')).reduce((sum, r) => sum + r.latency, 0) / 3;
  console.log(`   平均延迟: ${avgTcpLatency.toFixed(2)}ms\n`);

  // ========================================
  // 测试 2: FreshRSS API 最小请求延迟 (仅认证)
  // ========================================
  console.log('🔐 测试 2: FreshRSS 认证 API 延迟 (最简请求)');

  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      // /token 是最轻量的认证端点
      const response = await fetch(`${FRESHRSS_API_URL}/greader.php/reader/api/0/token`, {
        headers: {
          Authorization: `GoogleLogin auth=${FRESHRSS_AUTH_TOKEN}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      await response.text(); // 确保完全接收响应
      const t1 = performance.now();
      const latency = t1 - t0;

      console.log(`   尝试 ${i + 1}: ${latency.toFixed(2)}ms`);
      results.push({
        test: `FreshRSS Token API (尝试 ${i + 1})`,
        latency,
        status: 'success',
      });
    } catch (err: any) {
      const t1 = performance.now();
      console.log(`   尝试 ${i + 1}: 失败 - ${err.message}`);
      results.push({
        test: `FreshRSS Token API (尝试 ${i + 1})`,
        latency: t1 - t0,
        status: 'error',
        details: err.message,
      });
    }
  }

  const avgTokenLatency =
    results.filter((r) => r.test.includes('Token API')).reduce((sum, r) => sum + r.latency, 0) / 3;
  console.log(`   平均延迟: ${avgTokenLatency.toFixed(2)}ms\n`);

  // ========================================
  // 测试 3: FreshRSS 状态查询 (实际业务请求)
  // ========================================
  console.log('📦 测试 3: FreshRSS 状态查询延迟 (5 篇文章)');

  const TEST_IDS = ['68746331603', '68746331602', '68746331601', '68746331600', '68746331599'];

  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      const formData = new URLSearchParams();
      TEST_IDS.forEach((id) => formData.append('i', id));

      const response = await fetch(
        `${FRESHRSS_API_URL}/greader.php/reader/api/0/stream/items/contents?output=json&excludeContent=1`,
        {
          method: 'POST',
          headers: {
            Authorization: `GoogleLogin auth=${FRESHRSS_AUTH_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          signal: AbortSignal.timeout(10000),
        },
      );

      const data = await response.json();
      const t1 = performance.now();
      const latency = t1 - t0;

      console.log(`   尝试 ${i + 1}: ${latency.toFixed(2)}ms (返回 ${data.items?.length || 0} 篇)`);
      results.push({
        test: `状态查询 (尝试 ${i + 1})`,
        latency,
        status: 'success',
        details: `${data.items?.length || 0} 篇文章`,
      });
    } catch (err: any) {
      const t1 = performance.now();
      console.log(`   尝试 ${i + 1}: 失败 - ${err.message}`);
      results.push({
        test: `状态查询 (尝试 ${i + 1})`,
        latency: t1 - t0,
        status: 'error',
        details: err.message,
      });
    }
  }

  const avgQueryLatency =
    results.filter((r) => r.test.includes('状态查询')).reduce((sum, r) => sum + r.latency, 0) / 3;
  console.log(`   平均延迟: ${avgQueryLatency.toFixed(2)}ms\n`);

  // ========================================
  // 分析总结
  // ========================================
  console.log('='.repeat(60));
  console.log('📊 延迟分析\n');

  console.log(`1. TCP 连接延迟: ${avgTcpLatency.toFixed(2)}ms`);
  console.log(`   💡 包含: DNS 解析 + TCP 握手\n`);

  console.log(`2. 最小 API 响应: ${avgTokenLatency.toFixed(2)}ms`);
  console.log(`   💡 包含: 连接 + FreshRSS 处理 + 返回\n`);

  console.log(`3. 状态查询响应: ${avgQueryLatency.toFixed(2)}ms`);
  console.log(`   💡 包含: 连接 + 数据库查询 + 数据处理 + 返回\n`);

  const networkOverhead = avgTcpLatency;
  const freshrssProcessing = avgQueryLatency - avgTcpLatency;

  console.log('='.repeat(60));
  console.log('🔍 延迟来源分解\n');

  console.log(
    `网络延迟 (TCP 连接):           ${networkOverhead.toFixed(2)}ms (${((networkOverhead / avgQueryLatency) * 100).toFixed(1)}%)`,
  );
  console.log(
    `FreshRSS 处理 (数据库+逻辑): ${freshrssProcessing.toFixed(2)}ms (${((freshrssProcessing / avgQueryLatency) * 100).toFixed(1)}%)`,
  );
  console.log(`总延迟:                       ${avgQueryLatency.toFixed(2)}ms`);

  console.log('\n' + '='.repeat(60));
  console.log('💡 诊断结论\n');

  const networkRatio = (networkOverhead / avgQueryLatency) * 100;

  if (networkRatio > 50) {
    console.log('⚠️  主要瓶颈: 网络延迟');
    console.log(`   网络延迟占 ${networkRatio.toFixed(1)}%,建议:`);
    console.log('   1. 检查 FreshRSS 服务器位置');
    console.log('   2. 考虑迁移到与 Vercel 更近的区域');
    console.log('   3. 使用 CDN 或缓存层');
  } else if (networkRatio < 20) {
    console.log('⚠️  主要瓶颈: FreshRSS 服务器处理');
    console.log(`   服务器处理占 ${(100 - networkRatio).toFixed(1)}%,建议:`);
    console.log('   1. 优化 FreshRSS 数据库索引');
    console.log('   2. 升级 FreshRSS 服务器硬件');
    console.log('   3. 检查 FreshRSS 日志找到慢查询');
  } else {
    console.log('ℹ️  瓶颈: 网络和服务器处理混合');
    console.log(
      `   网络延迟 ${networkRatio.toFixed(1)}%, 服务器处理 ${(100 - networkRatio).toFixed(1)}%`,
    );
    console.log('   建议: 同时优化网络和服务器');
  }

  console.log('='.repeat(60));
}

measureNetworkLatency().catch(console.error);
