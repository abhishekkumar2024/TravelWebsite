import { supabase } from './supabaseClient';

export interface Author {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    slug?: string; // used for /author/[slug] URL
    bio?: string;
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
}

export async function ensureAuthorExists(): Promise<string> {
    // ✅ Get ACTIVE session
    const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError || !session?.user) {
        // Log but don't strictly throw if we might be in a race condition
        console.warn('[supabaseAuthors] No session found, attempting to get user directly');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
            throw new Error('User not authenticated or session not ready');
        }
        return currentUser.id; // Just return ID if we can't ensure row exists yet
    }

    const user = session.user;

    // ✅ Check author
    const { data: author, error: fetchError } = await supabase
        .from('authors')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (fetchError) {
        console.error('[supabaseAuthors] fetch error:', fetchError.message);
        throw fetchError;
    }

    // ✅ Create author if missing
    if (!author) {
        console.log('[supabaseAuthors] author row missing in DB, attempting to create for:', user.id);

        const { error: insertError } = await supabase
            .from('authors')
            .insert({
                id: user.id,
                name: user.user_metadata?.name
                    || user.email?.split('@')[0]
                    || 'Traveler',
                email: user.email,
                // Default slug (handle potential dupes in UI logic later or leave null for now)
                slug: user.user_metadata?.preferred_username || null
            });

        if (insertError) {
            console.error('[supabaseAuthors] insert error:', insertError.message);
            // If it's a conflict, someone else might have just inserted it, so we can ignore it
            if (!insertError.message.includes('unique_violation') && !insertError.message.includes('already exists')) {
                throw insertError;
            }
        } else {
            console.log('[supabaseAuthors] author row created successfully');
            // Small delay to allow replica/DB sync if needed (though usually immediate)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } else {
        console.log('[supabaseAuthors] author row already exists for:', user.id);
    }

    return user.id;
}

export async function getAuthorProfile(userId: string): Promise<Author | null> {
    const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('[supabaseAuthors] getAuthorProfile error:', error.message);
        return null;
    }
    return data;
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
    const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        // Not specifically logging not found as error since it might be valid lookup check
        return null;
    }
    return data;
}

export async function updateAuthorProfile(userId: string, updates: Partial<Author>) {
    // Basic validation for slug to avoid spaces/invalid chars if provided
    if (updates.slug) {
        updates.slug = updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    const { data, error } = await supabase
        .from('authors')
        .update(updates)
        .eq('id', userId)
        .select();

    if (error) {
        console.error('[supabaseAuthors] updateAuthorProfile error:', error.message);
        return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
        console.error('[supabaseAuthors] updateAuthorProfile: No rows updated. Check RLS policies.');
        return { success: false, error: 'Update failed or permission denied' };
    }

    return { success: true, data: data[0] };
}
