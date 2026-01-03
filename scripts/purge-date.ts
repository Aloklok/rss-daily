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
    /* Ignore */
  }
}

const SECRET = process.env.REVALIDATION_SECRET;
const DATE = '2025-11-07';

async function run() {
  console.log(`Purging ${DATE}...`);
  const res = await fetch('https://www.alok-rss.top/api/system/revalidate-date', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: DATE, secret: SECRET }),
  });

  console.log(`Status: ${res.status}`);
  const txt = await res.text();
  console.log(txt);
}

run();
