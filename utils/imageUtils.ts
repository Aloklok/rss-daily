import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'public-assets';
const FOLDER_NAME = 'daily-covers';
const RETENTION_DAYS = 365;

// Singleton Admin Client (Lazy Init)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getStorageAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase Admin credentials');
    }
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

// In-memory flag to avoid redundant bucket checks (Optimization)
let bucketVerified = false;

// In-memory cache for verified image dates to reduce Storage API calls (Optimization)
// This is essential to prevent repeated 'list' calls on every page landing (e.g. from monitors).
const verifiedDates = new Set<string>();

// 1. Ensure Bucket Exists (Idempotent + Cached)
async function ensureBucketExists(client: ReturnType<typeof createClient>) {
  if (bucketVerified) return;

  try {
    const { error } = await client.storage.getBucket(BUCKET_NAME);
    if (error && error.message.includes('not found')) {
      console.log(`[ImageCache] Bucket '${BUCKET_NAME}' not found. Creating...`);
      const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (createError) console.error('[ImageCache] Create Bucket Failed:', createError);
      else console.log(`[ImageCache] Bucket '${BUCKET_NAME}' created.`);
    }
    // Mark as verified so we don't check again in this process
    bucketVerified = true;
  } catch (e) {
    console.warn('[ImageCache] Bucket check failed:', e);
  }
}

// 2. Retention Policy: Clean old images
async function cleanUpOldImages(client: ReturnType<typeof createClient>) {
  try {
    // List files (Supabase defaults to 100 limit, typically enough for retention check)
    const { data: files } = await client.storage
      .from(BUCKET_NAME)
      .list(FOLDER_NAME, { limit: 100, sortBy: { column: 'created_at', order: 'asc' } });

    if (!files || files.length === 0) return;

    // Filter files older than N days (OR simply by count to ensure we don't go over limit)
    // Strategy: Simple Count-Based Retention (Keep last ~35 files to be safe)
    // Why? Clock skew or file modification times can be tricky. Count is robust.
    const MAX_FILES = RETENTION_DAYS + 5;

    if (files.length > MAX_FILES) {
      const filesToDelete = files
        .slice(0, files.length - MAX_FILES)
        .map((f) => `${FOLDER_NAME}/${f.name}`);

      if (filesToDelete.length > 0) {
        console.log(`[ImageGC] Deleting ${filesToDelete.length} old images...`);
        await client.storage.from(BUCKET_NAME).remove(filesToDelete);
      }
    }
  } catch (e) {
    console.warn('[ImageGC] Cleanup failed:', e);
  }
}

import {
  BRIEFING_IMAGE_WIDTH,
  BRIEFING_IMAGE_HEIGHT,
  BRIEFING_IMAGE_RESOLUTION_SUFFIX,
} from '../lib/constants';

const resolveBriefingImageRequest = async (date: string): Promise<string> => {
  // --- 1. Build Time Optimization ---
  // If we are in the CI/Build phase, DO NOT fetch/upload images to avoid timeouts.
  // Instead, return a placeholder or the raw Picsum URL (Next.js will just use it).
  // This prevents "Miss for date..." logs spamming the build logs and timing out Vercel.
  if (process.env.CI || process.env.NEXT_PHASE === 'phase-production-build') {
    // console.log(`[ImageCache] Skipping for ${date} during build.`);
    return `https://picsum.photos/seed/${date}/${BRIEFING_IMAGE_WIDTH}/${BRIEFING_IMAGE_HEIGHT}.webp`;
  }

  const admin = getStorageAdmin();
  const fileName = `${FOLDER_NAME}/${date}_${BRIEFING_IMAGE_RESOLUTION_SUFFIX}.webp`;

  const buildPublicUrl = () => {
    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  };

  // 0. Memory Cache Hit (Fast Path: 0 requests)
  if (verifiedDates.has(date)) {
    return buildPublicUrl();
  }

  // 1. Try to find if the file exists in Storage (Slow Path: 1 request)
  const { data: existingFiles } = await admin.storage
    .from(BUCKET_NAME)
    .list(FOLDER_NAME, { search: `${date}_${BRIEFING_IMAGE_RESOLUTION_SUFFIX}.webp` });

  // If exists, return Public URL immediately and cache the hit
  if (existingFiles && existingFiles.length > 0) {
    verifiedDates.add(date);
    return buildPublicUrl();
  }

  // --- Cache Miss ---
  console.log(`[ImageCache] Miss for ${date}. Fetching from Picsum...`);

  // Ensure bucket exists before we try to upload (Only on Miss)
  await ensureBucketExists(admin);

  // Use .webp suffix for Picsum to get WebP format directly
  const picsumUrl = `https://picsum.photos/seed/${date}/${BRIEFING_IMAGE_WIDTH}/${BRIEFING_IMAGE_HEIGHT}.webp`;

  try {
    const res = await fetch(picsumUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Picsum status: ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload as WebP
    const { error: uploadError } = await admin.storage.from(BUCKET_NAME).upload(fileName, buffer, {
      contentType: 'image/webp',
      upsert: true,
    });

    if (uploadError) {
      console.error('[ImageCache] Upload failed:', uploadError);
      // Fallback to source
      return picsumUrl;
    }

    // Cache the newly created image in memory
    verifiedDates.add(date);

    // Trigger cleanup async
    cleanUpOldImages(admin);

    // Return new URL
    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  } catch (e) {
    console.error('[ImageCache] Fallback to Picsum due to error:', e);
    return picsumUrl;
  }
};

/**
 * Cache Request Memoization
 * Ensures we only calculate/fetch the image ONCE per server request (Metadata + Page).
 */
import { cache } from 'react';
export const resolveBriefingImage = cache(resolveBriefingImageRequest);
