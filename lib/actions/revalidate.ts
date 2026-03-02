'use server';

/**
 * Server Action: Revalidate blog-related pages after create/update/delete.
 *
 * This runs server-side via Next.js Server Actions RPC.
 * Client components call this function directly — no HTTP round-trip needed.
 * The actual revalidatePath/revalidateTag logic executes on the server.
 */

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Revalidate all pages affected by a blog change.
 * @param slug - Blog slug (for the detail page)
 * @param destination - Comma-separated destination slugs (for destination pages)
 */
export async function revalidateBlogPaths(slug?: string, destination?: string) {
    try {
        const revalidated: string[] = [];

        // Revalidate blog detail page
        if (slug) {
            revalidatePath(`/blogs/${slug}/`);
            revalidated.push(`/blogs/${slug}/`);
        }

        // Revalidate blog listing page
        revalidatePath('/blogs/');
        revalidated.push('/blogs/');

        // Revalidate homepage
        revalidatePath('/');
        revalidated.push('/');

        // Revalidate destination pages where this blog appears
        if (destination) {
            const destSlugs = destination.split(',').filter(Boolean);
            for (const d of destSlugs) {
                revalidatePath(`/destinations/${d}/`);
                revalidated.push(`/destinations/${d}/`);
            }
        }

        // Revalidate cache tags
        revalidateTag('blogs');
        revalidated.push('tag:blogs');

        console.log('[revalidateBlogPaths] Revalidated:', revalidated.join(', '));
        return { success: true, revalidated };
    } catch (error: any) {
        console.error('[revalidateBlogPaths] Error:', error.message);
        return { success: false, error: error.message };
    }
}
