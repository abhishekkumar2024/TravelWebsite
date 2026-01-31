import { supabase } from './supabaseClient';

/**
 * Ensures that an author record exists for the given user.
 * This prevents Foreign Key constraint errors when creating blogs.
 */
export async function ensureAuthorExists(): Promise<string> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('User not authenticated');
    }

    // Check if author exists
    const { data: author, error: fetchError } = await supabase
        .from('authors')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (fetchError) {
        console.error('[supabaseAuthors] Error fetching author:', fetchError.message);
        throw fetchError;
    }

    // Create author if not exists
    if (!author) {
        console.log('[supabaseAuthors] Author not found, creating one for:', user.email);
        const { error: insertError } = await supabase.from('authors').insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Traveler',
            email: user.email,
        });

        if (insertError) {
            console.error('[supabaseAuthors] Error creating author:', insertError.message);
            throw insertError;
        }
    }

    return user.id;
}
