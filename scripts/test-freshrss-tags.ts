// 测试脚本: 给文章加标签并获取完整数据结构
// 运行方式: npx tsx test-freshrss-tags.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testFetchWithTags() {
  const FRESHRSS_API_URL = process.env.FRESHRSS_API_URL;
  const FRESHRSS_AUTH_TOKEN = process.env.FRESHRSS_AUTH_TOKEN;

  if (!FRESHRSS_API_URL || !FRESHRSS_AUTH_TOKEN) {
    console.error('Missing FRESHRSS_API_URL or FRESHRSS_AUTH_TOKEN');
    return;
  }

  const BASE_GREADER_URL = `${FRESHRSS_API_URL}/greader.php/reader/api/0`;
  const headers = {
    Authorization: `GoogleLogin auth=${FRESHRSS_AUTH_TOKEN}`,
  };

  try {
    // 1. 获取 Action Token (编辑操作需要 T token)
    const tokenUrl = `${BASE_GREADER_URL}/token`;
    const tokenResp = await fetch(tokenUrl, { headers });
    const T = await tokenResp.text();
    console.log('Got Action Token:', T.trim());

    // 2. 获取一篇文章 ID
    const listUrl = `${BASE_GREADER_URL}/stream/contents/user/-/state/com.google/reading-list?output=json&n=1`;
    const listResp = await fetch(listUrl, { headers });
    const listData = await listResp.json();

    if (!listData.items || listData.items.length === 0) {
      console.error('No articles found.');
      return;
    }

    const item = listData.items[0];
    const itemId = item.id;
    const testTag = 'user/-/label/TestTag123';

    console.log(`\nSelected Article: ${item.title} (${itemId})`);
    console.log('Original Categories:', JSON.stringify(item.categories, null, 2));

    // 3. 给文章添加 Tag
    console.log(`\nAdding tag: ${testTag}`);
    const editUrl = `${BASE_GREADER_URL}/edit-tag`;
    const form = new URLSearchParams();
    form.append('i', itemId);
    form.append('a', testTag); // Add tag
    form.append('T', T.trim());

    const editResp = await fetch(editUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    if (!editResp.ok) {
      console.error('Edit failed:', await editResp.text());
      return;
    }
    console.log('Tag added successfully.');

    // 4. 再次获取文章详情，查看标签结构
    // 为防止缓存，加个 timestamp
    console.log('\nFetching article details...');
    const contentUrl = `${BASE_GREADER_URL}/stream/items/contents?output=json&excludeContent=1&ck=${Date.now()}`;
    const contentForm = new URLSearchParams();
    contentForm.append('i', itemId);

    const contentResp = await fetch(contentUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: contentForm,
    });

    const contentData = await contentResp.json();
    if (contentData.items && contentData.items.length > 0) {
      const updatedItem = contentData.items[0];
      console.log('\n=== 带有 Tag 的完整数据结构 ===');
      console.log(JSON.stringify(updatedItem, null, 2));

      console.log('\nCategories:', JSON.stringify(updatedItem.categories, null, 2));
      console.log('Tags Field:', JSON.stringify(updatedItem.tags, null, 2)); // Check if "tags" field is populated?
    }

    // 5. 清理 Tag
    console.log(`\nRemoving tag: ${testTag}`);
    const removeForm = new URLSearchParams();
    removeForm.append('i', itemId);
    removeForm.append('r', testTag); // Remove tag
    removeForm.append('T', T.trim());

    await fetch(editUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: removeForm,
    });
    console.log('Tag removed.');
  } catch (e) {
    console.error('Error:', e);
  }
}

testFetchWithTags();
