-- ============================================
-- Backfill Empty Canonical URLs
-- ============================================
-- Automatically sets canonical_url for all blogs
-- where it's currently NULL or empty.
--
-- Format: https://www.camelthar.com/blog/{slug}/
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- Preview: See which blogs will be updated
SELECT id, slug, title_en, canonical_url
FROM blogs
WHERE canonical_url IS NULL OR canonical_url = ''
ORDER BY created_at DESC;

-- Backfill: Set canonical_url from slug
UPDATE blogs
SET canonical_url = 'https://www.camelthar.com/blog/' || slug || '/'
WHERE (canonical_url IS NULL OR canonical_url = '')
  AND slug IS NOT NULL
  AND slug != '';

-- Verify: Check that all blogs now have canonical_url
SELECT id, slug, canonical_url 
FROM blogs 
WHERE canonical_url IS NULL OR canonical_url = '';
-- Expected: 0 rows (all filled)
