/**
 * Admin Queries — Database Abstraction Layer
 * 
 * Replaces lib/admin.ts
 * Uses db.query() and NextAuth session instead of supabase.auth
 */

import { db } from '@/lib/db';

/**
 * Check if a user has admin role.
 * Called with the user's role from the NextAuth session.
 */
export function isAdmin(role?: string): boolean {
    return role === 'admin';
}

/**
 * Fetch all blogs with author info (admin view).
 */
export async function fetchAllBlogs(): Promise<any[]> {
    try {
        const result = await db.query(
            `SELECT b.*, a.name AS author_name, a.email AS author_email, a.avatar_url AS author_avatar
             FROM blogs b
             LEFT JOIN authors a ON b.author_id = a.id
             ORDER BY b.created_at DESC`
        );

        return result.rows.map((blog: any) => ({
            ...blog,
            author: blog.author_name ? {
                name: blog.author_name,
                email: blog.author_email,
                avatar: blog.author_avatar,
            } : (blog.author || { name: 'Unknown' }),
        }));
    } catch (error: any) {
        console.error('[dbAdmin] fetchAllBlogs error:', error.message);
        return [];
    }
}

/**
 * Fetch blogs by status (admin view).
 */
export async function fetchBlogsByStatus(status: 'pending' | 'published' | 'rejected' | 'draft'): Promise<any[]> {
    try {
        const result = await db.query(
            `SELECT b.*, a.name AS author_name, a.email AS author_email, a.avatar_url AS author_avatar
             FROM blogs b
             LEFT JOIN authors a ON b.author_id = a.id
             WHERE b.status = $1
             ORDER BY b.created_at DESC`,
            [status]
        );

        return result.rows.map((blog: any) => ({
            ...blog,
            author: blog.author_name ? {
                name: blog.author_name,
                email: blog.author_email,
                avatar: blog.author_avatar,
            } : (blog.author || { name: 'Unknown' }),
        }));
    } catch (error: any) {
        console.error(`[dbAdmin] fetchBlogsByStatus(${status}) error:`, error.message);
        return [];
    }
}

/**
 * Get admin dashboard statistics.
 */
export async function getAdminStats(): Promise<{
    total: number;
    pending: number;
    published: number;
    rejected: number;
    draft: number;
}> {
    try {
        const result = await db.query<{ status: string; count: string }>(
            `SELECT status, COUNT(*)::text AS count FROM blogs GROUP BY status`
        );

        const stats = { total: 0, pending: 0, published: 0, rejected: 0, draft: 0 };

        result.rows.forEach(row => {
            const count = parseInt(row.count, 10);
            stats.total += count;
            if (row.status in stats) {
                (stats as any)[row.status] = count;
            }
        });

        return stats;
    } catch (error: any) {
        console.error('[dbAdmin] getAdminStats error:', error.message);
        return { total: 0, pending: 0, published: 0, rejected: 0, draft: 0 };
    }
}
