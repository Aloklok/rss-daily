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
      console.log('Manually parsed .env.local');
    } else {
      console.warn('.env.local not found');
    }
  } catch (e) {
    console.error('Failed to read .env.local', e);
  }
}

const BUCKET_NAME = 'public-assets';
const FOLDER_NAME = 'daily-covers';

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Credentials Check:', {
    URL_Exists: !!url,
    Key_Exists: !!key,
  });

  if (!url || !key) {
    console.error(
      'Missing credentials. Please check .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('Fetching file list from Supabase...');

  let allFiles: string[] = [];
  let page = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(FOLDER_NAME, {
      limit: pageSize,
      offset: page * pageSize,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('Error listing files:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allFiles = allFiles.concat(data.map((f) => f.name));
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`\nFound ${allFiles.length} files in storage.`);

  try {
    const res = await fetch('https://www.alok-rss.top/api/meta/available-dates');
    // Ensure we parse JSON correctly
    const text = await res.text();
    let dates: string[] = [];
    try {
      dates = JSON.parse(text);
    } catch {
      console.error('Failed to parse API response:', text.substring(0, 100));
      return;
    }

    console.log(`Expected ${dates.length} dates from API.`);

    const missing: string[] = [];

    dates.forEach((date) => {
      // Match logic from imageUtils: needs to start with the date
      const found = allFiles.some((f) => f.startsWith(date));
      if (!found) missing.push(date);
    });

    if (missing.length > 0) {
      console.log('\n❌ MISSING Dates in Storage (First 10):');
      missing.slice(0, 10).forEach((d) => console.log(` - ${d}`));
      if (missing.length > 10) console.log(`... and ${missing.length - 10} more.`);
    } else {
      console.log('\n✅ All expected dates have images.');
    }
  } catch (e) {
    console.error('Failed to fetch stats:', e);
  }
}

run();
