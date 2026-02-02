-- Add slug column to blogs table
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')));
END;
$$ LANGUAGE plpgsql;

-- Update existing blogs with initial slugs based on ID if title is null/junk
-- Or based on title if available
UPDATE blogs 
SET slug = generate_slug(title_en)
WHERE slug IS NULL AND title_en IS NOT NULL AND title_en != '';

-- If title_en results in empty slug (only special chars), use ID
UPDATE blogs
SET slug = id::text
WHERE slug IS NULL OR slug = '' OR slug = '-';
