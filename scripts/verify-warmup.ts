import { performance } from 'perf_hooks';

const BASE_URL = 'https://www.alok-rss.top';

// Get Today in Shanghai
const getShanghaiDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
};

const urls = [
  { name: 'Homepage', path: '/' },
  // Generate last 7 days dynamically
  ...Array.from({ length: 7 }, (_, i) => ({
    name: `Day -${i}`,
    path: `/date/${getShanghaiDate(i)}`,
  })),
  { name: 'Old Date (Cold)', path: '/date/2025-11-20' },
];

async function checkUrl(item: { name: string; path: string }) {
  const url = `${BASE_URL}${item.path}`;
  const start = performance.now();
  try {
    const res = await fetch(url);
    const time = performance.now() - start;
    const color = time < 1000 ? '\x1b[32m' : time < 3000 ? '\x1b[33m' : '\x1b[31m'; // Green < 1s, Yellow < 3s, Red > 3s
    const reset = '\x1b[0m';

    console.log(
      `[${res.status}] ${item.name.padEnd(15)}: ${color}${time.toFixed(2)}ms${reset}  (${url})`,
    );
  } catch (e) {
    console.error(`ERROR ${item.name}:`, e);
  }
}

async function run() {
  console.log('🚀 Verifying Response Times (7-Day Window)...\n');
  for (const item of urls) {
    await checkUrl(item);
  }
}

run();
