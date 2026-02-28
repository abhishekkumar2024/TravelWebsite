'use server';

import { runFullReconciliation, SyncResult } from '@/lib/db/reconciliation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Client } from 'pg';

/**
 * Server Action: Triggers a full database reconciliation manually.
 */
export async function triggerReconciliationAction(): Promise<{ success: boolean; results: SyncResult[]; error: string | null }> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user as any).role !== 'admin') {
            return { success: false, results: [], error: 'Unauthorized. Admin only.' };
        }

        console.log(`[DB-SYNC-ACTION] Manual sync triggered by ${session.user?.email}`);
        const results = await runFullReconciliation();

        return { success: true, results, error: null };
    } catch (error: any) {
        console.error('[DB-SYNC-ACTION] Error:', error.message);
        return { success: false, results: [], error: error.message };
    }
}

/**
 * Server Action: Debugs and attempts to sync a specific failing blog entry.
 * Returns the exact database error for the first missing blog.
 */
export async function debugFailingBlogAction() {
    let targetId: string | null = null;
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'admin') {
            return { error: 'Unauthorized. Admin only.' };
        }

        const MASTER_URL = process.env.NEON_DATABASE_URL;
        const SLAVE_URL = process.env.SUPABASE_DATABASE_URL;

        if (!MASTER_URL || !SLAVE_URL) throw new Error('Database URLs are missing in env.');

        const master = new Client({ connectionString: MASTER_URL, ssl: { rejectUnauthorized: false } });
        const slave = new Client({ connectionString: SLAVE_URL, ssl: { rejectUnauthorized: false } });

        try {
            await master.connect();
            await slave.connect();

            // Find missing blogs
            const masterBlogs = (await master.query('SELECT id, title_en FROM blogs')).rows;
            const slaveBlogs = (await slave.query('SELECT id FROM blogs')).rows;
            const slaveIds = new Set(slaveBlogs.map((r: any) => r.id));

            const failingBlog = masterBlogs.find((b: any) => !slaveIds.has(b.id)) || masterBlogs[0];

            targetId = failingBlog?.id || null;
            if (!targetId) return { message: "No blogs found to sync." };

            const fullRowResult = await master.query('SELECT * FROM blogs WHERE id = $1', [targetId]);
            const fullRow = fullRowResult.rows[0];
            const cols = Object.keys(fullRow);

            // Explicitly stringify objects for JSONB columns
            const vals = Object.values(fullRow).map(val => {
                if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                    return JSON.stringify(val);
                }
                return val;
            });

            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const updateSet = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');

            await slave.query(`
                INSERT INTO blogs (${cols.map(c => `"${c}"`).join(', ')})
                VALUES (${placeholders})
                ON CONFLICT (id) DO UPDATE SET ${updateSet}
            `, vals);

            return { message: `✅ Successfully synced "${fullRow.title_en}"` };
        } catch (err: any) {
            console.error('[DEBUG-SYNC] Row failure details:', {
                id: targetId,
                error: err.message,
                detail: err.detail
            });
            return {
                error: err.message,
                detail: err.detail,
                hint: err.hint,
                code: err.code
            };
        } finally {
            await master.end().catch(() => { });
            await slave.end().catch(() => { });
        }
    } catch (error: any) {
        return { error: error.message };
    }
}
