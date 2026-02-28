'use server';

import { runFullReconciliation, SyncResult } from '@/lib/db/reconciliation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Server Action: Triggers a full database reconciliation manually.
 * Requires Admin privileges.
 */
export async function triggerReconciliationAction(): Promise<{ success: boolean, results: SyncResult[], error: string | null }> {
    try {
        const session = await getServerSession(authOptions);

        // Safety check: ensure only admins can trigger this
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
