// /api/search-articles.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler, getSupabaseClient } from './_utils.js';

async function searchArticles(req: VercelRequest, res: VercelResponse) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Search query parameter is required.' });
  }

  const supabase = getSupabaseClient();

  try {
    // 【核心修改】使用 .rpc() 调用我们刚刚创建的不区分大小写的函数
    const { data, error } = await supabase
      .rpc('search_articles_by_partial_keyword', {
        search_term: query.trim() // 将用户的搜索词作为参数传递
      });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({
        message: 'Supabase search failed via RPC',
        details: error.message,
      });
    }

    return res.status(200).json(data || []);

  } catch (err: any) {
    console.error('Unexpected server error', err);
    return res.status(500).json({
      message: 'Unexpected server error',
      details: err?.message ?? String(err),
    });
  }
}

export default apiHandler(['GET'], searchArticles);