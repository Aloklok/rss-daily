import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_FIELDS = ['highlights', 'critiques', 'summary', 'marketTake'];

// Helper to count bold items
function countBoldItems(content: any): number {
  if (!content) return 0;
  if (Array.isArray(content)) {
    // Concatenate array strings and count matches
    const str = content.join(' ');
    return (str.match(/\*\*(.*?)\*\*/g) || []).length;
  }
  if (typeof content === 'string') {
    return (content.match(/\*\*(.*?)\*\*/g) || []).length;
  }
  return 0;
}

async function scanEnArticles() {
  console.log('🔎 Scanning articles_en for excessive bolding (>5 items)...');
  let hasMore = true;
  let page = 0;
  const limit = 1000;
  let totalViolations = 0;
  const candidatesToExport: any[] = [];

  while (hasMore) {
    const { data: candidates, error } = await supabase
      .from('articles_en')
      .select('id, title, highlights, critiques, summary, marketTake')
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      console.error('Error scanning DB:', error);
      break;
    }

    if (!candidates || candidates.length === 0) {
      hasMore = false;
      break;
    }

    for (const article of candidates) {
      let isViolator = false;
      const failingFields: Record<string, string[]> = {};

      for (const field of TARGET_FIELDS) {
        // @ts-expect-error -- implicit any on article[field]
        const content = article[field] as string;
        if (countBoldItems(content) > 5) {
          isViolator = true;
          const boldMatches = Array.isArray(content)
            ? content.join(' ').match(/\*\*(.*?)\*\*/g)
            : (content as string).match(/\*\*(.*?)\*\*/g);

          if (boldMatches) {
            failingFields[field] = boldMatches.map((m: string) => m.replace(/\*\*/g, ''));
          }
        }
      }
      if (isViolator) {
        totalViolations++;
        candidatesToExport.push({
          id: article.id,
          title: article.title,
          fields: failingFields,
        });
      }
    }

    if (candidates.length < limit) {
      hasMore = false;
    }
    page++;
  }
  console.log('------------------------------------------------');
  console.log(`📊 Result: ${totalViolations} English articles have excessive bolding.`);

  if (candidatesToExport.length > 0) {
    fs.writeFileSync('bolding_candidates_en.json', JSON.stringify(candidatesToExport, null, 2));
    console.log(
      `✅ Exported ${candidatesToExport.length} candidates to bolding_candidates_en.json`,
    );
  }
  console.log('------------------------------------------------');
}

scanEnArticles().catch(console.error);
