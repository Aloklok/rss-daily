import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Config
const STRICT_THRESHOLD = 5; // Process only if > 5 (i.e. 6+)

// Parse Args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

async function fixBolding() {
  console.log(`🔍 Scanning for excessive bolding (> ${STRICT_THRESHOLD} items)...`);
  if (dryRun) console.log('🧪 DRY RUN MODE: No changes will be written to DB.');

  // 1. Fetch failing articles
  let allArticles: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, summary, highlights, critiques, marketTake')
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

  // 2. Filter candidates
  const countBoldItems = (text: string | null) => {
    if (!text) return 0;
    const matches = text.match(/\*\*/g);
    if (!matches) return 0;
    return Math.floor(matches.length / 2);
  };

  const candidates = allArticles.filter((a) => {
    return (
      countBoldItems(a.summary) > STRICT_THRESHOLD ||
      countBoldItems(a.highlights) > STRICT_THRESHOLD ||
      countBoldItems(a.critiques) > STRICT_THRESHOLD ||
      countBoldItems(a.marketTake) > STRICT_THRESHOLD
    );
  });

  const offsetArg = args.find((a) => a.startsWith('--offset='));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1]) : 0;

  console.log(`📋 Found ${candidates.length} candidate articles.`);
  // 3. Prepare Article Tasks
  // Group by Article
  const articleTasks: { id: string; title: string; fields: Record<string, string[]> }[] = [];
  const fields = ['highlights', 'critiques', 'marketTake', 'summary'] as const;

  // slice tasks by limit articles first
  const targetArticles = candidates.slice(offset, offset + limit);
  console.log(`🚀 Preparing tasks for ${targetArticles.length} articles...`);

  for (const article of targetArticles) {
    const failingFields: Record<string, string[]> = {};

    for (const field of fields) {
      const original = article[field] || '';
      const count = countBoldItems(original);
      if (count > STRICT_THRESHOLD) {
        const boldMatches = original.match(/\*\*(.*?)\*\*/g);
        if (boldMatches) {
          failingFields[field] = boldMatches.map((m: string) => m.replace(/\*\*/g, ''));
        }
      }
    }

    if (Object.keys(failingFields).length > 0) {
      articleTasks.push({
        id: article.id,
        title: article.title,
        fields: failingFields,
      });
    }
  }

  console.log(`📦 Generated tasks for ${articleTasks.length} articles.`);

  // 4. Export to JSON for "Agent-in-the-Loop" processing
  const exportPath = path.resolve(process.cwd(), 'bolding_candidates.json');
  try {
    fs.writeFileSync(exportPath, JSON.stringify(articleTasks, null, 2));
    console.log(`\n💾 Exported ${articleTasks.length} tasks to: ${exportPath}`);
    console.log(
      `\nNext Step: generic 'bolding_decisions.json' and run 'apply-bolding-fixes.ts' (to be created).`,
    );
  } catch (e: any) {
    console.error(`❌ Export Failed:`, e.message);
  }
}

// Logic to apply fixes from JSON will be in a separate script or mode
// For now, we only scan and export.

fixBolding().catch(console.error);
