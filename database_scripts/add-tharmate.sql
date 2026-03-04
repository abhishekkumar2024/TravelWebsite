-- ============================================
-- THARMATE — Travel Companion Feature
-- ============================================
-- Run this in Neon's SQL Editor to add the TharMate tables.
-- ============================================

-- Travel plans posted by users looking for companions
CREATE TABLE IF NOT EXISTS tharmate_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Plan details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    destination TEXT NOT NULL,           -- e.g. 'jaisalmer', 'jaipur'
    meeting_point TEXT,                  -- e.g. 'Jaisalmer Fort Main Gate'
    plan_date DATE NOT NULL,
    plan_time TIME,                      -- e.g. '09:00'

    -- Preferences
    max_companions INT DEFAULT 3,        -- How many people can join
    vibe TEXT[] DEFAULT '{}',            -- e.g. {'photography', 'adventure', 'food'}
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    is_spark BOOLEAN DEFAULT FALSE,      -- Leaving soon (< 2 hours)

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ               -- Auto-expire after plan_date + 1 day
);

-- Join requests from other travelers
CREATE TABLE IF NOT EXISTS tharmate_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES tharmate_plans(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    message TEXT,                         -- Optional message to plan creator
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One request per user per plan
    UNIQUE(plan_id, requester_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────

-- Fast lookups by destination and status (main listing query)
CREATE INDEX IF NOT EXISTS idx_tharmate_plans_destination 
    ON tharmate_plans(destination, status);

-- Fast lookups by date (for filtering upcoming plans)
CREATE INDEX IF NOT EXISTS idx_tharmate_plans_date 
    ON tharmate_plans(plan_date, plan_time);

-- User's own plans
CREATE INDEX IF NOT EXISTS idx_tharmate_plans_user 
    ON tharmate_plans(user_id);

-- Status filter
CREATE INDEX IF NOT EXISTS idx_tharmate_plans_status 
    ON tharmate_plans(status);

-- Requests by plan
CREATE INDEX IF NOT EXISTS idx_tharmate_requests_plan 
    ON tharmate_requests(plan_id);

-- Requests by requester
CREATE INDEX IF NOT EXISTS idx_tharmate_requests_requester 
    ON tharmate_requests(requester_id);

-- ─── Auto-expire function ────────────────────────────────────────

-- Set expires_at automatically when a plan is created
CREATE OR REPLACE FUNCTION set_tharmate_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Expire 1 day after the plan date
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := (NEW.plan_date + INTERVAL '1 day')::TIMESTAMPTZ;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set expiry
DROP TRIGGER IF EXISTS trg_tharmate_set_expiry ON tharmate_plans;
CREATE TRIGGER trg_tharmate_set_expiry
    BEFORE INSERT ON tharmate_plans
    FOR EACH ROW EXECUTE FUNCTION set_tharmate_expiry();

-- ─── Done ────────────────────────────────────────────────────────
