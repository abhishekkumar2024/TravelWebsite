-- Collections & Pins System
-- Collections are curated groups of blogs that admins can create and manage

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    description_en TEXT,
    description_hi TEXT,
    cover_image TEXT,
    icon VARCHAR(10) DEFAULT '📌',
    gradient VARCHAR(100) DEFAULT 'from-royal-blue to-deep-maroon',
    slug VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection Pins (many-to-many junction between collections and blogs)
CREATE TABLE IF NOT EXISTS collection_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, blog_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active_order ON collections(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_collection_pins_collection ON collection_pins(collection_id, display_order);
CREATE INDEX IF NOT EXISTS idx_collection_pins_blog ON collection_pins(blog_id);
