import { NextRequest, NextResponse } from 'next/server';
import { getAuthorProfile, updateAuthorProfile } from '@/lib/db/queries';

/**
 * GET /api/profile?userId=xxx  — fetch author profile
 * PUT /api/profile              — update author profile { userId, updates }
 */
export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const profile = await getAuthorProfile(userId);
        return NextResponse.json({ profile });
    } catch (error: any) {
        console.error('[api/profile] GET error:', error.message);
        return NextResponse.json({ profile: null, error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { userId, updates } = await req.json();
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const result = await updateAuthorProfile(userId, updates);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[api/profile] PUT error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
