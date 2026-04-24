/**
 * Anchor Rooms API — Location-Based Live Chat
 * 
 * GET   /api/tharmate/anchor-rooms?city=jaisalmer  → List anchor rooms for a city with activity
 * POST  /api/tharmate/anchor-rooms                 → Send a message to an anchor room
 * PATCH /api/tharmate/anchor-rooms                 → Heartbeat (poll for messages + presence)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ANCHOR_POINTS, getAnchorsForCity, getCityAnchors } from '@/lib/tharmate/anchor-points';
import {
    pushAnchorMessage,
    getAnchorMessages,
    recordAnchorHeartbeat,
    getAnchorPresenceCount,
    getAnchorMessageCount,
} from '@/lib/redis-tharmate';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/tharmate/anchor-rooms?city=jaisalmer
 * 
 * Returns all anchor rooms for a city with real-time activity counts.
 * If no city specified, returns all city-level anchors as an overview.
 */
export async function GET(req: NextRequest) {
    try {
        const city = req.nextUrl.searchParams.get('city');
        const anchorId = req.nextUrl.searchParams.get('anchorId');

        // If anchorId is provided, return messages for that room (poll endpoint)
        if (anchorId) {
            const session = await getServerSession(authOptions);
            const afterParam = req.nextUrl.searchParams.get('after');

            // Record heartbeat for authenticated users
            if (session?.user?.id) {
                await recordAnchorHeartbeat(anchorId, session.user.id);
            }

            const messages = await getAnchorMessages(anchorId, 50);
            const activeCount = await getAnchorPresenceCount(anchorId);

            // If `after` is specified, only return messages after that ID
            let filteredMessages = messages;
            if (afterParam) {
                const afterIdx = messages.findIndex(m => m.id === afterParam);
                if (afterIdx !== -1) {
                    filteredMessages = messages.slice(afterIdx + 1);
                }
            }

            // Find the anchor info
            const anchor = ANCHOR_POINTS.find(a => a.id === anchorId);

            return NextResponse.json({
                messages: filteredMessages,
                activeMembers: activeCount,
                anchor: anchor ? {
                    id: anchor.id,
                    label: anchor.label,
                    emoji: anchor.emoji,
                    city: anchor.city,
                    type: anchor.type,
                } : null,
            });
        }

        // If city provided, return all anchors for that city with activity
        if (city) {
            const anchors = getAnchorsForCity(city);
            
            const enriched = await Promise.all(anchors.map(async (anchor) => {
                const [activeCount, msgCount] = await Promise.all([
                    getAnchorPresenceCount(anchor.id),
                    getAnchorMessageCount(anchor.id),
                ]);

                return {
                    id: anchor.id,
                    label: anchor.label,
                    emoji: anchor.emoji,
                    city: anchor.city,
                    type: anchor.type,
                    radius: anchor.radius,
                    lat: anchor.lat,
                    lng: anchor.lng,
                    activeMembers: activeCount,
                    messageCount: msgCount,
                    hasActivity: activeCount > 0 || msgCount > 0,
                };
            }));

            // Sort: active rooms first, then by type (landmark > area > city)
            const typePriority: Record<string, number> = { landmark: 0, area: 1, city: 2 };
            enriched.sort((a, b) => {
                // Active rooms first
                if (a.hasActivity !== b.hasActivity) return a.hasActivity ? -1 : 1;
                // Then by active member count
                if (a.activeMembers !== b.activeMembers) return b.activeMembers - a.activeMembers;
                // Then by type
                return (typePriority[a.type] ?? 2) - (typePriority[b.type] ?? 2);
            });

            return NextResponse.json({ anchors: enriched, city });
        }

        // No city — return overview of all cities with total activity
        const cities = getCityAnchors();
        const overview = await Promise.all(cities.map(async (cityAnchor) => {
            const cityAnchors = getAnchorsForCity(cityAnchor.city);
            let totalActive = 0;
            let totalMessages = 0;

            for (const a of cityAnchors) {
                totalActive += await getAnchorPresenceCount(a.id);
                totalMessages += await getAnchorMessageCount(a.id);
            }

            return {
                id: cityAnchor.id,
                label: cityAnchor.label,
                emoji: cityAnchor.emoji,
                city: cityAnchor.city,
                anchorCount: cityAnchors.length,
                totalActive,
                totalMessages,
            };
        }));

        return NextResponse.json({ cities: overview });
    } catch (error: any) {
        console.error('[API] GET /api/tharmate/anchor-rooms error:', error);
        return NextResponse.json({ error: 'Failed to fetch anchor rooms' }, { status: 500 });
    }
}

/**
 * POST /api/tharmate/anchor-rooms
 * Body: { anchorId, message, messageType? }
 * 
 * Send a message to an anchor room (48hr live chat).
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        // Rate limit: 30 messages per minute
        const { allowed } = await rateLimit(`anchor:msg:${session.user.id}`, 30, 60);
        if (!allowed) {
            return NextResponse.json({ error: 'Slow down! Too many messages.' }, { status: 429 });
        }

        const body = await req.json();
        const { anchorId, message, messageType = 'text' } = body;

        if (!anchorId || typeof anchorId !== 'string') {
            return NextResponse.json({ error: 'Anchor ID is required' }, { status: 400 });
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message too long' }, { status: 400 });
        }

        // Verify anchor exists
        const anchor = ANCHOR_POINTS.find(a => a.id === anchorId);
        if (!anchor) {
            return NextResponse.json({ error: 'Invalid anchor room' }, { status: 400 });
        }

        // Create message
        const msgId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const chatMessage = {
            id: msgId,
            anchorId,
            senderId: session.user.id,
            senderName: session.user.name || 'Traveler',
            senderImage: session.user.image || null,
            message: message.trim(),
            messageType,
            createdAt: new Date().toISOString(),
        };

        // Push to Redis
        await pushAnchorMessage(anchorId, chatMessage);

        // Record heartbeat
        await recordAnchorHeartbeat(anchorId, session.user.id);

        return NextResponse.json({ id: msgId }, { status: 201 });
    } catch (error: any) {
        console.error('[API] POST /api/tharmate/anchor-rooms error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
