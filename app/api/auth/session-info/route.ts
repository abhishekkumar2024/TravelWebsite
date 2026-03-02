/**
 * GET /api/auth/session-info
 *
 * Returns the current user's session info including admin status.
 * Used by client components that need to know user role without
 * importing db directly.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensureAuthorExists } from '@/lib/db/queries/authors';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ user: null, isAdmin: false }, { status: 200 });
        }

        const user = session.user as any;
        const isAdminUser = user.role === 'admin';

        // Ensure author record exists (idempotent)
        await ensureAuthorExists(
            user.id,
            user.name || user.email?.split('@')[0] || 'Traveler',
            user.email || '',
            user.image
        ).catch((e: any) => console.error('[session-info] ensureAuthorExists error:', e));

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
            },
            isAdmin: isAdminUser,
        }, { status: 200 });

    } catch (err: any) {
        console.error('[session-info] error:', err);
        return NextResponse.json({ user: null, isAdmin: false }, { status: 500 });
    }
}
