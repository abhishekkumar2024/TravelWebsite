-- ============================================
-- THARMATE v3 — Desert Rooms Phase 3 Migration
-- ============================================
-- Run this in Neon's SQL Editor after add-tharmate-v2.sql
-- ============================================

-- ─── Update tharmate_rooms for Phase 3 ──────────────────────────

-- Add new columns for the Desert Rooms feature
ALTER TABLE tharmate_rooms 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS max_members INT NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS current_members INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '3h'
        CHECK (duration IN ('1h', '3h', '6h', '24h')),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Sync is_active with existing status column
UPDATE tharmate_rooms 
    SET is_active = (status = 'active')
    WHERE is_active IS NULL;

-- Add index for active rooms by destination
CREATE INDEX IF NOT EXISTS idx_rooms_active_dest 
    ON tharmate_rooms(is_active, destination, created_at DESC)
    WHERE is_active = true;

-- Add message_type 'emoji' and 'photo' to room messages
ALTER TABLE tharmate_room_messages
    DROP CONSTRAINT IF EXISTS tharmate_room_messages_message_type_check;

ALTER TABLE tharmate_room_messages
    ADD CONSTRAINT tharmate_room_messages_message_type_check
    CHECK (message_type IN ('text', 'system', 'image', 'emoji', 'photo'));

-- ─── Done ────────────────────────────────────────────────────────
