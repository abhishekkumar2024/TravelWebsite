'use server';

/**
 * Interactions Queries (Likes + Comments) — Database Abstraction Layer
 * 
 * Replaces lib/supabaseInteractions.ts
 * Uses db.query() / db.execute() instead of supabase.from()
 */

import { db } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────

export interface BlogComment {
    id: string;
    blog_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at?: string;
    is_edited?: boolean;
    parent_id?: string | null;
    author_name?: string;
    author_avatar_url?: string;
    like_count?: number;
    reply_count?: number;
    // Runtime shape added by fetchComments transform
    author?: { name: string; avatar_url?: string };
    likes?: { count: number }[];
    children?: BlogComment[];
}

export const isUuid = (id: string) => {
    if (!id || typeof id !== 'string') return false;
    if (id.length !== 36) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// ─── Blog Likes ──────────────────────────────────────────────────

export async function toggleLike(blogId: string, userId: string): Promise<{ liked: boolean; error: string | null }> {
    if (!isUuid(blogId)) return { liked: false, error: null };

    try {
        // Check if already liked
        const existing = await db.queryOne<{ id: string }>(
            'SELECT id FROM blog_likes WHERE blog_id = $1::uuid AND user_id = $2::uuid',
            [blogId, userId]
        );

        if (existing) {
            // Unlike
            await db.execute('DELETE FROM blog_likes WHERE id = $1::uuid', [existing.id]);
            return { liked: false, error: null };
        } else {
            // Like
            await db.execute(
                'INSERT INTO blog_likes (blog_id, user_id) VALUES ($1::uuid, $2::uuid)',
                [blogId, userId]
            );
            return { liked: true, error: null };
        }
    } catch (err: any) {
        return { liked: false, error: err.message };
    }
}

export async function fetchLikeStatus(blogId: string, userId: string): Promise<boolean> {
    if (!userId || !isUuid(blogId)) return false;
    try {
        const result = await db.queryOne(
            'SELECT id FROM blog_likes WHERE blog_id = $1::uuid AND user_id = $2::uuid',
            [blogId, userId]
        );
        return !!result;
    } catch {
        return false;
    }
}

export async function fetchLikeCount(blogId: string): Promise<number> {
    if (!isUuid(blogId)) return 0;
    try {
        const result = await db.queryOne<{ count: string }>(
            'SELECT COUNT(*) as count FROM blog_likes WHERE blog_id = $1::uuid',
            [blogId]
        );
        return parseInt(result?.count || '0', 10);
    } catch {
        return 0;
    }
}

// ─── Blog Comments ───────────────────────────────────────────────

export async function fetchCommentCount(blogId: string): Promise<number> {
    if (!isUuid(blogId)) return 0;
    try {
        const result = await db.queryOne<{ count: string }>(
            'SELECT COUNT(*) as count FROM blog_comments WHERE blog_id = $1::uuid',
            [blogId]
        );
        return parseInt(result?.count || '0', 10);
    } catch {
        return 0;
    }
}

export async function fetchComments(blogId: string): Promise<BlogComment[]> {
    if (!isUuid(blogId)) return [];

    try {
        const result = await db.query<BlogComment>(
            `SELECT
                c.*,
                a.name AS author_name,
                a.avatar_url AS author_avatar_url,
                COALESCE(lc.like_count, 0)::int AS like_count,
                COALESCE(rc.reply_count, 0)::int AS reply_count
             FROM blog_comments c
             LEFT JOIN authors a ON c.user_id = a.id
             LEFT JOIN LATERAL (
                SELECT COUNT(*) AS like_count FROM comment_likes WHERE comment_id = c.id
             ) lc ON true
             LEFT JOIN LATERAL (
                SELECT COUNT(*) AS reply_count FROM blog_comments WHERE parent_id = c.id
             ) rc ON true
             WHERE c.blog_id = $1::uuid
             ORDER BY c.created_at ASC`,
            [blogId]
        );

        // Transform to match the old shape expected by components
        return result.rows.map(row => ({
            ...row,
            author: row.author_name ? {
                name: row.author_name,
                avatar_url: row.author_avatar_url,
            } : undefined,
            likes: [{ count: row.like_count || 0 }],
            reply_count: [{ count: row.reply_count || 0 }],
        })) as any;
    } catch (error: any) {
        console.error('[dbInteractions] fetchComments error:', error.message);
        return [];
    }
}

export async function fetchUserCommentLikes(commentIds: string[], userId: string): Promise<Set<string>> {
    if (!commentIds.length || !userId) return new Set();

    try {
        // Build parameterized IN clause
        const placeholders = commentIds.map((_, i) => `$${i + 2}::uuid`).join(', ');
        const result = await db.query<{ comment_id: string }>(
            `SELECT comment_id FROM comment_likes WHERE user_id = $1::uuid AND comment_id IN (${placeholders})`,
            [userId, ...commentIds]
        );

        return new Set(result.rows.map(r => r.comment_id));
    } catch {
        return new Set();
    }
}

export async function addComment(
    blogId: string,
    userId: string,
    content: string,
    parentId: string | null = null
): Promise<{ success: boolean; data?: BlogComment; error?: string }> {
    if (!isUuid(blogId)) return { success: false, error: 'Cannot comment on demo blogs' };

    try {
        const result = await db.executeOne<any>(
            `INSERT INTO blog_comments (blog_id, user_id, content, parent_id, created_at, updated_at)
             VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())
             RETURNING *`,
            [blogId, userId, content, parentId]
        );

        if (!result) {
            return { success: false, error: 'Failed to add comment' };
        }

        // Fetch author info for the response
        const author = await db.queryOne<{ name: string; avatar_url: string }>(
            'SELECT name, avatar_url FROM authors WHERE id = $1::uuid',
            [userId]
        );

        const comment: BlogComment = {
            ...result,
            author: author || undefined,
        };

        return { success: true, data: comment };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateComment(commentId: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db.execute(
            `UPDATE blog_comments SET content = $1, is_edited = true, updated_at = NOW() WHERE id = $2::uuid`,
            [content, commentId]
        );
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db.execute('DELETE FROM blog_comments WHERE id = $1::uuid', [commentId]);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; error?: string }> {
    try {
        const existing = await db.queryOne<{ id: string }>(
            'SELECT id FROM comment_likes WHERE comment_id = $1::uuid AND user_id = $2::uuid',
            [commentId, userId]
        );

        if (existing) {
            await db.execute('DELETE FROM comment_likes WHERE id = $1::uuid', [existing.id]);
            return { liked: false };
        } else {
            await db.execute(
                'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1::uuid, $2::uuid)',
                [commentId, userId]
            );
            return { liked: true };
        }
    } catch (err: any) {
        return { liked: false, error: err.message };
    }
}
