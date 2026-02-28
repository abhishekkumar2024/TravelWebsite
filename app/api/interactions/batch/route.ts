import { NextRequest, NextResponse } from 'next/server';
import { batchFetchLikeCounts, batchFetchCommentCounts, batchFetchLikeStatuses } from '@/lib/db/queries';

/**
 * API route for batch fetching blog interaction data.
 * 
 * POST /api/interactions/batch
 * Body: { blogIds: string[], userId?: string }
 * 
 * Returns: { likes: Record<string, number>, comments: Record<string, number>, userLikes: string[] }
 */
export async function POST(req: NextRequest) {
    try {
        const { blogIds, userId } = await req.json();

        if (!blogIds || !Array.isArray(blogIds) || blogIds.length === 0) {
            return NextResponse.json({ likes: {}, comments: {}, userLikes: [] });
        }

        const [likeCounts, commentCounts, userLikes] = await Promise.all([
            batchFetchLikeCounts(blogIds),
            batchFetchCommentCounts(blogIds),
            userId ? batchFetchLikeStatuses(blogIds, userId) : Promise.resolve(new Set<string>()),
        ]);

        // Convert Maps/Sets to serializable objects
        const likes: Record<string, number> = {};
        likeCounts.forEach((v, k) => { likes[k] = v; });

        const comments: Record<string, number> = {};
        commentCounts.forEach((v, k) => { comments[k] = v; });

        return NextResponse.json({
            likes,
            comments,
            userLikes: Array.from(userLikes),
        });
    } catch (error: any) {
        console.error('[api/interactions/batch] Error:', error.message);
        return NextResponse.json({ likes: {}, comments: {}, userLikes: [] });
    }
}
