/**
 * POST /api/blogs/submit
 *
 * Handles blog creation from the submit page.
 * This runs server-side so it can safely use the DB module.
 * The 'use client' submit page calls this API instead of importing db directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createBlog } from '@/lib/db/queries/blogs';
import { ensureAuthorExists } from '@/lib/db/queries/authors';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
    try {
        // Verify the user is authenticated
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated. Please login.' }, { status: 401 });
        }

        const user = session.user as any;
        const body = await req.json();

        // Ensure author record exists in DB
        await ensureAuthorExists(
            user.id,
            user.name || user.email?.split('@')[0] || 'Traveler',
            user.email || '',
            user.image
        ).catch((e: any) => console.error('[submit/route] ensureAuthorExists error:', e));

        // Determine status based on role
        const isAdminUser = user.role === 'admin';
        const status = isAdminUser ? 'published' : 'pending';

        const { id, slug, error } = await createBlog({
            ...body,
            authorId: user.id,
            author: {
                name: user.name || user.email?.split('@')[0] || 'Traveler',
                email: user.email || '',
            },
            status,
        });

        if (error || !id) {
            return NextResponse.json({ error: error || 'Blog creation failed' }, { status: 500 });
        }

        // Server-side cache revalidation — runs immediately on the server
        try {
            revalidatePath('/blogs/');
            revalidatePath('/');
            revalidateTag('blogs');

            // Revalidate destination pages where this blog appears
            if (body.destination) {
                const destSlugs = body.destination.split(',').filter(Boolean);
                for (const d of destSlugs) {
                    revalidatePath(`/destinations/${d}/`);
                }
            }
        } catch (revalErr) {
            console.warn('[submit/route] Revalidation error (non-critical):', revalErr);
        }

        return NextResponse.json({ id, slug, isAdmin: isAdminUser }, { status: 200 });

    } catch (err: any) {
        console.error('[submit/route] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
