/**
 * TharMate API — Join Requests
 * 
 * POST /api/tharmate/join  → Send a join request (requires auth)
 * PATCH /api/tharmate/join → Accept/decline a request (plan owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createJoinRequest, updateRequestStatus } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        const body = await request.json();
        const { planId, message } = body;

        if (!planId) {
            return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
        }

        const result = await createJoinRequest({
            planId,
            requesterId: session.user.id,
            message,
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ request: result.data }, { status: 201 });
    } catch (error: any) {
        console.error('[API /tharmate/join] POST error:', error.message);
        return NextResponse.json({ error: 'Failed to send join request' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }

        const body = await request.json();
        const { requestId, status } = body;

        if (!requestId || !['accepted', 'declined'].includes(status)) {
            return NextResponse.json(
                { error: 'Request ID and valid status (accepted/declined) are required' },
                { status: 400 }
            );
        }

        const result = await updateRequestStatus(requestId, session.user.id, status);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('[API /tharmate/join] PATCH error:', error.message);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
}
