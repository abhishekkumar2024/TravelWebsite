-- ============================================
-- ADMIN SETUP SCRIPT (SUPER-ADMIN ENABLED)
-- ============================================

-- Step 1: Create the 'admin' role in Postgres if you want to use it as a DB role
-- Run this in the SQL Editor to fix "role 'admin' does not exist" error
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
END $$;

-- Grant permissions to the admin role
GRANT usage ON SCHEMA public TO admin;
GRANT all ON ALL TABLES IN SCHEMA public TO admin;
GRANT all ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT all ON ALL FUNCTIONS IN SCHEMA public TO admin;

-- Step 2: Grant admin privileges to a specific user
-- Replace 'abhishekkumarverma109@gmail.com' with your actual email address.
UPDATE auth.users
SET 
  role = 'authenticated', -- Keep as authenticated for Supabase API compatibility
  raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
      ELSE raw_app_meta_data || '{"role": "admin"}'::jsonb
    END
WHERE email = 'abhishekkumarverma109@gmail.com'; 

-- Verify the change
SELECT id, email, role, raw_app_meta_data 
FROM auth.users 
WHERE email = 'abhishekkumarverma109@gmail.com';

-- Step 3: Update Blog Policies for Admins (Run this if policies exist)
-- This allows admins to insert blogs with ANY status (including 'published')
DROP POLICY IF EXISTS "Admin can insert anything" ON public.blogs;
CREATE POLICY "Admin can insert anything"
ON public.blogs
FOR INSERT
TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
);

-- Admins can update anything too
DROP POLICY IF EXISTS "Admin can update anything" ON public.blogs;
CREATE POLICY "Admin can update anything"
ON public.blogs
FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
);
