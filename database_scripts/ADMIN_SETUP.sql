-- ============================================
-- ADMIN SETUP SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to grant admin privileges to a user.

-- 1. Replace 'admin@yourdomain.com' with your actual email address.
-- 2. Run the script.

UPDATE auth.users
SET raw_app_meta_data = 
  CASE 
    WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
    ELSE raw_app_meta_data || '{"role": "admin"}'::jsonb
  END
WHERE email = 'abhishekkumarverma109@gmail.com'; -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- Verify the change
SELECT email, raw_app_meta_data 
FROM auth.users 
WHERE email = 'abhishekkumarverma109@gmail.com'; -- ⚠️ CHANGE THIS TO YOUR EMAIL
