import { supabase } from './supabaseClient';

export async function ensureAuthorExists(): Promise<string> {
    // ✅ Get ACTIVE session
    const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError || !session?.user) {
        throw new Error('User not authenticated or session not ready');
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
        console.log('[supabaseAuthors] creating author for:', user.email);

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
            throw insertError;
        }
    }

    return user.id;
}
