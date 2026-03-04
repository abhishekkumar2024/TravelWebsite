/**
 * TharMate API — Plans CRUD
 * 
 * GET  /api/tharmate    → List active plans (with optional ?destination=jaisalmer)
 * POST /api/tharmate    → Create a new plan (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchTharMatePlans, createTharMatePlan } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const destination = searchParams.get('destination') || undefined;
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const plans = await fetchTharMatePlans({ destination, limit, offset });

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

        const body = await request.json();
        const { title, description, destination, meetingPoint, planDate, planTime, maxCompanions, vibe } = body;

        // Validation
        if (!title || !description || !destination || !planDate) {
            return NextResponse.json(
                { error: 'Title, description, destination, and date are required' },
                { status: 400 }
            );
        }

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
            title,
            description,
            destination,
            meetingPoint,
            planDate,
            planTime,
            maxCompanions: maxCompanions || 3,
            vibe: vibe || [],
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ plan: result.data }, { status: 201 });
    } catch (error: any) {
        console.error('[API /tharmate] POST error:', error.message);
        return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }
}
