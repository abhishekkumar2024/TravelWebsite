/**
 * Heartbeat API — Online Presence
 * 
 * POST /api/tharmate/heartbeat
 * Body: { destination }
 * 
 * Records user as "online" at a destination.
 * Client calls every 25 seconds.
 * 
 * GET /api/tharmate/heartbeat?destination=jaisalmer
 * Returns online count for a destination (or total if no destination).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recordHeartbeat, getOnlineCount, getTotalOnlineCount } from '@/lib/redis-tharmate';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/tharmate/heartbeat?destination=jaisalmer
 */
export async function GET(req: NextRequest) {
    try {
        const destination = req.nextUrl.searchParams.get('destination');

        if (destination) {
            const count = await getOnlineCount(destination);
            return NextResponse.json({ destination, online: count });
        } else {
            const total = await getTotalOnlineCount();
            return NextResponse.json({ online: total });
        }
    } catch (error: any) {
        console.error('[API] GET /api/tharmate/heartbeat error:', error);
        return NextResponse.json({ online: 0 });
    }
}

/**
 * POST /api/tharmate/heartbeat
 * Body: { destination }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit heartbeats
        const { allowed } = await rateLimit(
            `heartbeat:${session.user.id}`,
            RATE_LIMITS.heartbeat.limit,
            RATE_LIMITS.heartbeat.window
        );
        if (!allowed) {
            return NextResponse.json({ ok: true }); // Silently accept, don't error
        }

        const body = await req.json().catch(() => ({}));
        const destination = body.destination || 'general';

        await recordHeartbeat(session.user.id, destination);

        const count = await getOnlineCount(destination);
        return NextResponse.json({ ok: true, online: count });
    } catch (error: any) {
        console.error('[API] POST /api/tharmate/heartbeat error:', error);
        return NextResponse.json({ ok: true, online: 0 });
    }
}
