-- ============================================
-- LIKES AND COMMENTS SYSTEM
-- ============================================

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS public.blog_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.authors(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.authors(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR LIKES
CREATE POLICY "Public can view likes" ON public.blog_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can toggle likes" ON public.blog_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" ON public.blog_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- POLICIES FOR COMMENTS
CREATE POLICY "Public can view comments" ON public.blog_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post comments" ON public.blog_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.blog_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.blog_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- GUEST ACCESS (Optional: if we want to allow guests to comment, but usually it's better to keep it authenticated)
-- For now, keeping it authenticated based on common travel site patterns.

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_id ON public.blog_likes(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON public.blog_comments(blog_id);

-- Permissions
GRANT ALL ON public.blog_likes TO anon, authenticated;
GRANT ALL ON public.blog_comments TO anon, authenticated;
