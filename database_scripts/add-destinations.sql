-- ============================================
-- ADD DESTINATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS destinations (
    id TEXT PRIMARY KEY,               -- Used as slug/ID (e.g., 'jaipur')
    name_en TEXT NOT NULL,
    name_hi TEXT,
    tagline_en TEXT,
    tagline_hi TEXT,
    description_en TEXT,
    description_hi TEXT,
    cover_image TEXT,
    attractions JSONB DEFAULT '[]'::jsonb,
    best_time TEXT,
    image_credits JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_destinations_id ON destinations(id);

-- DONE
