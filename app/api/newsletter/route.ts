import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/newsletter — subscribe to newsletter { email }
 */
export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
        }

        await db.execute(
            'INSERT INTO newsletter_subscribers (email) VALUES ($1)',
            [email]
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        // PostgreSQL unique violation (already subscribed)
        if (err?.code === '23505' || err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
            return NextResponse.json({ success: true, alreadySubscribed: true });
        }
        console.error('[api/newsletter] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
