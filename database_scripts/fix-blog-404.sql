-- ============================================
-- FIX BLOG 404 ISSUE - PUBLIC READ ACCESS
-- ============================================
-- Run this in Supabase SQL Editor to allow public users to read published blogs

-- 1. First, check if blog exists with that ID
SELECT id, title_en, status, created_at 
FROM blogs 
WHERE id = 'a6e7eea0-9671-4a0c-8d94-2011c1471a42';

-- 2. Check all blogs and their status
SELECT id, title_en, status FROM blogs ORDER BY created_at DESC LIMIT 20;

-- 3. ADD PUBLIC READ POLICY (Most important!)
-- This allows ANYONE (including anonymous users) to read PUBLISHED blogs
DROP POLICY IF EXISTS "Public can read published blogs" ON public.blogs;
CREATE POLICY "Public can read published blogs"
ON public.blogs
FOR SELECT
TO anon, authenticated  -- Both anonymous and logged-in users
USING (status = 'published');

-- 4. If you want to allow reading ALL blogs (for testing), use this instead:
-- WARNING: Only use this temporarily for debugging
-- DROP POLICY IF EXISTS "Allow all reads" ON public.blogs;
-- CREATE POLICY "Allow all reads"
-- ON public.blogs
-- FOR SELECT
-- USING (true);

-- 5. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'blogs';

-- 6. List all policies on blogs table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'blogs';
