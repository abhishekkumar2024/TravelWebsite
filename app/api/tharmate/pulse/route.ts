/**
 * Pulse API — Place Pulse Feed CRUD
 * 
 * GET   /api/tharmate/pulse?destination=jaisalmer&tag=tip  → Fetch feed (Redis-cached)
 * POST  /api/tharmate/pulse                                → Post a message
 * PATCH /api/tharmate/pulse                                → Mark helpful / delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    fetchPulseFeed,
    createPulseMessage,
    markPulseHelpful,
    deletePulseMessage,
    getPulseScore,
    type PulseTag,
} from '@/lib/db/queries/tharmate-pulse';
import { getCachedPulse, setCachedPulse, invalidatePulseCache } from '@/lib/redis-tharmate';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validate, PulseMessageSchema } from '@/lib/validators/tharmate';

/**
 * GET /api/tharmate/pulse?destination=jaisalmer&tag=tip&score=true
 */
export async function GET(req: NextRequest) {
    try {
        const destination = req.nextUrl.searchParams.get('destination');
        if (!destination) {
            return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
        }

        const tag = req.nextUrl.searchParams.get('tag') as PulseTag | null;
        const wantScore = req.nextUrl.searchParams.get('score') === 'true';
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30', 10);
        const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);

        // If requesting pulse score only
        if (wantScore) {
            const score = await getPulseScore(destination);
            return NextResponse.json({ score });
        }

        // Try Redis cache for first page without tag filter
        if (offset === 0 && !tag) {
            const cached = await getCachedPulse(destination);
            if (cached) {
                return NextResponse.json({ messages: cached, cached: true });
            }
        }

        // DB query
        const messages = await fetchPulseFeed({ destination, tag: tag || undefined, limit, offset });

        // Cache first page (no tag filter)
        if (offset === 0 && !tag) {
            await setCachedPulse(destination, messages);
        }

        return NextResponse.json({ messages });
    } catch (error: any) {
        console.error('[API] GET /api/tharmate/pulse error:', error);
        return NextResponse.json({ error: 'Failed to fetch pulse feed' }, { status: 500 });
    }
}

/**
 * POST /api/tharmate/pulse
 * Body: { destination, message, tag, photo_url? }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        // Rate limit
        const { allowed } = await rateLimit(
            `pulse:${session.user.id}`,
            RATE_LIMITS.postPulse.limit,
            RATE_LIMITS.postPulse.window
        );
        if (!allowed) {
            return NextResponse.json({ error: 'Too many posts. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        // Zod validation
        const { data, error } = validate(PulseMessageSchema, body);
        if (error || !data) {
            return NextResponse.json({ error: error || 'Invalid input' }, { status: 400 });
        }

        const result = await createPulseMessage({
            userId: session.user.id,
            destination: data.destination,
            message: data.message,
            tag: data.tag,
            photoUrl: data.photo_url,
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Invalidate cache for this destination
        await invalidatePulseCache(data.destination);

        return NextResponse.json({ id: result.data?.id }, { status: 201 });
    } catch (error: any) {
        console.error('[API] POST /api/tharmate/pulse error:', error);
        return NextResponse.json({ error: 'Failed to post pulse' }, { status: 500 });
    }
}

/**
 * PATCH /api/tharmate/pulse
 * Body: { action: 'helpful' | 'delete', pulseId }
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        const body = await req.json();
        const { action, pulseId } = body;

        if (!pulseId || !action) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        if (action === 'helpful') {
            const result = await markPulseHelpful(pulseId);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ ok: true });
        }

        if (action === 'delete') {
            const result = await deletePulseMessage(pulseId, session.user.id);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[API] PATCH /api/tharmate/pulse error:', error);
        return NextResponse.json({ error: 'Failed to update pulse' }, { status: 500 });
    }
}
