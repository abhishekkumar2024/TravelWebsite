/**
 * Email Service Helper (using Resend)
 * 
 * For Production: Set RESEND_API_KEY in .env.local
 */

import { Resend } from 'resend';

// Lazy-initialize Resend to avoid build-time errors when the key is missing
let resendInstance: Resend | null = null;

function getResend() {
    if (!resendInstance) {
        if (!process.env.RESEND_API_KEY) {
            // In production, we must have a key. In dev/build, we can proceed with a warning
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Missing RESEND_API_KEY');
            }
            return null;
        }
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
}

/**
 * Send password reset email
 */
export async function sendResetEmail(email: string, resetUrl: string) {
    const resend = getResend();

    // Fallback if no resend client is available (dev mode)
    if (!resend) {
        console.log('--------------------------------------------------');
        console.log('[Dev/Build Mode] Email would be sent with following link:');
        console.log(resetUrl);
        console.log('--------------------------------------------------');
        return true;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'CamelThar <no-reply@camelthar.com>',
            to: [email],
            subject: 'Reset Your Password | CamelThar',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h1 style="color: #d97706; text-align: center;">CamelThar</h1>
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your CamelThar account. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #666; text-align: center;">
                        © ${new Date().getFullYear()} CamelThar - Travel Stories from the Land of Kings
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('[Resend] Error sending email:', error);
            throw new Error(error.message || 'Unknown Resend error');
        }

        return true;
    } catch (error: any) {
        console.error('[Mail] Fatal error:', error);
        throw error;
    }
}
