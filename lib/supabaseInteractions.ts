import { supabase } from './supabaseClient';

export interface BlogComment {
    id: string;
    blog_id: string;
    user_id: string;
    content: string;
    created_at: string;
    author?: {
        name: string;
        avatar_url?: string;
    };
}

/**
 * LIKES LOGIC
 */

export async function toggleLike(blogId: string, userId: string): Promise<{ liked: boolean; error: string | null }> {
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
        console.error('[supabaseInteractions] toggleLike error:', err.message);
        return { liked: false, error: err.message };
    }
}

export async function fetchLikeStatus(blogId: string, userId: string): Promise<boolean> {
    if (!userId) return false;
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

export async function fetchComments(blogId: string): Promise<BlogComment[]> {
    const { data, error } = await supabase
        .from('blog_comments')
        .select('*, author:authors(name, avatar_url)')
        .eq('blog_id', blogId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[supabaseInteractions] fetchComments error:', error.message);
        return [];
    }

    return data as BlogComment[];
}

export async function addComment(blogId: string, userId: string, content: string): Promise<{ success: boolean; data?: BlogComment; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('blog_comments')
            .insert({
                blog_id: blogId,
                user_id: userId,
                content: content
            })
            .select('*, author:authors(name, avatar_url)')
            .single();

        if (error) throw error;

        return { success: true, data: data as BlogComment };
    } catch (err: any) {
        console.error('[supabaseInteractions] addComment error:', err.message);
        return { success: false, error: err.message };
    }
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
