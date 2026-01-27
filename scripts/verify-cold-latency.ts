import { performance } from 'perf_hooks';

const BASE_URL = 'https://www.alok-rss.top';

const urls = [
  // The date Baidu failed on (Should be cached now if the server kept running)
  { name: 'Baidu Failed (12-01)', path: '/date/2025-12-01' },
  // A fresh random date likely never visited
  { name: 'Fresh Cold 1', path: '/date/2025-10-15' },
  // Another fresh one
  { name: 'Fresh Cold 2', path: '/date/2025-10-16' },
];

async function checkUrl(item: { name: string; path: string }) {
  const url = `${BASE_URL}${item.path}`;
  console.log(`Checking ${item.name} (${url})...`);
  const start = performance.now();
  try {
    const res = await fetch(url);
    const time = performance.now() - start;
    const color = time < 1000 ? '\x1b[32m' : time < 3000 ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`[${res.status}] ${item.name.padEnd(20)}: ${color}${time.toFixed(2)}ms${reset}`);
  } catch (e) {
    console.error(`ERROR ${item.name}:`, e);
  }
}

async function run() {
  console.log('🚀 Verifying Historical Latency...\n');
  for (const item of urls) {
    await checkUrl(item);
  }
}

run();
