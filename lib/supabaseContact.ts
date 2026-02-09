import { supabase } from './supabaseClient';

export interface ContactMessage {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export async function submitContactForm(formData: ContactMessage): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('contact_messages')
            .insert({
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                created_at: new Date().toISOString(),
            });

        if (error) {
            console.error('[supabaseContact] submitContactForm error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        console.error('[supabaseContact] submitContactForm unexpected error:', err);
        return { success: false, error: err?.message || 'Unexpected error' };
    }
}

export async function fetchContactMessages(): Promise<any[]> {
    const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[supabaseContact] fetchContactMessages error:', error.message);
        return [];
    }

    return data || [];
}

export async function updateMessageStatus(id: string, status: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase
        .from('contact_messages')
        .update({ status })
        .eq('id', id);

    if (error) {
        console.error('[supabaseContact] updateMessageStatus error:', error.message);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}
