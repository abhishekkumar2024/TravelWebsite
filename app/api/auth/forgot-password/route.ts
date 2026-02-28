import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/router';
import { sendResetEmail } from '@/lib/mail';

/**
 * POST /api/auth/forgot-password
 * Request Body: { "email": "user@example.com" }
 * 
 * Generates a reset token and sets expiry time.
 * In production, send the URL via email (Resend / Nodemailer / SendGrid).
 */
export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find user by email
        const user = await db.queryOne<{ id: string }>(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (!user) {
            // Security: Don't leak if email exists. Still return success.
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, a reset link has been sent.'
            });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour from now

        await db.execute(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
            [resetToken, expiry, user.id]
        );

        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        // Production email integration
        try {
            await sendResetEmail(email, resetUrl);
        } catch (mailError) {
            console.error('[ForgotPassword] Email failed:', mailError);
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.'
        });

    } catch (error: any) {
        console.error('[Forgot Password API] Error:', error.message);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
