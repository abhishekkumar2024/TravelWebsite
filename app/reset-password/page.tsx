'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { t } = useLanguage();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError(t('Invalid or missing reset token.', 'अमान्य या गायब रीसेट टोकन।'));
        }
    }, [token, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError(t('Passwords do not match.', 'पासवर्ड मेल नहीं खाते।'));
            return;
        }

        if (newPassword.length < 6) {
            setError(t('Password must be at least 6 characters long.', 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setMessage(t('Password successfully reset! You can now log in.', 'पासवर्ड सफलतापूर्वक रीसेट हो गया! अब आप लॉगिन कर सकते हैं।'));

            // Redirect to login after a delay
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err: any) {
            setError(err.message || t('Something went wrong. Please try again.', 'कुछ गलत हो गया। कृपया पुन: प्रयास करें।'));
        } finally {
            setLoading(false);
        }
    };

    if (!token && !message) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-sand p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold mb-2">{t('Invalid Link', 'अमान्य लिंक')}</h2>
                    <p className="text-gray-600 mb-6">{t('This password reset link is invalid or has expired.', 'यह पासवर्ड रीसेट लिंक अमान्य है या समाप्त हो गया है।')}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full bg-royal-blue text-white p-3 rounded font-semibold"
                    >
                        {t('Back to Login', 'लॉगिन पर वापस जाएं')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-royal-blue/5 to-deep-maroon/5 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">{t('Reset Password', 'पासवर्ड रीसेट करें')}</h2>
                    <p className="text-gray-600 mt-2">{t('Enter your new password below.', 'नीचे अपना नया पासवर्ड दर्ज करें।')}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm">{message}</p>
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">{t('New Password', 'नया पासवर्ड')}</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-blue/50 focus:border-royal-blue"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">{t('Confirm New Password', 'नए पासवर्ड की पुष्टि करें')}</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-blue/50 focus:border-royal-blue"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-royal-blue text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-royal-blue/20 disabled:opacity-50"
                        >
                            {loading ? t('Updating...', 'अपडेट किया जा रहा है...') : t('Reset Password', 'पासवर्ड रीसेट करें')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-sand">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue"></div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
