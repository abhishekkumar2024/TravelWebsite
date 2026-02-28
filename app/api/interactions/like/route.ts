import { NextRequest, NextResponse } from 'next/server';
import { toggleLike } from '@/lib/db/queries';

/**
 * API route for toggling a blog like.
 * 
 * POST /api/interactions/like
 * Body: { blogId: string, userId: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { blogId, userId } = await req.json();

        if (!blogId || !userId) {
            return NextResponse.json({ error: 'Missing blogId or userId' }, { status: 400 });
        }

        const result = await toggleLike(blogId, userId);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[api/interactions/like] Error:', error.message);
        return NextResponse.json({ liked: false, error: error.message }, { status: 500 });
    }
}
