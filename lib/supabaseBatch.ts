import { supabase } from './supabaseClient';
import { isUuid } from './supabaseInteractions';

/**
 * Batch fetch like counts for multiple blog IDs in a single query.
 * Returns a Map of blogId -> count.
 */
export async function batchFetchLikeCounts(blogIds: string[]): Promise<Map<string, number>> {
    const validIds = blogIds.filter(isUuid);
    const result = new Map<string, number>();

    if (validIds.length === 0) return result;

    // Initialize all valid IDs with 0
    validIds.forEach(id => result.set(id, 0));

    try {
        const { data, error } = await supabase
            .from('blog_likes')
            .select('blog_id')
            .in('blog_id', validIds);

        if (error) {
            console.error('Batch fetch like counts error:', error);
            return result;
        }

        // Count occurrences manually (since Supabase doesn't easily group + count in one go)
        if (data) {
            data.forEach((row: { blog_id: string }) => {
                const current = result.get(row.blog_id) || 0;
                result.set(row.blog_id, current + 1);
            });
        }
    } catch (err) {
        console.error('Batch fetch like counts exception:', err);
    }

    return result;
}

/**
 * Batch fetch comment counts for multiple blog IDs in a single query.
 * Returns a Map of blogId -> count.
 */
export async function batchFetchCommentCounts(blogIds: string[]): Promise<Map<string, number>> {
    const validIds = blogIds.filter(isUuid);
    const result = new Map<string, number>();

    if (validIds.length === 0) return result;

    // Initialize all valid IDs with 0
    validIds.forEach(id => result.set(id, 0));

    try {
        const { data, error } = await supabase
            .from('blog_comments')
            .select('blog_id')
            .in('blog_id', validIds);

        if (error) {
            console.error('Batch fetch comment counts error:', error);
            return result;
        }

        if (data) {
            data.forEach((row: { blog_id: string }) => {
                const current = result.get(row.blog_id) || 0;
                result.set(row.blog_id, current + 1);
            });
        }
    } catch (err) {
        console.error('Batch fetch comment counts exception:', err);
    }

    return result;
}

/**
 * Batch fetch like status for a user across multiple blog IDs.
 * Returns a Set of blogIds that the user has liked.
 */
export async function batchFetchLikeStatuses(blogIds: string[], userId: string): Promise<Set<string>> {
    const validIds = blogIds.filter(isUuid);
    const result = new Set<string>();

    if (validIds.length === 0 || !userId) return result;

    try {
        const { data, error } = await supabase
            .from('blog_likes')
            .select('blog_id')
            .in('blog_id', validIds)
            .eq('user_id', userId);

        if (error) {
            console.error('Batch fetch like statuses error:', error);
            return result;
        }

        if (data) {
            data.forEach((row: { blog_id: string }) => result.add(row.blog_id));
        }
    } catch (err) {
        console.error('Batch fetch like statuses exception:', err);
    }

    return result;
}
