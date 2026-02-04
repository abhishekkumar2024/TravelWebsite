
-- Update blog_comments for Replies and Edits
ALTER TABLE public.blog_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE;
ALTER TABLE public.blog_comments ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.authors(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS for comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes
CREATE POLICY "Public can view comment likes" ON public.comment_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" ON public.comment_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
