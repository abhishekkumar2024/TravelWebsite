/**
 * Typing Indicator API — Lightweight Redis TTL Trick
 * 
 * POST /api/tharmate/rooms/[roomId]/typing  → Set typing (auto-expires 3s)
 * GET  /api/tharmate/rooms/[roomId]/typing  → Check who's typing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setTyping, isTyping } from '@/lib/redis-tharmate';

/**
 * POST /api/tharmate/rooms/[roomId]/typing
 * Called by client on keypress (debounced). Sets a 3s TTL key in Redis.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await setTyping(params.roomId, session.user.id);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('[API] POST typing error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

/**
 * GET /api/tharmate/rooms/[roomId]/typing?userId=<partnerId>
 * Check if a specific user is typing. Returns { typing: boolean }.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    try {
        const userId = req.nextUrl.searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ typing: false });
        }

        const typing = await isTyping(params.roomId, userId);
        return NextResponse.json({ typing });
    } catch {
        return NextResponse.json({ typing: false });
    }
}
