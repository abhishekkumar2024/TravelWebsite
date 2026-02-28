'use server';

/**
 * Blog Queries — Database Abstraction Layer
 * 
 * Replaces lib/supabaseBlogs.ts
 * Uses db.query() / db.execute() instead of supabase.from()
 * 
 * All Supabase-specific syntax (`.eq()`, `.select()`, `.ilike()`) is replaced
 * with standard PostgreSQL SQL.
 */

import { db } from '@/lib/db';
import { BlogPost } from '@/lib/data';
import { submitToIndexNow } from '@/lib/indexnow';

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Generate a URL-friendly slug from a title
 */
export async function generateSlug(title: string): Promise<string> {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Normalize a database row (with joined author) into the BlogPost shape.
 * The SQL queries use LEFT JOIN so author fields are flat (prefixed or aliased).
 */
function mapRowToBlog(row: any): BlogPost {
    return {
        id: row.id,
        title_en: row.title_en,
        title_hi: row.title_hi ?? row.title_en,
        excerpt_en: row.excerpt_en ?? '',
        excerpt_hi: row.excerpt_hi ?? row.excerpt_en ?? '',
        content_en: row.content_en ?? '',
        content_hi: row.content_hi ?? row.content_en ?? '',
        destination: row.destination ?? 'rajasthan',
        category: row.category ?? 'Travel',
        coverImage: row.cover_image || '/images/jaipur-hawa-mahal.webp',
        images: row.images ?? [],
        author: row.author_name ? {
            id: row.author_id,
            name: row.author_name || 'Traveler',
            avatar: row.author_avatar_url,
            email: row.author_email,
            bio: row.author_bio,
            slug: row.author_slug,
            website: row.author_website,
            twitter: row.author_twitter,
            instagram: row.author_instagram,
            linkedin: row.author_linkedin,
            youtube: row.author_youtube,
        } : (row.author ?? { name: 'Traveler' }),
        readTime: row.read_time ?? '5 min',
        publishedAt: row.published_at
            ? new Date(row.published_at).toISOString()
            : new Date(row.created_at ?? Date.now()).toISOString(),
        status: (row.status ?? 'published') as 'pending' | 'approved' | 'rejected',
        views: row.views ?? 0,
        meta_title: row.meta_title ?? row.title_en,
        meta_description: row.meta_description ?? row.excerpt_en ?? '',
        canonical_url: row.canonical_url,
        slug: row.slug,
    };
}

/** Standard SELECT with author JOIN */
const BLOG_SELECT_WITH_AUTHOR = `
    b.*,
    a.name AS author_name,
    a.avatar_url AS author_avatar_url,
    a.email AS author_email,
    a.bio AS author_bio,
    a.slug AS author_slug,
    a.website AS author_website,
    a.twitter AS author_twitter,
    a.instagram AS author_instagram,
    a.linkedin AS author_linkedin,
    a.youtube AS author_youtube
`;

const FROM_BLOGS_WITH_AUTHOR = `
    FROM blogs b
    LEFT JOIN authors a ON b.author_id = a.id
`;

// ─── Read Queries ────────────────────────────────────────────────

export async function fetchPublishedBlogs(limit = 50): Promise<BlogPost[]> {
    try {
        const result = await db.query(
            `SELECT ${BLOG_SELECT_WITH_AUTHOR}
             ${FROM_BLOGS_WITH_AUTHOR}
             WHERE b.status = 'published'
             ORDER BY b.created_at DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows.map(mapRowToBlog);
    } catch (error: any) {
        console.error('[dbBlogs] fetchPublishedBlogs error:', error.message);
        return [];
    }
}

export async function fetchBlogById(id: string): Promise<BlogPost | null> {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let result;
        if (isUuid) {
            // Search by both UUID and slug
            result = await db.query(
                `SELECT ${BLOG_SELECT_WITH_AUTHOR}
                 ${FROM_BLOGS_WITH_AUTHOR}
                 WHERE b.id = $1::uuid OR b.slug = $1
                 LIMIT 1`,
                [id]
            );
        } else {
            // Search by slug only
            result = await db.query(
                `SELECT ${BLOG_SELECT_WITH_AUTHOR}
                 ${FROM_BLOGS_WITH_AUTHOR}
                 WHERE b.slug = $1
                 LIMIT 1`,
                [id]
            );
        }

        if (result.rows.length === 0) return null;
        return mapRowToBlog(result.rows[0]);
    } catch (error: any) {
        console.error('[dbBlogs] fetchBlogById error:', error.message);
        return null;
    }
}

export async function fetchBlogsByAuthorSlug(slug: string): Promise<BlogPost[]> {
    try {
        const result = await db.query(
            `SELECT ${BLOG_SELECT_WITH_AUTHOR}
             ${FROM_BLOGS_WITH_AUTHOR}
             WHERE a.slug = $1 AND b.status = 'published'
             ORDER BY b.created_at DESC`,
            [slug]
        );
        return result.rows.map(mapRowToBlog);
    } catch (error: any) {
        console.error('[dbBlogs] fetchBlogsByAuthorSlug error:', error.message);
        return [];
    }
}

export async function fetchBlogsByDestination(destinationSlug: string): Promise<BlogPost[]> {
    try {
        const result = await db.query(
            `SELECT ${BLOG_SELECT_WITH_AUTHOR}
             ${FROM_BLOGS_WITH_AUTHOR}
             WHERE b.status = 'published'
               AND b.destination ILIKE $1
             ORDER BY b.created_at DESC`,
            [`%${destinationSlug}%`]
        );
        return result.rows.map(mapRowToBlog);
    } catch (error: any) {
        console.error('[dbBlogs] fetchBlogsByDestination error:', error.message);
        return [];
    }
}

export async function fetchRelatedBlogs(destination: string, currentId: string): Promise<any[]> {
    if (!destination) return [];

    const destinations = destination.split(',').map(d => d.trim()).filter(Boolean);
    if (destinations.length === 0) return [];

    try {
        // Build dynamic ILIKE conditions for each destination
        const conditions = destinations.map((_, i) => `b.destination ILIKE $${i + 3}`);
        const orClause = conditions.join(' OR ');
        const params = [currentId, 20, ...destinations.map(d => `%${d}%`)];

        const result = await db.query(
            `SELECT b.slug, b.title_en, b.title_hi, b.cover_image, b.created_at, b.destination
             FROM blogs b
             WHERE b.status = 'published'
               AND b.id != $1::uuid
               AND (${orClause})
             ORDER BY b.created_at DESC
             LIMIT $2`,
            params
        );

        if (!result.rows.length) return [];

        // Score by relevance (number of matching destinations)
        const sourceDests = new Set(destinations.map(d => d.toLowerCase()));
        const scored = result.rows.map(blog => {
            let score = 0;
            if (blog.destination) {
                blog.destination.split(',').forEach((d: string) => {
                    if (sourceDests.has(d.trim().toLowerCase())) score++;
                });
            }
            return { ...blog, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 3);
    } catch (error: any) {
        console.error('[dbBlogs] fetchRelatedBlogs error:', error.message);
        return [];
    }
}

export async function fetchBlogCountsByDestination(): Promise<Record<string, number>> {
    try {
        const result = await db.query(
            `SELECT destination FROM blogs WHERE status = 'published'`
        );

        const counts: Record<string, number> = {};
        result.rows.forEach((blog) => {
            if (!blog.destination) return;
            blog.destination.split(',').forEach((d: string) => {
                const dest = d.trim().toLowerCase();
                if (dest) counts[dest] = (counts[dest] || 0) + 1;
            });
        });

        return counts;
    } catch (error: any) {
        console.error('[dbBlogs] fetchBlogCountsByDestination error:', error.message);
        return {};
    }
}

export async function fetchAvailableDestinations(): Promise<string[]> {
    try {
        const result = await db.query(
            `SELECT destination FROM blogs WHERE status = 'published'`
        );

        const destinationSet = new Set<string>();
        result.rows.forEach(blog => {
            if (!blog.destination) return;
            blog.destination.split(',').forEach((p: string) => {
                const cleanDest = p.trim().toLowerCase();
                if (cleanDest && cleanDest !== 'rajasthan') {
                    destinationSet.add(cleanDest);
                }
            });
        });

        return Array.from(destinationSet).sort();
    } catch (error: any) {
        console.error('[dbBlogs] fetchAvailableDestinations error:', error.message);
        return [];
    }
}

// ─── Write Queries ───────────────────────────────────────────────

export async function createBlog(payload: {
    author: { name: string; email: string };
    destination: string;
    category: string;
    title_en: string;
    title_hi?: string;
    excerpt_en: string;
    excerpt_hi?: string;
    content_en: string;
    content_hi?: string;
    coverImage: string;
    images: string[];
    status?: 'draft' | 'pending' | 'published';
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    slug?: string;
    authorId?: string;
}): Promise<{ id: string | null; slug: string | null; error: string | null }> {
    try {
        const authorId = payload.authorId;
        if (!authorId) {
            return { id: null, slug: null, error: 'User not logged in. Please login and try again.' };
        }

        const blogStatus = payload.status || 'pending';
        const blogSlug = payload.slug || await generateSlug(payload.title_en);

        const result = await db.executeOne<{ id: string; slug: string }>(
            `INSERT INTO blogs (
                slug, title_en, title_hi, excerpt_en, excerpt_hi,
                content_en, content_hi, destination, category,
                cover_image, author, images, author_id, status,
                created_at, published_at, meta_title, meta_description, canonical_url
             ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13, $14,
                NOW(), $15, $16, $17, $18
             ) RETURNING id, slug`,
            [
                blogSlug,
                payload.title_en,
                payload.title_hi ?? payload.title_en,
                payload.excerpt_en,
                payload.excerpt_hi ?? payload.excerpt_en,
                payload.content_en,
                payload.content_hi ?? payload.content_en,
                payload.destination,
                payload.category,
                payload.coverImage,
                JSON.stringify(payload.author),
                JSON.stringify(payload.images),
                authorId,
                blogStatus,
                blogStatus === 'published' ? new Date().toISOString() : null,
                payload.meta_title || payload.title_en,
                payload.meta_description || payload.excerpt_en,
                payload.canonical_url || `https://www.camelthar.com/blogs/${blogSlug}/`,
            ]
        );

        if (!result) {
            return { id: null, slug: null, error: 'No data returned from database' };
        }

        return { id: result.id, slug: result.slug, error: null };
    } catch (err: any) {
        console.error('[dbBlogs] createBlog error:', err);
        return { id: null, slug: null, error: err?.message || 'Unexpected error occurred' };
    }
}

export async function updateBlog(id: string, payload: {
    destination?: string;
    category?: string;
    title_en?: string;
    title_hi?: string;
    excerpt_en?: string;
    excerpt_hi?: string;
    content_en?: string;
    content_hi?: string;
    coverImage?: string;
    images?: string[];
    status?: 'draft' | 'pending' | 'published';
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    slug?: string;
}): Promise<{ success: boolean; slug: string | null; error: string | null }> {
    try {
        // Build dynamic SET clause — only update provided fields
        const setClauses: string[] = ['updated_at = NOW()'];
        const params: any[] = [];
        let paramIndex = 1;

        const fieldMap: Record<string, string> = {
            title_en: 'title_en', title_hi: 'title_hi',
            excerpt_en: 'excerpt_en', excerpt_hi: 'excerpt_hi',
            content_en: 'content_en', content_hi: 'content_hi',
            destination: 'destination', category: 'category',
            coverImage: 'cover_image', status: 'status',
            meta_title: 'meta_title', meta_description: 'meta_description',
            canonical_url: 'canonical_url',
        };

        for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
            if ((payload as any)[jsKey] !== undefined) {
                setClauses.push(`${dbCol} = $${paramIndex}`);
                params.push((payload as any)[jsKey]);
                paramIndex++;
            }
        }

        // Handle images (JSON array)
        if (payload.images !== undefined) {
            setClauses.push(`images = $${paramIndex}::jsonb`);
            params.push(JSON.stringify(payload.images));
            paramIndex++;
        }

        // Handle slug
        const newSlug = payload.slug || (payload.title_en ? await generateSlug(payload.title_en) : undefined);
        if (newSlug) {
            setClauses.push(`slug = $${paramIndex}`);
            params.push(newSlug);
            paramIndex++;
        }

        // Add the WHERE id param
        params.push(id);

        const result = await db.executeOne<{ slug: string; status: string }>(
            `UPDATE blogs SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING slug, status`,
            params
        );

        if (!result) {
            return { success: false, slug: null, error: 'Blog not found or update failed' };
        }

        // Fire-and-forget IndexNow
        if (result.status === 'published' && result.slug) {
            submitToIndexNow([`https://www.camelthar.com/blogs/${result.slug}/`]).catch(() => { });
        }

        return { success: true, slug: result.slug, error: null };
    } catch (err: any) {
        console.error('[dbBlogs] updateBlog error:', err);
        return { success: false, slug: null, error: err?.message || 'Unexpected error' };
    }
}

// ─── Admin Queries ───────────────────────────────────────────────

export async function fetchPendingBlogs(): Promise<BlogPost[]> {
    try {
        const result = await db.query(
            `SELECT ${BLOG_SELECT_WITH_AUTHOR}
             ${FROM_BLOGS_WITH_AUTHOR}
             WHERE b.status = 'pending'
             ORDER BY b.created_at DESC`
        );
        return result.rows.map(mapRowToBlog);
    } catch (error: any) {
        console.error('[dbBlogs] fetchPendingBlogs error:', error.message);
        return [];
    }
}

export async function fetchUserBlogs(userId: string): Promise<BlogPost[]> {
    try {
        const result = await db.query(
            `SELECT ${BLOG_SELECT_WITH_AUTHOR}
             ${FROM_BLOGS_WITH_AUTHOR}
             WHERE b.author_id = $1::uuid
             ORDER BY b.created_at DESC`,
            [userId]
        );
        return result.rows.map(mapRowToBlog);
    } catch (error: any) {
        console.error('[dbBlogs] fetchUserBlogs error:', error.message);
        return [];
    }
}

export async function approveBlog(blogId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const result = await db.executeOne<{ id: string; slug: string }>(
            `UPDATE blogs SET status = 'published', published_at = NOW(), updated_at = NOW()
             WHERE id = $1::uuid RETURNING id, slug`,
            [blogId]
        );

        if (!result) {
            return { success: false, error: 'Blog not found' };
        }

        if (result.slug) {
            submitToIndexNow([`https://www.camelthar.com/blogs/${result.slug}/`], true);
        }

        return { success: true, error: null };
    } catch (error: any) {
        console.error('[dbBlogs] approveBlog error:', error.message);
        return { success: false, error: error.message };
    }
}

export async function rejectBlog(blogId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const result = await db.executeOne<{ id: string }>(
            `UPDATE blogs SET status = 'rejected', updated_at = NOW()
             WHERE id = $1::uuid RETURNING id`,
            [blogId]
        );

        if (!result) return { success: false, error: 'Blog not found' };
        return { success: true, error: null };
    } catch (error: any) {
        console.error('[dbBlogs] rejectBlog error:', error.message);
        return { success: false, error: error.message };
    }
}

export async function deleteBlog(blogId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        await db.execute('DELETE FROM blogs WHERE id = $1::uuid', [blogId]);
        return { success: true, error: null };
    } catch (error: any) {
        console.error('[dbBlogs] deleteBlog error:', error.message);
        return { success: false, error: error.message };
    }
}
