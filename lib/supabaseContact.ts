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
