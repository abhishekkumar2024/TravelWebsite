-- ============================================
-- Blog Approval Workflow Setup (Production-Ready)
-- ============================================
-- This script sets up a complete blog approval system:
-- 1. Authors create blogs (status: pending)
-- 2. Admin approves → status: published
-- 3. Public sees only published blogs
-- 4. Authors see their own blogs (any status)
-- 5. Admin sees everything
-- ============================================

-- Step 1: Ensure tables exist
CREATE TABLE IF NOT EXISTS public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL,

  -- Core content
  title_en text NOT NULL,
  title_hi text,
  excerpt_en text,
  excerpt_hi text,
  content_en text NOT NULL,
  content_hi text,

  -- Categorization
  destination text,
  category text,

  -- Media & SEO
  cover_image text,
  meta_title text,
  meta_description text,

  -- Author info (JSONB for flexible author data)
  author jsonb,

  -- Images array (JSONB array of image URLs)
  images jsonb DEFAULT '[]'::jsonb,

  -- Status & metrics
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  reading_time_minutes int,
  views int DEFAULT 0,

  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Add missing columns if table already existed
DO $$ 
BEGIN
    -- Add author column if it doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs' 
        AND column_name = 'author'
    ) THEN
        ALTER TABLE public.blogs ADD COLUMN author jsonb;
    END IF;
    
    -- Add images column if it doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs' 
        AND column_name = 'images'
    ) THEN
        ALTER TABLE public.blogs ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Step 3: Update status constraint to include approval workflow
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        -- Drop old constraint if exists
        ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_status_check;
        
        -- Add new constraint with approval statuses
        ALTER TABLE public.blogs ADD CONSTRAINT blogs_status_check
        CHECK (status IN ('draft', 'pending', 'published', 'rejected'));
    END IF;
END $$;

-- Step 4: Update existing rows to have empty images array if null
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs' 
        AND column_name = 'images'
    ) THEN
        UPDATE public.blogs SET images = '[]'::jsonb WHERE images IS NULL;
    END IF;
END $$;

-- Step 5: Create indexes
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_blogs_status ON public.blogs(status);
        CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON public.blogs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_blogs_destination ON public.blogs(destination);
        CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON public.blogs(author_id);
    END IF;
END $$;

-- Step 6: Enable Row Level Security
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 7: Drop ALL existing policies (clean slate)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        DROP POLICY IF EXISTS "Anyone can insert blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Public can insert blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Authenticated users can insert blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Author can create blog (pending)" ON public.blogs;
        DROP POLICY IF EXISTS "Anyone can read published blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Public read published blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Public read approved blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Author read own blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Authenticated read own drafts" ON public.blogs;
        DROP POLICY IF EXISTS "Admin read all blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Authenticated update own blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Admin approve blogs" ON public.blogs;
        DROP POLICY IF EXISTS "Authenticated delete own blogs" ON public.blogs;
    END IF;
END $$;

-- Step 8: INSERT Policy - Authors can create blogs (pending/draft only)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Author can create blog (pending)"
        ON public.blogs
        FOR INSERT
        TO authenticated
        WITH CHECK (
            auth.uid() IS NOT NULL
            AND (author_id = auth.uid() OR author_id IS NULL)
            AND status IN ('draft', 'pending')
        );
    END IF;
END $$;

-- Step 9: SELECT Policy - Public can read ONLY published blogs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Public read approved blogs"
        ON public.blogs
        FOR SELECT
        TO anon, authenticated
        USING (status = 'published');
    END IF;
END $$;

-- Step 10: SELECT Policy - Authors can read their own blogs (any status)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Author read own blogs"
        ON public.blogs
        FOR SELECT
        TO authenticated
        USING (author_id = auth.uid());
    END IF;
END $$;

-- Step 11: SELECT Policy - Admin can read ALL blogs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Admin read all blogs"
        ON public.blogs
        FOR SELECT
        TO authenticated
        USING (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
        );
    END IF;
END $$;

-- Step 12: UPDATE Policy - Authors can edit their own blogs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Author update own blogs"
        ON public.blogs
        FOR UPDATE
        TO authenticated
        USING (author_id = auth.uid())
        WITH CHECK (
            author_id = auth.uid()
            AND status IN ('draft', 'pending')
        );
    END IF;
END $$;

-- Step 13: UPDATE Policy - Admin can approve/reject blogs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Admin approve blogs"
        ON public.blogs
        FOR UPDATE
        TO authenticated
        USING (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
            OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
        )
        WITH CHECK (
            status IN ('published', 'rejected', 'pending', 'draft')
        );
    END IF;
END $$;

-- Step 14: DELETE Policy - Authors can delete their own blogs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        CREATE POLICY "Author delete own blogs"
        ON public.blogs
        FOR DELETE
        TO authenticated
        USING (author_id = auth.uid());
    END IF;
END $$;

-- Step 15: Grant necessary permissions
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) THEN
        GRANT USAGE ON SCHEMA public TO anon, authenticated;
        GRANT ALL ON public.blogs TO anon, authenticated;
        GRANT ALL ON public.authors TO anon, authenticated;
    END IF;
END $$;

-- Step 16: Verification and Summary
DO $$
DECLARE
    table_exists BOOLEAN;
    policy_count INT;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blogs'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Count policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public' 
        AND tablename = 'blogs';
        
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Blog Approval Workflow Setup Complete!';
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Table Status: ✅ blogs table exists';
        RAISE NOTICE 'RLS Policies: % policies created', policy_count;
        RAISE NOTICE '';
        RAISE NOTICE '📋 Policy Summary:';
        RAISE NOTICE '  ✅ Authors can create blogs (pending/draft)';
        RAISE NOTICE '  ✅ Public can read published blogs only';
        RAISE NOTICE '  ✅ Authors can read their own blogs';
        RAISE NOTICE '  ✅ Admin can read all blogs';
        RAISE NOTICE '  ✅ Authors can edit their own blogs';
        RAISE NOTICE '  ✅ Admin can approve/reject blogs';
        RAISE NOTICE '  ✅ Authors can delete their own blogs';
        RAISE NOTICE '';
        RAISE NOTICE '🔐 Next Steps:';
        RAISE NOTICE '  1. Set admin role: See ADMIN_SETUP.sql';
        RAISE NOTICE '  2. Test blog submission';
        RAISE NOTICE '  3. Test admin approval';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING '⚠️ blogs table was not created. Please check for errors above.';
    END IF;
END $$;

-- List all policies for verification
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'blogs'
ORDER BY cmd, policyname;
