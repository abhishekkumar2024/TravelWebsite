-- ============================================
-- Submit Performance Logs Table
-- ============================================
-- Tracks timing at each stage of blog submission
-- to identify bottlenecks and slow operations.
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

CREATE TABLE IF NOT EXISTS submit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Who submitted
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    
    -- What was submitted
    blog_id TEXT,                          -- ID of the created/updated blog
    blog_slug TEXT,                        -- Slug for reference
    action TEXT NOT NULL DEFAULT 'submit', -- 'submit' or 'edit'
    
    -- Timing data (all in milliseconds)
    total_duration_ms INTEGER,             -- Total time from start to finish
    
    -- Stage-wise breakdown
    stages JSONB DEFAULT '[]'::jsonb,
    -- Example: [
    --   { "name": "base64_cleanup", "duration_ms": 12 },
    --   { "name": "image_filtering", "duration_ms": 5 },
    --   { "name": "database_insert", "duration_ms": 1200 },
    --   { "name": "orphan_cleanup", "duration_ms": 45 },
    --   { "name": "cache_revalidation", "duration_ms": 300 }
    -- ]
    
    -- Payload info
    payload_size_kb NUMERIC(10,2),         -- Size of data sent to Supabase
    content_word_count INTEGER,            -- Word count of the blog
    images_count INTEGER,                  -- Number of images in blog
    orphaned_images_count INTEGER,         -- Number of orphaned images cleaned
    
    -- Status
    status TEXT DEFAULT 'success',         -- 'success', 'error', 'timeout'
    error_message TEXT,                    -- Error details if failed
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user and time
CREATE INDEX IF NOT EXISTS idx_submit_logs_user_id ON submit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_submit_logs_created_at ON submit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submit_logs_action ON submit_logs(action);

-- RLS: Users can insert their own logs, admins can read all
ALTER TABLE submit_logs ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to INSERT their own logs
CREATE POLICY "Users can insert own logs" ON submit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own logs
CREATE POLICY "Users can read own logs" ON submit_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Allow service role full access (for admin dashboard later)
-- Note: service_role bypasses RLS by default

COMMENT ON TABLE submit_logs IS 'Performance tracking for blog submit/edit operations';
