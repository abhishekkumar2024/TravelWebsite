/**
 * Single Room API — Get room details with lazy expiry
 * 
 * GET /api/tharmate/rooms/[roomId] → Room details + expiry check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRoomDetails } from '@/lib/db/queries/tharmate-rooms';
import { deleteRoomMessages } from '@/lib/redis-tharmate';

/**
 * GET /api/tharmate/rooms/[roomId]
 * Returns room details. Triggers lazy expiry if room is past its time.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    try {
        const room = await getRoomDetails(params.roomId);

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // If lazy-expired, clean up Redis
        if (!room.isActive) {
            await deleteRoomMessages(params.roomId);
        }

        return NextResponse.json({ room });
    } catch (error: any) {
        console.error('[API] GET room error:', error);
        return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
    }
}
