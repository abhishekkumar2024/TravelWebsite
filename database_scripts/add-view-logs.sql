-- ============================================================
-- View Logs Table — IP-based deduplication for view counting
-- Run this in Neon SQL editor (Master DB)
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_view_logs (
    id BIGSERIAL PRIMARY KEY,
    blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    ip_hash TEXT NOT NULL,          -- SHA-256 hash of IP (privacy-safe)
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup: "has this IP viewed this blog recently?"
CREATE INDEX IF NOT EXISTS idx_view_logs_blog_ip
ON blog_view_logs (blog_id, ip_hash, viewed_at DESC);

-- Auto-cleanup: delete view logs older than 7 days (keeps table small)
-- Run this periodically via a cron job or Neon's pg_cron:
-- DELETE FROM blog_view_logs WHERE viewed_at < NOW() - INTERVAL '7 days';
