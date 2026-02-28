import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/router';

/**
 * POST /api/auth/reset-password
 * Request Body: { "token": "uuid", "newPassword": "password" }
 * 
 * Verifies reset token and updates password.
 */
export async function POST(req: NextRequest) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password required' }, { status: 400 });
        }

        // Find user by token and check expiry
        const user = await db.queryOne<{ id: string, reset_token_expiry: string }>(
            'SELECT id, reset_token_expiry FROM users WHERE reset_token = $1',
            [token]
        );

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        const now = new Date();
        const expiry = new Date(user.reset_token_expiry);

        if (now > expiry) {
            return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await db.execute(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        return NextResponse.json({
            success: true,
            message: 'Password successfully reset. You can now log in.'
        });

    } catch (error: any) {
        console.error('[Reset Password API] Error:', error.message);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
