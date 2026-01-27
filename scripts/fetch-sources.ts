import dotenv from 'dotenv';
// Native fetch is available in Node 18+

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Fetching subscriptions from FreshRSS...');

  const apiUrl = process.env.FRESHRSS_API_URL;
  const authToken = process.env.FRESHRSS_AUTH_TOKEN;

  if (!apiUrl || !authToken) {
    console.error('Missing env vars');
    return;
  }

  const headers = {
    Authorization: `GoogleLogin auth=${authToken}`,
  };

  try {
    const url = `${apiUrl}/greader.php/reader/api/0/subscription/list?output=json`;
    console.log(`Fetching: ${url}`);

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (!data.subscriptions) {
      console.log('No subscriptions found or invalid format.');
      return;
    }

    console.log(`Found ${data.subscriptions.length} subscriptions.`);

    const sources = data.subscriptions.map((sub: any) => ({
      id: sub.id, // e.g., "feed/http://..."
      title: sub.title,
      category: sub.categories?.[0]?.label || 'Uncategorized',
    }));

    console.log(JSON.stringify(sources, null, 2));

    // Fetch Tags
    const tagsUrl = `${apiUrl}/greader.php/reader/api/0/tag/list?output=json`;
    console.log(`Fetching Tags: ${tagsUrl}`);
    const tagsResponse = await fetch(tagsUrl, { headers });
    if (!tagsResponse.ok) console.error('Failed to fetch tags');
    else {
      const tagsData = (await tagsResponse.json()) as any;
      if (tagsData.tags) {
        const tags = tagsData.tags
          .filter((t: any) => t.type === 'tag') // Only actual tags, not folders/states
          .map((t: any) => t.id.split('/').pop()); // Extract tag name from "user/1/tag/TagName"
        console.log('Tags:', JSON.stringify(tags, null, 2));
      }
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
  }
}

main();
