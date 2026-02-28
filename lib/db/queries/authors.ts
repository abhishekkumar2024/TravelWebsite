/**
 * Author Queries — Database Abstraction Layer
 * 
 * Replaces lib/supabaseAuthors.ts
 * Uses db.query() / db.execute() instead of supabase.from()
 */

import { db } from '@/lib/db';

export interface Author {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    slug?: string;
    bio?: string;
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
}

/**
 * Ensure an author row exists for the given user.
 * Now takes explicit user data instead of reading from Supabase auth internally.
 */
export async function ensureAuthorExists(
    userId: string,
    name: string,
    email: string,
    avatarUrl?: string
): Promise<string> {
    try {
        // Check if author exists
        const existing = await db.queryOne<{ id: string }>(
            'SELECT id FROM authors WHERE id = $1::uuid',
            [userId]
        );

        if (!existing) {
            await db.execute(
                `INSERT INTO authors (id, name, email, avatar_url, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (id) DO NOTHING`,
                [userId, name || email?.split('@')[0] || 'Traveler', email, avatarUrl || null]
            );
        }

        return userId;
    } catch (error: any) {
        console.error('[dbAuthors] ensureAuthorExists error:', error.message);
        return userId; // Return ID even on error — author may already exist
    }
}

export async function getAuthorProfile(userId: string): Promise<Author | null> {
    try {
        return await db.queryOne<Author>(
            'SELECT * FROM authors WHERE id = $1::uuid',
            [userId]
        );
    } catch (error: any) {
        console.error('[dbAuthors] getAuthorProfile error:', error.message);
        return null;
    }
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
    try {
        return await db.queryOne<Author>(
            'SELECT * FROM authors WHERE slug = $1',
            [slug]
        );
    } catch {
        return null;
    }
}

export async function updateAuthorProfile(userId: string, updates: Partial<Author>) {
    try {
        // Sanitize slug
        if (updates.slug) {
            updates.slug = updates.slug.toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }

        // Build dynamic SET clause
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        const fields: (keyof Author)[] = ['name', 'email', 'avatar_url', 'slug', 'bio',
            'website', 'twitter', 'instagram', 'linkedin', 'youtube'];

        for (const field of fields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex}`);
                params.push(updates[field]);
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            return { success: false, error: 'No fields to update' };
        }

        params.push(userId);

        const result = await db.query(
            `UPDATE authors SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Update failed or author not found' };
        }

        return { success: true, data: result.rows[0] };
    } catch (error: any) {
        console.error('[dbAuthors] updateAuthorProfile error:', error.message);
        return { success: false, error: error.message };
    }
}
