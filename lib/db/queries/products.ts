/**
 * Product Queries — Database Abstraction Layer
 * 
 * Replaces lib/supabaseProducts.ts
 */

import { db } from '@/lib/db';

export interface AffiliateProduct {
    id: string;
    name: string;
    description?: string;
    price: string;
    imageUrl: string;
    affiliateLink: string;
    destinations: string[];
    isActive: boolean;
}

function mapRowToProduct(row: any): AffiliateProduct {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        imageUrl: row.image_url,
        affiliateLink: row.affiliate_link,
        destinations: row.destinations || [],
        isActive: row.is_active,
    };
}

export async function fetchProducts(): Promise<AffiliateProduct[]> {
    try {
        const result = await db.query(
            `SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC`
        );
        return result.rows.map(mapRowToProduct);
    } catch (error: any) {
        console.error('[dbProducts] fetchProducts error:', error.message);
        return [];
    }
}

export async function fetchAllProductsForAdmin(): Promise<AffiliateProduct[]> {
    try {
        const result = await db.query(
            `SELECT * FROM products ORDER BY created_at DESC`
        );
        return result.rows.map(mapRowToProduct);
    } catch (error: any) {
        console.error('[dbProducts] fetchAllProductsForAdmin error:', error.message);
        return [];
    }
}

export async function createProduct(payload: Omit<AffiliateProduct, 'id'>) {
    try {
        const result = await db.executeOne<{ id: string }>(
            `INSERT INTO products (name, description, price, image_url, affiliate_link, destinations, is_active)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
             RETURNING id`,
            [
                payload.name,
                payload.description,
                payload.price,
                payload.imageUrl,
                payload.affiliateLink,
                JSON.stringify(payload.destinations),
                payload.isActive,
            ]
        );
        return { data: result, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function updateProduct(id: string, payload: Partial<AffiliateProduct>) {
    try {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        const fieldMap: Record<string, string> = {
            name: 'name', description: 'description', price: 'price',
            imageUrl: 'image_url', affiliateLink: 'affiliate_link',
            isActive: 'is_active',
        };

        for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
            if ((payload as any)[jsKey] !== undefined) {
                setClauses.push(`${dbCol} = $${paramIndex}`);
                params.push((payload as any)[jsKey]);
                paramIndex++;
            }
        }

        if (payload.destinations !== undefined) {
            setClauses.push(`destinations = $${paramIndex}::jsonb`);
            params.push(JSON.stringify(payload.destinations));
            paramIndex++;
        }

        if (setClauses.length === 0) {
            return { data: null, error: 'No fields to update' };
        }

        params.push(id);
        const result = await db.executeOne<{ id: string }>(
            `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING id`,
            params
        );
        return { data: result, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
}

export async function deleteProduct(id: string) {
    try {
        await db.execute('DELETE FROM products WHERE id = $1::uuid', [id]);
        return { error: null };
    } catch (error: any) {
        return { error };
    }
}
