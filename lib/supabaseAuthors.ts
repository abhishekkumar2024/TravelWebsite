import { supabase } from './supabaseClient';

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

export async function getAuthorProfile(userId: string) {
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

export async function updateAuthorProfile(userId: string, updates: { name?: string; avatar_url?: string }) {
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
        // Even if no rows returned, the update might have happened but we can't see it? 
        // Usually it means no row matched or RLS blocked it.
        return { success: false, error: 'Update failed or permission denied' };
    }

    return { success: true, data: data[0] };
}
