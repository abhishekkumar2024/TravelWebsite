
import { supabase } from './supabaseClient';

export interface BlogComment {
    id: string;
    blog_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at?: string;
    is_edited?: boolean;
    parent_id?: string | null;
    author?: {
        name: string;
        avatar_url?: string;
    };
    likes?: { count: number }[];
    user_liked?: { user_id: string }[]; // For checking if current user liked
    reply_count?: { count: number }[];
}

export const isUuid = (id: string) => {
    if (!id || typeof id !== 'string') return false;
    // UUIDs must be 36 characters long including 4 dashes
    if (id.length !== 36) return false;
    const match = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    return match;
};

/**
 * LIKES LOGIC (BLOG)
 */

export async function toggleLike(blogId: string, userId: string): Promise<{ liked: boolean; error: string | null }> {
    if (!isUuid(blogId)) return { liked: false, error: null };
    try {
        // Check if already liked
        const { data: existingLike, error: fetchError } = await supabase
            .from('blog_likes')
            .select('id')
            .eq('blog_id', blogId)
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingLike) {
            // Unlike
            const { error: deleteError } = await supabase
                .from('blog_likes')
                .delete()
                .eq('id', existingLike.id);

            if (deleteError) throw deleteError;
            return { liked: false, error: null };
        } else {
            // Like
            const { error: insertError } = await supabase
                .from('blog_likes')
                .insert({ blog_id: blogId, user_id: userId });

            if (insertError) throw insertError;
            return { liked: true, error: null };
        }
    } catch (err: any) {
        return { liked: false, error: err.message };
    }
}

export async function fetchLikeStatus(blogId: string, userId: string): Promise<boolean> {
    if (!userId || !isUuid(blogId)) return false;
    const { data, error } = await supabase
        .from('blog_likes')
        .select('id')
        .eq('blog_id', blogId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) return false;
    return !!data;
}

export async function fetchLikeCount(blogId: string): Promise<number> {
    if (!isUuid(blogId)) return 0;
    const { count, error } = await supabase
        .from('blog_likes')
        .select('*', { count: 'exact', head: true })
        .eq('blog_id', blogId);

    if (error) return 0;
    return count || 0;
}

/**
 * COMMENTS LOGIC
 */

export async function fetchCommentCount(blogId: string): Promise<number> {
    if (!isUuid(blogId)) return 0;
    const { count, error } = await supabase
        .from('blog_comments')
        .select('*', { count: 'exact', head: true })
        .eq('blog_id', blogId);

    if (error) return 0;
    return count || 0;
}

export async function fetchComments(blogId: string): Promise<BlogComment[]> {
    if (!isUuid(blogId)) return [];

    // We fetch likes count and if user liked (conceptually hard in one go without params)
    // Here we just fetch counts. User like status needs separate check or join logic if user_id known.
    // For simplicity, we fetch all.
    const { data, error } = await supabase
        .from('blog_comments')
        .select(`
            *,
            author:authors(name, avatar_url),
            likes:comment_likes(count)
        `)
        .eq('blog_id', blogId)
        .order('created_at', { ascending: true }); // ASC for chronological discussion

    if (error) {
        console.error("Fetch comments error:", error);
        return [];
    }

    return data as BlogComment[];
}

// Separate function to check which comments user liked (batch)
export async function fetchUserCommentLikes(commentIds: string[], userId: string): Promise<Set<string>> {
    if (!commentIds.length || !userId) return new Set();

    const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', userId);

    if (error) return new Set();
    return new Set(data.map(l => l.comment_id));
}

export async function addComment(blogId: string, userId: string, content: string, parentId: string | null = null): Promise<{ success: boolean; data?: BlogComment; error?: string }> {
    if (!isUuid(blogId)) return { success: false, error: 'Cannot comment on demo blogs' };
    try {
        const payload: any = {
            blog_id: blogId,
            user_id: userId,
            content: content
        };
        if (parentId) payload.parent_id = parentId;

        const { data, error } = await supabase
            .from('blog_comments')
            .insert(payload)
            .select('*, author:authors(name, avatar_url)')
            .single();

        if (error) throw error;

        return { success: true, data: data as BlogComment };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateComment(commentId: string, content: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('blog_comments')
        .update({
            content: content,
            is_edited: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('blog_comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; error?: string }> {
    try {
        const { data: existing, error: fetchError } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            await supabase.from('comment_likes').delete().eq('id', existing.id);
            return { liked: false };
        } else {
            await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
            return { liked: true };
        }
    } catch (err: any) {
        return { liked: false, error: err.message };
    }
}
