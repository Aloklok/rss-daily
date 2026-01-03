import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Manual Fallback
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

async function geolocateServer() {
  console.log('=== 服务器地理位置检测 ===\n');

  const FRESHRSS_API_URL = process.env.FRESHRSS_API_URL;
  const VERCEL_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alok-rss.top';

  if (!FRESHRSS_API_URL) {
    console.error('❌ 缺少 FRESHRSS_API_URL');
    return;
  }

  // 提取域名
  const freshrssHost = new URL(FRESHRSS_API_URL).hostname;
  const vercelHost = new URL(VERCEL_URL).hostname;

  console.log(`FreshRSS: ${freshrssHost}`);
  console.log(`Vercel: ${vercelHost}\n`);

  // ========================================
  // 1. DNS 解析获取 IP
  // ========================================
  console.log('📍 步骤 1: 解析 IP 地址\n');

  async function resolveIP(hostname: string): Promise<string | null> {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
      const data = await response.json();
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer[0].data;
      }
    } catch (_err) {
      console.error(`   解析失败: ${hostname}`);
    }
    return null;
  }

  const freshrssIP = await resolveIP(freshrssHost);
  const vercelIP = await resolveIP(vercelHost);

  console.log(`FreshRSS IP: ${freshrssIP || '无法解析'}`);
  console.log(`Vercel IP: ${vercelIP || '无法解析'}\n`);

  // ========================================
  // 2. IP 地理定位
  // ========================================
  console.log('🌍 步骤 2: IP 地理定位\n');

  async function geolocateIP(ip: string, label: string) {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();

      if (data.status === 'success') {
        console.log(`${label}:`);
        console.log(`   位置: ${data.city}, ${data.regionName}, ${data.country}`);
        console.log(`   ISP: ${data.isp}`);
        console.log(`   经纬度: ${data.lat}, ${data.lon}`);
        console.log(`   时区: ${data.timezone}\n`);
        return data;
      }
    } catch (_err) {
      console.error(`   ${label} 定位失败`);
    }
    return null;
  }

  let freshrssGeo = null;
  let vercelGeo = null;

  if (freshrssIP) {
    freshrssGeo = await geolocateIP(freshrssIP, 'FreshRSS 服务器');
  }

  if (vercelIP) {
    vercelGeo = await geolocateIP(vercelIP, 'Vercel 服务器');
  }

  // ========================================
  // 3. 计算距离
  // ========================================
  if (freshrssGeo && vercelGeo) {
    console.log('📏 步骤 3: 计算服务器距离\n');

    function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // 地球半径 (km)
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const distance = haversineDistance(
      freshrssGeo.lat,
      freshrssGeo.lon,
      vercelGeo.lat,
      vercelGeo.lon,
    );

    console.log(`服务器间距离: ${distance.toFixed(0)} km`);

    // 估算延迟
    const estimatedLatency = distance / 200; // 光速延迟估算 (200km/ms)
    console.log(`理论最小延迟 (光速): ${estimatedLatency.toFixed(1)} ms`);
    console.log(`实际往返延迟估算: ${(estimatedLatency * 3).toFixed(0)} ms (考虑路由)\n`);
  }

  // ========================================
  // 4. 检测 Vercel Edge Network
  // ========================================
  console.log('🌐 步骤 4: 检测 Vercel Edge Network\n');

  try {
    const response = await fetch(VERCEL_URL, { method: 'HEAD' });
    const vercelRegion = response.headers.get('x-vercel-id');
    const cfRay = response.headers.get('cf-ray');

    console.log('Vercel 响应头:');
    console.log(`   x-vercel-id: ${vercelRegion || '未检测到'}`);
    console.log(`   cf-ray: ${cfRay || '未检测到'}`);

    if (vercelRegion) {
      // x-vercel-id 格式: [region]::[deployment-id]::[request-id]
      const region = vercelRegion.split('::')[0];
      console.log(`\n   检测到 Vercel 区域: ${region}`);
    }

    if (cfRay) {
      console.log(`\n   检测到 Cloudflare (可能作为 CDN)`);
    }
  } catch (_err) {
    console.error('   检测失败');
  }

  // ========================================
  // 5. 总结建议
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('💡 优化建议\n');

  if (freshrssGeo && vercelGeo) {
    const freshrssCountry = freshrssGeo.country;
    const vercelCountry = vercelGeo.country;

    if (freshrssCountry !== vercelCountry) {
      console.log('⚠️  服务器位于不同国家/地区');
      console.log(`   FreshRSS: ${freshrssGeo.city}, ${freshrssCountry}`);
      console.log(`   Vercel: ${vercelGeo.city}, ${vercelCountry}`);
      console.log('\n   建议: 将 FreshRSS 迁移到 Vercel 附近区域\n');
    } else {
      console.log('✅ 服务器位于同一国家/地区');
      console.log('   延迟主要来自服务器处理而非网络\n');
    }
  }

  console.log('关于 Vercel Edge Runtime:');
  console.log('   ✅ 可以使用 Edge Runtime 部署 API 路由');
  console.log('   ✅ Edge Runtime 会在全球多个节点运行');
  console.log('   ⚠️  但 FreshRSS 调用延迟不变 (取决于 FreshRSS 位置)');
  console.log('   💡 建议: 结合 Edge Config 缓存热数据\n');

  console.log('='.repeat(60));
}

geolocateServer().catch(console.error);
