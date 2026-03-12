/**
 * TharMate API — Plans CRUD (with Redis caching)
 * 
 * GET  /api/tharmate    → List active plans (Redis-cached, 60s TTL)
 * POST /api/tharmate    → Create a new plan (invalidates cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchTharMatePlans, createTharMatePlan } from '@/lib/db/queries';
import { getCachedPlans, setCachedPlans, invalidatePlanCache } from '@/lib/redis-tharmate';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const destination = searchParams.get('destination') || undefined;
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // Try Redis cache first (only for first page, no offset)
        if (offset === 0) {
            const cached = await getCachedPlans(destination || 'all');
            if (cached) {
                return NextResponse.json({ plans: cached, cached: true }, { status: 200 });
            }
        }

        // Cache miss — hit database
        const plans = await fetchTharMatePlans({ destination, limit, offset });

        // Cache the result (only first page)
        if (offset === 0) {
            await setCachedPlans(destination || 'all', plans);
        }

        return NextResponse.json({ plans }, { status: 200 });
    } catch (error: any) {
        console.error('[API /tharmate] GET error:', error.message);
        return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        // Rate limit plan creation
        const { allowed } = await rateLimit(
            `plan:${session.user.id}`,
            RATE_LIMITS.createPlan.limit,
            RATE_LIMITS.createPlan.window
        );
        if (!allowed) {
            return NextResponse.json({ error: 'Too many plans created. Please wait.' }, { status: 429 });
        }

        const body = await request.json();
        const { title, description, destination, meetingPoint, planDate, planTime, maxCompanions, vibe } = body;

        // Validation
        if (!title || !description || !destination || !planDate) {
            return NextResponse.json(
                { error: 'Title, description, destination, and date are required' },
                { status: 400 }
            );
        }

        // Sanitize inputs
        const cleanTitle = title.trim().slice(0, 200);
        const cleanDesc = description.trim().slice(0, 500);
        const cleanDest = destination.trim().toLowerCase().slice(0, 100);

        // Date must be today or in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(planDate) < today) {
            return NextResponse.json(
                { error: 'Plan date must be today or in the future' },
                { status: 400 }
            );
        }

        const result = await createTharMatePlan({
            userId: session.user.id,
            title: cleanTitle,
            description: cleanDesc,
            destination: cleanDest,
            meetingPoint,
            planDate,
            planTime,
            maxCompanions: Math.min(maxCompanions || 3, 10),
            vibe: vibe || [],
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Invalidate plan cache for this destination
        await invalidatePlanCache(cleanDest);

        return NextResponse.json({ plan: result.data }, { status: 201 });
    } catch (error: any) {
        console.error('[API /tharmate] POST error:', error.message);
        return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }
}
