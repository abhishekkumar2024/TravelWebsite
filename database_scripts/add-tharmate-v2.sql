-- ============================================
-- THARMATE v2 — Sparks + Pulse + Rooms
-- ============================================
-- Run this in Neon's SQL Editor after add-tharmate.sql
-- ============================================

-- ─── Spark Requests (Companion Matching) ────────────────────────

CREATE TABLE IF NOT EXISTS tharmate_sparks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES tharmate_plans(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    UNIQUE (plan_id, sender_id)  -- Prevent duplicate sparks per plan
);

CREATE INDEX IF NOT EXISTS idx_sparks_receiver ON tharmate_sparks(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_sparks_sender ON tharmate_sparks(sender_id);

-- ─── Place Pulse Feed ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tharmate_pulse (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    message TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'tip'
        CHECK (tag IN ('tip', 'photo', 'question', 'alert', 'joinme')),
    photo_url TEXT,
    helpful_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_dest_time ON tharmate_pulse(destination, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_user ON tharmate_pulse(user_id);

-- ─── Desert Rooms ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tharmate_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES users(id),
    room_type TEXT NOT NULL DEFAULT 'desert_room'
        CHECK (room_type IN ('quick_connect', 'desert_room', 'caravan')),
    destination TEXT NOT NULL,
    plan_id UUID REFERENCES tharmate_plans(id) ON DELETE SET NULL,
    spark_id UUID REFERENCES tharmate_sparks(id) ON DELETE SET NULL,
    title TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_users ON tharmate_rooms(creator_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON tharmate_rooms(status, expires_at);

-- ─── Room Messages ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tharmate_room_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES tharmate_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'system', 'image')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_msgs ON tharmate_room_messages(room_id, created_at);

-- ─── Done ────────────────────────────────────────────────────────
