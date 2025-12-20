import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testFetchSubscriptions() {
  try {
    console.log('Testing fetchSubscriptions (Standalone)...');

    const apiUrl = process.env.FRESHRSS_API_URL;
    const authToken = process.env.FRESHRSS_AUTH_TOKEN;

    if (!apiUrl || !authToken) {
      throw new Error('FreshRSS environment variables are not configured.');
    }

    const headers = {
      Authorization: `GoogleLogin auth=${authToken}`,
    };

    const url = `${apiUrl}/greader.php/reader/api/0/subscription/list?output=json`;
    console.log(`Fetching from: ${url}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.subscriptions && data.subscriptions.length > 0) {
      console.log('Success! Found', data.subscriptions.length, 'subscriptions.');
      console.log('Sample Subscription Item:');
      console.log(JSON.stringify(data.subscriptions[0], null, 2));
    } else {
      console.log('Success, but no subscriptions found.');
      console.log('Full Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
  }
}

testFetchSubscriptions();
