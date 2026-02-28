import { NextRequest, NextResponse } from 'next/server';
import {
    fetchComments,
    addComment,
    deleteComment,
    updateComment,
    toggleCommentLike,
    fetchUserCommentLikes,
} from '@/lib/db/queries';

/**
 * GET /api/comments?blogId=xxx&userId=yyy  — fetch comments + user likes
 * POST /api/comments                        — add comment { blogId, userId, content, parentId? }
 * PUT /api/comments                         — update comment { commentId, content }
 * DELETE /api/comments                      — delete comment { commentId }
 */
export async function GET(req: NextRequest) {
    try {
        const blogId = req.nextUrl.searchParams.get('blogId');
        const userId = req.nextUrl.searchParams.get('userId');
        if (!blogId) return NextResponse.json({ error: 'Missing blogId' }, { status: 400 });

        const comments = await fetchComments(blogId);

        // Get comment IDs for user like status
        let userLikes: Set<string> = new Set();
        if (userId && comments.length > 0) {
            const commentIds = comments.map((c: any) => c.id);
            userLikes = await fetchUserCommentLikes(commentIds, userId);
        }

        return NextResponse.json({
            comments,
            userLikes: Array.from(userLikes),
        });
    } catch (error: any) {
        console.error('[api/comments] GET error:', error.message);
        return NextResponse.json({ comments: [], userLikes: [] });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { blogId, userId, content, parentId } = await req.json();
        if (!blogId || !userId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await addComment(blogId, userId, content, parentId || null);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[api/comments] POST error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { commentId, content } = await req.json();
        if (!commentId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await updateComment(commentId, content);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[api/comments] PUT error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { commentId } = await req.json();
        if (!commentId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await deleteComment(commentId);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[api/comments] DELETE error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
