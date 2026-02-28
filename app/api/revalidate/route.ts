import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * On-demand revalidation API route.
 * Called after blog create/update/delete to instantly bust ISR cache.
 * 
 * POST body: { paths?: string[], tags?: string[] }
 * - paths: specific page paths to revalidate (e.g., "/blog/my-slug/")
 * - tags: cache tags to invalidate (e.g., "blogs")
 */
export async function POST(req: NextRequest) {
    try {
        const { paths, tags } = await req.json();

        const revalidated: string[] = [];

        // Revalidate specific paths
        if (paths && Array.isArray(paths)) {
            for (const path of paths) {
                revalidatePath(path);
                revalidated.push(`path:${path}`);
            }
        }

        // Revalidate cache tags (busts unstable_cache entries)
        if (tags && Array.isArray(tags)) {
            for (const tag of tags) {
                revalidateTag(tag);
                revalidated.push(`tag:${tag}`);
            }
        }

        // Revalidated items are returned in JSON response.

        return NextResponse.json({
            revalidated: true,
            items: revalidated,
            timestamp: Date.now(),
        });
    } catch (error: any) {
        console.error('[Revalidate] Error:', error);
        return NextResponse.json(
            { revalidated: false, error: error.message },
            { status: 500 }
        );
    }
}
