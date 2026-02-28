'use server';

import { auth } from '@/auth';
import { runFullReconciliation } from '@/lib/db/reconciliation';

/**
 * Trigger the database reconciliation process
 */
export async function triggerReconciliationAction() {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
        return { error: 'Unauthorized. Admin only.' };
    }

    try {
        const results = await runFullReconciliation();
        return { success: true, results };
    } catch (err: any) {
        console.error('[DB-SYNC-ACTION] Error:', err.message);
        return { success: false, error: err.message };
    }
}
