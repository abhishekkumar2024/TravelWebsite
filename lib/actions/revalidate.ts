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
 * @param slug - New blog slug (for the detail page)
 * @param destination - Comma-separated destination slugs (for destination pages)
 * @param oldSlug - Previous slug if it changed (to clear old URL from cache)
 */
export async function revalidateBlogPaths(slug?: string, destination?: string, oldSlug?: string) {
    try {
        const revalidated: string[] = [];

        // Revalidate new blog detail page
        if (slug) {
            revalidatePath(`/blogs/${slug}/`);
            revalidated.push(`/blogs/${slug}/`);
        }

        // Revalidate OLD blog URL if slug changed (prevents stale 404)
        if (oldSlug && oldSlug !== slug) {
            revalidatePath(`/blogs/${oldSlug}/`);
            revalidated.push(`/blogs/${oldSlug}/ (old)`);
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

/**
 * Revalidate pages affected by an author profile update (bio, avatar, social links).
 * Blog pages show author data via AuthorBox — those need cache-busting too.
 * @param authorSlug - Author's slug for their profile page
 */
export async function revalidateAuthorPages(authorSlug?: string) {
    try {
        const revalidated: string[] = [];

        // Revalidate all blog pages (author data is shown in AuthorBox)
        revalidatePath('/blogs/', 'layout');
        revalidated.push('/blogs/ (layout)');

        // Revalidate author profile page
        if (authorSlug) {
            revalidatePath(`/author/${authorSlug}/`);
            revalidated.push(`/author/${authorSlug}/`);
        }

        // Revalidate homepage (may show author info)
        revalidatePath('/');
        revalidated.push('/');

        // Bust cache tag
        revalidateTag('blogs');
        revalidated.push('tag:blogs');

        console.log('[revalidateAuthorPages] Revalidated:', revalidated.join(', '));
        return { success: true, revalidated };
    } catch (error: any) {
        console.error('[revalidateAuthorPages] Error:', error.message);
        return { success: false, error: error.message };
    }
}
