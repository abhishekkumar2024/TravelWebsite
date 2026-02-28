/**
 * Batch Queries — Database Abstraction Layer
 * 
 * Replaces lib/supabaseBatch.ts
 * Uses PostgreSQL GROUP BY for efficient aggregation (much better than
 * the old approach of fetching all rows and counting in JS).
 */

import { db } from '@/lib/db';
import { isUuid } from './interactions';

/**
 * Batch fetch like counts for multiple blog IDs.
 * Uses GROUP BY instead of fetching individual rows — much more efficient.
 */
export async function batchFetchLikeCounts(blogIds: string[]): Promise<Map<string, number>> {
    const validIds = blogIds.filter(isUuid);
    const result = new Map<string, number>();

    if (validIds.length === 0) return result;

    // Initialize all IDs with 0
    validIds.forEach(id => result.set(id, 0));

    try {
        const placeholders = validIds.map((_, i) => `$${i + 1}::uuid`).join(', ');
        const data = await db.query<{ blog_id: string; count: string }>(
            `SELECT blog_id, COUNT(*)::text AS count
             FROM blog_likes
             WHERE blog_id IN (${placeholders})
             GROUP BY blog_id`,
            validIds
        );

        data.rows.forEach(row => {
            result.set(row.blog_id, parseInt(row.count, 10));
        });
    } catch (err) {
        console.error('[dbBatch] batchFetchLikeCounts error:', err);
    }

    return result;
}

/**
 * Batch fetch comment counts for multiple blog IDs.
 */
export async function batchFetchCommentCounts(blogIds: string[]): Promise<Map<string, number>> {
    const validIds = blogIds.filter(isUuid);
    const result = new Map<string, number>();

    if (validIds.length === 0) return result;

    validIds.forEach(id => result.set(id, 0));

    try {
        const placeholders = validIds.map((_, i) => `$${i + 1}::uuid`).join(', ');
        const data = await db.query<{ blog_id: string; count: string }>(
            `SELECT blog_id, COUNT(*)::text AS count
             FROM blog_comments
             WHERE blog_id IN (${placeholders})
             GROUP BY blog_id`,
            validIds
        );

        data.rows.forEach(row => {
            result.set(row.blog_id, parseInt(row.count, 10));
        });
    } catch (err) {
        console.error('[dbBatch] batchFetchCommentCounts error:', err);
    }

    return result;
}

/**
 * Batch fetch like status for a user across multiple blog IDs.
 */
export async function batchFetchLikeStatuses(blogIds: string[], userId: string): Promise<Set<string>> {
    const validIds = blogIds.filter(isUuid);
    const result = new Set<string>();

    if (validIds.length === 0 || !userId) return result;

    try {
        const placeholders = validIds.map((_, i) => `$${i + 2}::uuid`).join(', ');
        const data = await db.query<{ blog_id: string }>(
            `SELECT blog_id FROM blog_likes
             WHERE user_id = $1::uuid AND blog_id IN (${placeholders})`,
            [userId, ...validIds]
        );

        data.rows.forEach(row => result.add(row.blog_id));
    } catch (err) {
        console.error('[dbBatch] batchFetchLikeStatuses error:', err);
    }

    return result;
}
