import { NextRequest, NextResponse } from 'next/server';
import { toggleCommentLike } from '@/lib/db/queries';

/**
 * POST /api/comments/like — toggle comment like { commentId, userId }
 */
export async function POST(req: NextRequest) {
    try {
        const { commentId, userId } = await req.json();
        if (!commentId || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await toggleCommentLike(commentId, userId);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[api/comments/like] Error:', error.message);
        return NextResponse.json({ liked: false, error: error.message }, { status: 500 });
    }
}
