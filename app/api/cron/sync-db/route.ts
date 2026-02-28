import { NextResponse } from 'next/server';
import { runFullReconciliation } from '@/lib/db/reconciliation';

/**
 * Cron API Route: Triggers database reconciliation
 * 
 * Securely called by Vercel Cron or any external automation.
 * Protection: CRON_SECRET header
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');

    // 1. Security Check
    // In production, compare with an env variable
    if (process.env.NODE_ENV === 'production') {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        console.log('[CRON-SYNC] Starting scheduled database reconciliation...');
        const results = await runFullReconciliation();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error: any) {
        console.error('[CRON-SYNC] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
