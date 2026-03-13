'use server';

import { db } from '@/lib/db';
import { Destination } from '@/lib/data';

/**
 * Mapping of database rows to Destination type
 */
function mapRowToDestination(row: any): Destination {
    return {
        id: row.id || row.slug,
        name_en: row.name_en,
        name_hi: row.name_hi,
        tagline_en: row.tagline_en,
        tagline_hi: row.tagline_hi,
        description_en: row.description_en,
        description_hi: row.description_hi,
        coverImage: row.cover_image,
        attractions: row.attractions || [],
        bestTime: row.best_time,
        blogCount: row.blog_count || 0,
        imageCredits: row.image_credits,
    };
}

/**
 * Fetch all destinations from the database
 */
export async function fetchDestinations(): Promise<Destination[]> {
    try {
        const result = await db.query(
            `SELECT d.*, 
            (SELECT COUNT(*) FROM blogs b WHERE b.destination ILIKE '%' || d.id || '%' AND b.status = 'published') as blog_count
            FROM destinations d
            ORDER BY d.id ASC`
        );
        return result.rows.map(mapRowToDestination);
    } catch (error: any) {
        console.error('[dbDestinations] fetchDestinations error:', error.message);
        return [];
    }
}

/**
 * Fetch a single destination by ID
 */
export async function fetchDestinationById(id: string): Promise<Destination | null> {
    try {
        const result = await db.query(
            `SELECT d.*, 
            (SELECT COUNT(*) FROM blogs b WHERE b.destination ILIKE '%' || d.id || '%' AND b.status = 'published') as blog_count
            FROM destinations d
            WHERE d.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return null;
        return mapRowToDestination(result.rows[0]);
    } catch (error: any) {
        console.error('[dbDestinations] fetchDestinationById error:', error.message);
        return null;
    }
}

/**
 * Create a new destination
 */
export async function createDestination(payload: Omit<Destination, 'blogCount'>) {
    try {
        const result = await db.executeOne(
            `INSERT INTO destinations (
                id, name_en, name_hi, tagline_en, tagline_hi, 
                description_en, description_hi, cover_image, 
                attractions, best_time, image_credits, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9::jsonb, $10, $11::jsonb, NOW(), NOW()
            ) RETURNING id`,
            [
                payload.id.toLowerCase(),
                payload.name_en,
                payload.name_hi,
                payload.tagline_en,
                payload.tagline_hi,
                payload.description_en,
                payload.description_hi,
                payload.coverImage,
                JSON.stringify(payload.attractions),
                payload.bestTime,
                payload.imageCredits ? JSON.stringify(payload.imageCredits) : null,
            ]
        );
        return { data: result, error: null };
    } catch (error: any) {
        console.error('[dbDestinations] createDestination error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Update an existing destination
 */
export async function updateDestination(id: string, payload: Partial<Destination>) {
    try {
        const setClauses: string[] = ['updated_at = NOW()'];
        const params: any[] = [];
        let paramIndex = 1;

        const fieldMap: Record<string, string> = {
            name_en: 'name_en',
            name_hi: 'name_hi',
            tagline_en: 'tagline_en',
            tagline_hi: 'tagline_hi',
            description_en: 'description_en',
            description_hi: 'description_hi',
            coverImage: 'cover_image',
            bestTime: 'best_time',
        };

        for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
            if ((payload as any)[jsKey] !== undefined) {
                setClauses.push(`${dbCol} = $${paramIndex}`);
                params.push((payload as any)[jsKey]);
                paramIndex++;
            }
        }

        if (payload.attractions !== undefined) {
            setClauses.push(`attractions = $${paramIndex}::jsonb`);
            params.push(JSON.stringify(payload.attractions));
            paramIndex++;
        }

        if (payload.imageCredits !== undefined) {
            setClauses.push(`image_credits = $${paramIndex}::jsonb`);
            params.push(payload.imageCredits ? JSON.stringify(payload.imageCredits) : null);
            paramIndex++;
        }

        if (setClauses.length === 1) { // Only updated_at
            return { data: null, error: 'No fields to update' };
        }

        params.push(id);
        const result = await db.executeOne(
            `UPDATE destinations SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
            params
        );
        return { data: result, error: null };
    } catch (error: any) {
        console.error('[dbDestinations] updateDestination error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Delete a destination
 */
export async function deleteDestination(id: string) {
    try {
        await db.execute('DELETE FROM destinations WHERE id = $1', [id]);
        return { error: null };
    } catch (error: any) {
        console.error('[dbDestinations] deleteDestination error:', error.message);
        return { error: error.message };
    }
}
