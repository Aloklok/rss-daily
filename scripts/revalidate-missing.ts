import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env
dotenv.config({ path: '.env.local' });

// Manual Fallback if dotenv fails
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
    // Ignore env file errors
  }
}

const BUCKET_NAME = 'public-assets';
const FOLDER_NAME = 'daily-covers';
const REVALIDATE_URL = 'https://www.alok-rss.top/api/system/revalidate-date';
const SECRET = process.env.REVALIDATION_SECRET;

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing credentials.');
    process.exit(1);
  }

  if (!SECRET) {
    console.error('Missing REVALIDATION_SECRET.');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('Fetching file list...');
  let allFiles: string[] = [];
  let page = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(FOLDER_NAME, { limit: pageSize, offset: page * pageSize });
    if (error || !data || data.length === 0) break;
    allFiles = allFiles.concat(data.map((f) => f.name));
    if (data.length < pageSize) break;
    page++;
  }

  try {
    const res = await fetch('https://www.alok-rss.top/api/meta/available-dates');
    const dates = (await res.json()) as string[];

    // Find missing
    const missing: string[] = [];
    dates.forEach((date) => {
      if (!allFiles.some((f) => f.startsWith(date))) {
        missing.push(date);
      }
    });

    console.log(`Found ${missing.length} missing dates.`);

    // Process missing
    for (const date of missing) {
      process.stdout.write(`Revalidating ${date}... `);
      try {
        const revalRes = await fetch(REVALIDATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, secret: SECRET }),
        });

        if (revalRes.ok) {
          console.log('✅ OK');
        } else {
          console.log(`❌ Failed: ${revalRes.status}`);
        }
      } catch (e) {
        console.log(`❌ Error: ${e}`);
      }
    }

    console.log(
      '\nMissing dates revalidated. This should trigger ISR regeneration and image upload.',
    );
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
