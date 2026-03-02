-- ============================================================
-- Blog Counter System — Atomic, Reusable, Concurrency-Safe
-- Run this in Neon SQL editor (Master DB)
-- ============================================================

-- 1. Ensure columns exist (BIGINT for future-proofing)
ALTER TABLE blogs
ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0;

-- 2. Create reusable atomic increment function
CREATE OR REPLACE FUNCTION increment_blog_counter(
    blog_id UUID,
    column_name TEXT
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE blogs SET %I = %I + 1 WHERE id = $1',
        column_name,
        column_name
    )
    USING blog_id;
END;
$$ LANGUAGE plpgsql;

-- Usage examples:
-- SELECT increment_blog_counter('blog-uuid-here', 'views');
-- SELECT increment_blog_counter('blog-uuid-here', 'shares');
