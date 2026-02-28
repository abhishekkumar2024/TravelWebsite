-- ============================================
-- NEON DATABASE FULL SCHEMA
-- ============================================
-- This creates the complete CamelThar database schema in Neon.
-- Combines NextAuth tables + your existing business tables.
-- Run this in Neon's SQL Editor after creating your project.
-- ============================================

-- ─── NextAuth.js Tables ──────────────────────────────────────────

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    password_hash TEXT,                -- For email/password users (bcrypt hash)
    role TEXT DEFAULT 'user',          -- 'user' or 'admin'
    reset_token TEXT UNIQUE,           -- For password reset (hex token)
    reset_token_expiry TIMESTAMPTZ,    -- Expiry (usually +1 hour)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table (stores OAuth provider links)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, "providerAccountId")
);

-- Sessions table (server-side session storage)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
);

-- Verification tokens (email verification, password reset)
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ─── Business Tables (from Supabase) ────────────────────────────

-- Authors table (user profiles for blog authoring)
CREATE TABLE IF NOT EXISTS authors (
    id UUID PRIMARY KEY,               -- Same as users.id
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    slug TEXT UNIQUE,
    website TEXT,
    twitter TEXT,
    instagram TEXT,
    linkedin TEXT,
    youtube TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blogs table (all blog posts)
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES authors(id) ON DELETE SET NULL,

    -- Core content
    title_en TEXT NOT NULL,
    title_hi TEXT,
    excerpt_en TEXT,
    excerpt_hi TEXT,
    content_en TEXT NOT NULL,
    content_hi TEXT,

    -- Categorization
    destination TEXT,
    category TEXT,

    -- Media & SEO
    cover_image TEXT,
    meta_title TEXT,
    meta_description TEXT,
    focus_keyword TEXT,
    canonical_url TEXT,
    slug TEXT UNIQUE,

    -- Author info (JSONB for flexible author data)
    author JSONB,

    -- Images array
    images JSONB DEFAULT '[]'::jsonb,

    -- Status & metrics
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
    reading_time_minutes INT,
    views INT DEFAULT 0,

    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog likes
CREATE TABLE IF NOT EXISTS blog_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES authors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blog_id, user_id)
);

-- Blog comments (with threading)
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_id UUID REFERENCES blogs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES authors(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES authors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (affiliate products)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT,
    image_url TEXT,
    affiliate_link TEXT,
    destinations JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submit performance logs
CREATE TABLE IF NOT EXISTS submit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    user_email TEXT,
    blog_id TEXT,
    blog_slug TEXT,
    action TEXT NOT NULL DEFAULT 'submit',
    total_duration_ms INTEGER,
    stages JSONB DEFAULT '[]'::jsonb,
    payload_size_kb NUMERIC(10,2),
    content_word_count INTEGER,
    images_count INTEGER,
    orphaned_images_count INTEGER,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions("sessionToken");

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_destination ON blogs(destination);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);

CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_id ON blog_likes(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON blog_comments(blog_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_submit_logs_user_id ON submit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_submit_logs_created_at ON submit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- ─── Slug Generator Function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')));
END;
$$ LANGUAGE plpgsql;

-- ─── Done ────────────────────────────────────────────────────────
-- Run the data import script next to migrate data from Supabase.
