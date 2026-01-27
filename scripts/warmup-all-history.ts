import { performance } from 'perf_hooks';

const BASE_URL = 'https://www.alok-rss.top';
const API_URL = `${BASE_URL}/api/meta/available-dates`;
const CONCURRENCY = 5;

async function fetchAvailableDates(): Promise<string[]> {
  console.log(`Fetching date list from ${API_URL}...`);
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Failed to fetch dates: ${res.status}`);
  const dates = (await res.json()) as string[];
  console.log(`Found ${dates.length} historical dates.`);
  return dates;
}

async function warmUpUrl(date: string, index: number, total: number) {
  const url = `${BASE_URL}/date/${date}`;
  const start = performance.now();
  try {
    // Determine if it's potentially 'hot' (recent 7 days) for logging curiosity
    // But we treat all equality here.
    const res = await fetch(url);
    const time = performance.now() - start;
    const color = time < 1000 ? '\x1b[32m' : time < 3000 ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(
      `[${index + 1}/${total}] ${date}: ${color}${time.toFixed(0)}ms${reset} [${res.status}]`,
    );
    return { date, time, status: res.status };
  } catch (e) {
    console.error(`❌ Error warming ${date}:`, e);
    return { date, time: 0, status: 'ERROR' };
  }
}

async function run() {
  console.log('🚀 Starting Full Historical Warmup...');

  try {
    const dates = await fetchAvailableDates();

    // Chunking for concurrency
    for (let i = 0; i < dates.length; i += CONCURRENCY) {
      const chunk = dates.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((date, idx) => warmUpUrl(date, i + idx, dates.length)));
    }

    console.log('\n✅ All dates processed.');
  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

run();
