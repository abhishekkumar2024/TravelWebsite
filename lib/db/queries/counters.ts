'use server';

/**
 * Blog Counter Queries — Atomic increment for views, shares, etc.
 * 
 * Uses the PostgreSQL `increment_blog_counter` function for
 * concurrency-safe atomic increments. No race conditions.
 */

import { db } from '@/lib/db';

/**
 * Increment a counter column on a blog post.
 * Uses db.execute() to route to MASTER (write-capable DB).
 * 
 * @param blogId - UUID of the blog post
 * @param column - Column to increment ('views', 'shares', etc.)
 */
export async function incrementBlogCounter(blogId: string, column: 'views' | 'shares'): Promise<boolean> {
    try {
        // Validate UUID format to prevent SQL injection via blogId
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(blogId);
        if (!isUuid) {
            console.warn('[counters] Invalid blog ID:', blogId);
            return false;
        }

        // Use the PostgreSQL function for atomic increment
        await db.execute(
            `SELECT increment_blog_counter($1::uuid, $2)`,
            [blogId, column]
        );

        return true;
    } catch (error: any) {
        // Fallback: direct atomic UPDATE if the function doesn't exist yet
        try {
            await db.execute(
                `UPDATE blogs SET ${column} = COALESCE(${column}, 0) + 1 WHERE id = $1::uuid`,
                [blogId]
            );
            return true;
        } catch (fallbackError: any) {
            console.error('[counters] incrementBlogCounter error:', fallbackError.message);
            return false;
        }
    }
}
