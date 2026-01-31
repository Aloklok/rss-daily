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
  'bolding_decisions_en_part_1.json',
  'bolding_decisions_en_part_2.json',
  'bolding_decisions_en_part_3.json',
];

// Target fields to process
const TARGET_FIELDS = ['highlights', 'critiques', 'summary', 'marketTake'];

async function applyFixes() {
  console.log('🚀 Starting English Bolding Fix Application...');

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

  // Process each decision
  let index = 0;
  for (const decision of allDecisions) {
    index++;
    const { id, title, fields: keptFields } = decision;
    console.log(`[${index}/${allDecisions.length}] Processing ${id}...`);

    try {
      // Fetch current article data from articles_en
      const { data: article, error } = await supabase
        .from('articles_en')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !article) {
        console.log(`❌ Article not found in articles_en: ${id} (${title})`);
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

        // Only log if something interesting happens (keeping terms)
        if (keepers.length > 0) {
          console.log(`\n--- Field: ${fieldKey} ---`);
          console.log(`Keepers: ${JSON.stringify(keepers)}`);
        }

        const cleanSet = new Set(keepers);
        let updatedContent: any;

        // Helper to process a single string
        const processString = (str: string) => {
          return str.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
            const innerText = p1.trim();
            // Strict check
            const isKeeper = Array.from(cleanSet).some((k) => k === innerText);
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
          updates[fieldKey] = updatedContent;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const { error: updateError } = await supabase
          .from('articles_en')
          .update(updates)
          .eq('id', id);

        if (updateError) {
          console.log(`❌ Failed to update ${id}:`, updateError);
          failCount++;
        } else {
          console.log(`✅ Updated ${id}: ${Object.keys(updates).join(', ')}`);
          successCount++;
          // Rate Limit: Wait 1 second (lighter than full article update)
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
