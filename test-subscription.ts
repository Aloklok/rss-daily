import { getFreshRssClient } from './lib/server/apiUtils';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testFetchSubscriptions() {
  try {
    console.log('Testing fetchSubscriptions...');
    const client = getFreshRssClient();
    const data = await client.get('/subscription/list', { output: 'json' });
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
  }
}

testFetchSubscriptions();
