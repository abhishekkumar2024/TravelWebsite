/**
 * Room Messages API — Chat within a Desert Room
 * 
 * GET  /api/tharmate/rooms/[roomId]/messages?after=<msgId>  → Poll for new messages
 * POST /api/tharmate/rooms/[roomId]/messages                → Send a message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchRoomMessages, sendRoomMessage, getRoomDetails } from '@/lib/db/queries/tharmate-rooms';
import { pushChatMessage, getChatMessages, setTyping, deleteRoomMessages, recordRoomHeartbeat, getRoomPresenceCount } from '@/lib/redis-tharmate';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validate, ChatMessageSchema } from '@/lib/validators/tharmate';

/**
 * GET /api/tharmate/rooms/[roomId]/messages?after=<lastMsgId>
 * 
 * Poll-based chat: client polls every 3s with the ID of the last message it has.
 * First tries Redis (fast), falls back to DB.
 * Also handles real-time presence heartbeats.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const { roomId } = params;
        const afterId = req.nextUrl.searchParams.get('after') || undefined;

        // Record heartbeat for logged in users
        if (session?.user?.id) {
            await recordRoomHeartbeat(roomId, session.user.id);
        }

        // Get room details (includes lazy expiry check)
        const room = await getRoomDetails(roomId);

        // If room was lazy-expired, clean up Redis
        if (room && !room.isActive) {
            await deleteRoomMessages(roomId);
        }

        // Get dynamic presence count from Redis (Real-time)
        const activeCount = await getRoomPresenceCount(roomId);

        const roomData = room ? {
            id: room.id,
            title: room.title,
            destination: room.destination,
            expiresAt: room.expiresAt,
            currentMembers: Math.max(room.currentMembers, activeCount), // Show higher of DB or Redis
            maxMembers: room.maxMembers,
            isActive: room.isActive,
            activeMembers: activeCount, // Extra field for UI to show "3 online"
        } : null;

        // Try Redis first for recent messages
        if (!afterId && room?.isActive) {
            const cached = await getChatMessages(roomId, 50);
            if (cached && cached.length > 0) {
                return NextResponse.json({
                    messages: cached,
                    source: 'redis',
                    room: roomData,
                });
            }
        }

        // Fall back to DB
        const messages = await fetchRoomMessages(roomId, afterId, 50);

        return NextResponse.json({
            messages,
            room: roomData,
        });
    } catch (error: any) {
        console.error('[API] GET room messages error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

/**
 * POST /api/tharmate/rooms/[roomId]/messages
 * Body: { message, messageType? }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { roomId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        const { roomId } = params;

        // Rate limit messages
        const { allowed } = await rateLimit(
            `room:msg:${session.user.id}`,
            RATE_LIMITS.sendMessage.limit,
            RATE_LIMITS.sendMessage.window
        );
        if (!allowed) {
            return NextResponse.json({ error: 'Slow down! Too many messages.' }, { status: 429 });
        }

        const body = await req.json();
        // Zod validation
        const { data, error } = validate(ChatMessageSchema, body);
        if (error || !data) {
            return NextResponse.json({ error: error || 'Invalid message' }, { status: 400 });
        }

        // Save to DB
        const result = await sendRoomMessage({
            roomId,
            senderId: session.user.id,
            message: data.message,
            messageType: data.messageType || 'text',
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Also push to Redis for fast reads
        if (result.data?.id) {
            await pushChatMessage(roomId, {
                id: result.data.id,
                roomId,
                senderId: session.user.id,
                message: data.message,
                messageType: data.messageType || 'text',
                createdAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({ id: result.data?.id }, { status: 201 });
    } catch (error: any) {
        console.error('[API] POST room message error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
