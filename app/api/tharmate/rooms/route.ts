/**
 * Rooms API — Desert Rooms CRUD
 * 
 * GET   /api/tharmate/rooms?destination=jaisalmer  → List active rooms
 * POST  /api/tharmate/rooms                        → Create a room
 * PATCH /api/tharmate/rooms                        → Join a room
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchActiveRooms, createRoom, joinRoom, type RoomDuration } from '@/lib/db/queries/tharmate-rooms';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validate, CreateRoomSchema } from '@/lib/validators/tharmate';
import { acquireRoomLock, releaseRoomLock, getRoomPresenceCount } from '@/lib/redis-tharmate';

/**
 * GET /api/tharmate/rooms?destination=jaisalmer
 */
export async function GET(req: NextRequest) {
    try {
        const destination = req.nextUrl.searchParams.get('destination') || undefined;
        const rooms = await fetchActiveRooms(destination);

        // Enrich rooms with real-time active counts from Redis
        const enrichedRooms = await Promise.all(rooms.map(async (room) => {
            const activeCount = await getRoomPresenceCount(room.id);
            return {
                ...room,
                activeMembers: activeCount,
            };
        }));

        return NextResponse.json({ rooms: enrichedRooms });
    } catch (error: any) {
        console.error('[API] GET /api/tharmate/rooms error:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

/**
 * POST /api/tharmate/rooms
 * Body: { destination, title, description?, maxMembers?, duration }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        // Rate limit: 10 rooms per hour
        const { allowed } = await rateLimit(`room:create:${session.user.id}`, 10, 3600);
        if (!allowed) {
            return NextResponse.json({ error: 'You can only create 10 rooms per hour' }, { status: 429 });
        }

        const body = await req.json();
        // Zod validation
        const { data, error } = validate(CreateRoomSchema, body);
        if (error || !data) {
            return NextResponse.json({ error: error || 'Invalid input' }, { status: 400 });
        }

        // Acquire creation lock (prevents duplicate rooms on double-submit)
        const lockKey = `${session.user.id}:${data.destination}`;
        const lockAcquired = await acquireRoomLock(lockKey);
        if (!lockAcquired) {
            return NextResponse.json({ error: 'Room creation already in progress' }, { status: 409 });
        }

        try {
            const result = await createRoom({
                creatorId: session.user.id,
                destination: data.destination,
                title: data.title,
                description: data.description,
                maxMembers: data.maxMembers,
                duration: data.duration as RoomDuration,
            });

            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }

            return NextResponse.json({ id: result.data?.id }, { status: 201 });
        } finally {
            await releaseRoomLock(lockKey);
        }
    } catch (error: any) {
        console.error('[API] POST /api/tharmate/rooms error:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}

/**
 * PATCH /api/tharmate/rooms
 * Body: { action: 'join', roomId }
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        const body = await req.json();
        const { action, roomId } = body;

        if (action === 'join' && roomId) {
            const result = await joinRoom(roomId, session.user.id);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[API] PATCH /api/tharmate/rooms error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
