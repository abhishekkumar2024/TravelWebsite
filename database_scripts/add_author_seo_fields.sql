-- Add SEO fields to authors table
ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS youtube text;

-- Create an index on the slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_authors_slug ON public.authors(slug);

-- Note: RLS Policies for the 'authors' table are managed via the Supabase Dashboard.
-- Ensure you have policies enabling SELECT for everyone (for profiles)
-- and UPDATE/INSERT for authenticated users on their own rows.
