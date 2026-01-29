import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DECISION_FILES = [
  'bolding_decisions_part_1.json',
  'bolding_decisions_part_2.json',
  'bolding_decisions_part_3.json',
  'bolding_decisions_part_4.json',
  'bolding_decisions_part_5.json',
];

// Target fields to process
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

async function scanForViolations() {
  console.log('🔎 Scanning DB for remaining violations (>5 bold items)...');
  let hasMore = true;
  let page = 0;
  const limit = 1000;
  let totalViolations = 0;
  const failingIds = new Set<string>();

  while (hasMore) {
    const { data: candidates, error } = await supabase
      .from('articles')
      .select('id, highlights, critiques, summary, marketTake')
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
      for (const field of TARGET_FIELDS) {
        // @ts-expect-error -- implicit any on article[field]
        if (countBoldItems(article[field]) > 5) {
          isViolator = true;
          break;
        }
      }
      if (isViolator) {
        totalViolations++;
        failingIds.add(article.id);
      }
    }

    if (candidates.length < limit) {
      hasMore = false;
    }
    page++;
  }
  console.log(`📊 Current Status: ${totalViolations} articles still have excessive bolding.`);
  console.log('------------------------------------------------');
}

async function applyFixes() {
  console.log('🚀 Starting Bolding Fix Application...');

  // Pre-flight check
  await scanForViolations();

  // 1. Load all decisions
  let allDecisions: any[] = [];
  for (const filename of DECISION_FILES) {
    const filePath = path.join(process.cwd(), filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      try {
        const decisions = JSON.parse(content);
        allDecisions = allDecisions.concat(decisions);
        console.log(`✅ Loaded ${decisions.length} decisions from ${filename}`);
      } catch (e) {
        console.log(`❌ Failed to parse ${filename}:`, e);
      }
    } else {
      console.warn(`⚠️ Warning: File not found: ${filename}`);
    }
  }

  console.log(`📦 Total Processable Articles: ${allDecisions.length}`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  // 2. Process each decision
  let index = 0;
  for (const decision of allDecisions) {
    index++;
    const { id, title, fields: keptFields } = decision;
    console.log(`[${index}/${allDecisions.length}] Processing ${id}...`);

    try {
      // Fetch current article data
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !article) {
        console.log(`❌ Article not found: ${id} (${title})`);
        failCount++;
        continue;
      }

      let hasChanges = false;
      const updates: any = {};

      // Process each field
      for (const fieldKey of TARGET_FIELDS) {
        const keepers = keptFields[fieldKey];
        const specificFieldContent = article[fieldKey];

        if (!specificFieldContent) {
          continue;
        }

        if (keepers === undefined) {
          continue;
        }

        console.log(`\n--- Field: ${fieldKey} ---`);
        console.log(`Keepers: ${JSON.stringify(keepers)}`);

        const cleanSet = new Set(keepers);
        let updatedContent: any;

        // Helper to process a single string
        const processString = (str: string) => {
          return str.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
            const innerText = p1.trim();
            const isKeeper = Array.from(cleanSet).some((k) => k === innerText);
            // console.log(`   Found bold: "${innerText}" -> Keep? ${isKeeper}`);
            return isKeeper ? match : p1;
          });
        };

        if (Array.isArray(specificFieldContent)) {
          updatedContent = specificFieldContent.map((text) => processString(String(text)));
        } else if (typeof specificFieldContent === 'string') {
          updatedContent = processString(specificFieldContent);
        } else {
          console.log(`Skipping unknown type: ${typeof specificFieldContent}`);
          continue;
        }

        if (JSON.stringify(updatedContent) !== JSON.stringify(specificFieldContent)) {
          // console.log(`>>> CHANGE DETECTED <<<`);
          updates[fieldKey] = updatedContent;
          hasChanges = true;
        } else {
          // console.log(`No changes for field ${fieldKey}`);
        }
      }

      if (hasChanges) {
        const { error: updateError } = await supabase.from('articles').update(updates).eq('id', id);

        if (updateError) {
          console.log(`❌ Failed to update ${id}:`, updateError);
          failCount++;
        } else {
          console.log(`✅ Updated ${id}: ${Object.keys(updates).join(', ')}`);
          successCount++;
          // Rate Limit: Wait 5 seconds to avoid flooding translation webhooks
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } else {
        console.log(`⏭️ Skipped (No changes) ${id}`);
        skipCount++;
      }
    } catch (e) {
      console.log(`❌ Exception processing ${id}:`, e);
      failCount++;
    }
  }

  console.log('------------------------------------------------');
  console.log(`🎉 Finished!`);
  console.log(`✅ Updated: ${successCount}`);
  console.log(`⏭️ Skipped (No changes): ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

applyFixes().catch(console.log);
