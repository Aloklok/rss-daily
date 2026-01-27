import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

// Manual Fallback
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
    // Ignore env errors
  }
}

const DATE = '2025-11-07';

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing credentials');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(`Diagnosing ${DATE}...`);

  // 1. Check Article Count
  // Use unified Shanghai → UTC window mapping logic from code
  // simple approximation for check:
  const start = `${DATE}T00:00:00+08:00`;
  const end = `${DATE}T23:59:59+08:00`;

  const { count, error } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .gte('n8n_processing_date', new Date(start).toISOString())
    .lte('n8n_processing_date', new Date(end).toISOString());

  if (error) {
    console.error('Error counting articles:', error);
  } else {
    console.log(`Article Count: ${count}`);
  }

  // 2. Measure Latency
  console.log('Measuring HTTP Latency...');
  const targetUrl = `https://www.alok-rss.top/date/${DATE}`;

  const startT = performance.now();
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      },
    });
    const endT = performance.now();
    const text = await res.text();

    console.log(`Status: ${res.status}`);
    console.log(`Time: ${(endT - startT).toFixed(2)}ms`);
    console.log(`Body Size: ${(text.length / 1024).toFixed(2)} KB`);

    if (res.status !== 200) {
      console.log('Response headers:', res.headers);
    }
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}

run();
