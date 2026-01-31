/**
 * scan-zero-bolding.ts
 * 扫描 articles 表，找出 highlights/critiques/marketTake 字段中加粗数量为 0 的记录
 * 输出 zero_bolding_candidates.json 供后续 AI 处理
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 目标字段（不包括 summary）
const TARGET_FIELDS = ['highlights', 'critiques', 'marketTake'] as const;

// 统计加粗数量
function countBoldItems(text: string | null): number {
  if (!text) return 0;
  const matches = text.match(/\*\*/g);
  if (!matches) return 0;
  return Math.floor(matches.length / 2);
}

async function scanZeroBolding() {
  console.log('🔍 Scanning for fields with ZERO bolding...');
  console.log(`   Target fields: ${TARGET_FIELDS.join(', ')}`);
  console.log('');

  // 分页获取所有文章
  let allArticles: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, highlights, critiques, marketTake')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching articles:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allArticles = allArticles.concat(data);
    page++;
    if (data.length < pageSize) break;
  }

  console.log(`📦 Fetched ${allArticles.length} total articles.`);

  // 统计和收集候选
  const stats = {
    highlights: 0,
    critiques: 0,
    marketTake: 0,
  };

  const candidates: {
    id: string;
    title: string;
    fields: Record<string, string>;
  }[] = [];

  for (const article of allArticles) {
    const zeroFields: Record<string, string> = {};

    for (const field of TARGET_FIELDS) {
      const content = article[field];
      // 只处理：内容非空 且 加粗数量为 0
      if (content && content.trim() !== '' && countBoldItems(content) === 0) {
        stats[field]++;
        zeroFields[field] = content;
      }
    }

    // 只有存在 0 加粗字段的文章才加入候选
    if (Object.keys(zeroFields).length > 0) {
      candidates.push({
        id: article.id,
        title: article.title || '',
        fields: zeroFields,
      });
    }
  }

  // 输出统计
  console.log('');
  console.log('📊 Statistics:');
  console.log(`   highlights with 0 bold: ${stats.highlights}`);
  console.log(`   critiques with 0 bold:  ${stats.critiques}`);
  console.log(`   marketTake with 0 bold: ${stats.marketTake}`);
  console.log('');
  console.log(`📋 Total candidate articles: ${candidates.length}`);

  // 导出 JSON
  const exportPath = path.resolve(process.cwd(), 'zero_bolding_candidates.json');
  try {
    fs.writeFileSync(exportPath, JSON.stringify(candidates, null, 2));
    console.log(`💾 Exported to: ${exportPath}`);
    console.log('');
    console.log('Next Step: Provide this JSON to AI Agent for bolding decisions.');
  } catch (e: any) {
    console.error('❌ Export failed:', e.message);
  }
}

scanZeroBolding().catch(console.error);
