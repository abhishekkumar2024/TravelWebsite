'use server';

/**
 * Contact Queries — Database Abstraction Layer
 * 
 * Replaces lib/supabaseContact.ts
 */

import { db } from '@/lib/db';

export interface ContactMessage {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export async function submitContactForm(formData: ContactMessage): Promise<{ success: boolean; error: string | null }> {
    try {
        await db.execute(
            `INSERT INTO contact_messages (name, email, subject, message, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [formData.name, formData.email, formData.subject, formData.message]
        );

        return { success: true, error: null };
    } catch (err: any) {
        console.error('[dbContact] submitContactForm error:', err.message);
        return { success: false, error: err?.message || 'Unexpected error' };
    }
}

export async function fetchContactMessages(): Promise<any[]> {
    try {
        const result = await db.query(
            'SELECT * FROM contact_messages ORDER BY created_at DESC'
        );
        return result.rows;
    } catch (error: any) {
        console.error('[dbContact] fetchContactMessages error:', error.message);
        return [];
    }
}

export async function updateMessageStatus(id: string, status: string): Promise<{ success: boolean; error: string | null }> {
    try {
        await db.execute(
            'UPDATE contact_messages SET status = $1 WHERE id = $2::uuid',
            [status, id]
        );
        return { success: true, error: null };
    } catch (error: any) {
        console.error('[dbContact] updateMessageStatus error:', error.message);
        return { success: false, error: error.message };
    }
}
