-- ============================================
-- ADD SEO FIELDS TO BLOGS TABLE
-- ============================================
-- Run this in Supabase SQL Editor to add SEO support fields

-- Add meta_title column
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS meta_title TEXT;

-- Add meta_description column  
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Add focus_keyword column (for internal SEO tracking)
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS focus_keyword TEXT;

-- Add canonical_url column (for duplicate content management)
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Set default values for existing rows (use existing title/excerpt)
UPDATE public.blogs 
SET meta_title = title_en 
WHERE meta_title IS NULL;

UPDATE public.blogs 
SET meta_description = excerpt_en 
WHERE meta_description IS NULL;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'blogs' 
  AND column_name IN ('meta_title', 'meta_description', 'focus_keyword', 'canonical_url');
