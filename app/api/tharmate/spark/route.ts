/**
 * Spark API — Send/Receive Companion Requests
 * 
 * POST   /api/tharmate/spark         → Send a spark
 * GET    /api/tharmate/spark         → Get received/sent sparks
 * PATCH  /api/tharmate/spark         → Accept/decline a spark
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSpark, fetchReceivedSparks, fetchSentSparks, respondToSpark } from '@/lib/db/queries/tharmate-sparks';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validate, CreateSparkSchema, RespondSparkSchema } from '@/lib/validators/tharmate';
import { pushNotification } from '@/lib/redis-tharmate';

/**
 * GET /api/tharmate/spark?type=received|sent
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const type = req.nextUrl.searchParams.get('type') || 'received';

        if (type === 'sent') {
            const sparks = await fetchSentSparks(session.user.id);
            return NextResponse.json({ sparks });
        } else {
            const sparks = await fetchReceivedSparks(session.user.id);
            return NextResponse.json({ sparks });
        }
    } catch (error: any) {
        console.error('[API] GET /api/tharmate/spark error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/tharmate/spark
 * Body: { planId, message }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit
        const { allowed } = await rateLimit(
            `spark:${session.user.id}`,
            RATE_LIMITS.sendSpark.limit,
            RATE_LIMITS.sendSpark.window
        );
        if (!allowed) {
            return NextResponse.json({ error: 'Too many sparks. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        // Zod validation
        const { data, error } = validate(CreateSparkSchema, body);
        if (error || !data) {
            return NextResponse.json({ error: error || 'Invalid input' }, { status: 400 });
        }

        const result = await createSpark({
            planId: data.planId,
            senderId: session.user.id,
            message: data.message,
        });

        if (result.error) {
            const status = result.error.includes('already') ? 409 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ sparkId: result.data?.id, status: 'pending' }, { status: 201 });
    } catch (error: any) {
        console.error('[API] POST /api/tharmate/spark error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/tharmate/spark
 * Body: { sparkId, action: 'accept' | 'decline' }
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        // Zod validation
        const { data, error } = validate(RespondSparkSchema, body);
        if (error || !data) {
            return NextResponse.json({ error: error || 'Invalid request' }, { status: 400 });
        }

        const result = await respondToSpark(data.sparkId, session.user.id, data.action);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Push notification to the spark sender
        if (result.data) {
            const notifType = data.action === 'accept' ? 'spark_accepted' : 'spark_declined';
            await pushNotification(result.data.senderId, {
                type: notifType as any,
                sparkId: data.sparkId,
                fromUserId: session.user.id,
                fromUserName: session.user.name || 'Someone',
                planTitle: result.data.planTitle || 'a travel plan',
                roomId: result.roomId,
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            status: result.data?.status,
            roomId: result.roomId || null,
            message: data.action === 'accept'
                ? 'Spark accepted! Desert Room created.'
                : 'Spark declined',
        });
    } catch (error: any) {
        console.error('[API] PATCH /api/tharmate/spark error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
