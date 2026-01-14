// Test script: Debug FreshRSS /tag/list API response
// Run: npx tsx test-tag-fetch.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testTagListAPI() {
  const FRESHRSS_API_URL = process.env.FRESHRSS_API_URL;
  const FRESHRSS_AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

  if (!FRESHRSS_API_URL || !FRESHRSS_AUTH_TOKEN) {
    console.error('Missing FRESHRSS_API_URL or FRESHRSS_AUTH_TOKEN');
    return;
  }

  console.log('Testing FreshRSS /tag/list API...');
  console.log(`API URL: ${FRESHRSS_API_URL}`);
  console.log(`Auth Token: ${FRESHRSS_AUTH_TOKEN.slice(0, 10)}...`);

  try {
    const url = `${FRESHRSS_API_URL}/greader.php/reader/api/0/tag/list?output=json&with_counts=1`;
    const headers = {
      Authorization: `GoogleLogin auth=${FRESHRSS_AUTH_TOKEN}`,
    };

    console.log(`\nCalling: ${url}`);
    const response = await fetch(url, { headers });

    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    const data = await response.json();
    console.log('\nRaw Response:');
    console.log(JSON.stringify(data, null, 2));

    // Check categories (type === 'folder')
    const categories = data.tags?.filter((item: any) => item.type === 'folder') || [];
    const tags = data.tags?.filter((item: any) => item.type !== 'folder') || [];

    console.log(`\n✅ Categories (folders): ${categories.length}`);
    console.log(`✅ Tags (non-folder): ${tags.length}`);

    if (categories.length > 0) {
      console.log('\nFirst few categories:');
      categories.slice(0, 3).forEach((cat: any) => {
        console.log(`  - ${cat.id} (count: ${cat.count})`);
      });
    }

    if (tags.length > 0) {
      console.log('\nFirst few tags:');
      tags.slice(0, 3).forEach((tag: any) => {
        console.log(`  - ${tag.id} (count: ${tag.count})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testTagListAPI();
