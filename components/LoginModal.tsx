'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useLanguage } from './LanguageProvider';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
    isModal?: boolean;
    title?: string;
    message?: string;
}

export default function LoginModal({
    isOpen,
    onClose,
    onLoginSuccess,
    isModal = true,
    title,
    message: customMessage,
}: LoginModalProps) {
    const { t } = useLanguage();

    const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Reset modal state
    useEffect(() => {
        if (!isOpen) {
            setEmail('');
            setPassword('');
            setName('');
            setError(null);
            setMessage(null);
            setLoading(false);
        }
    }, [isOpen]);

    // -------------------------
    // SUBMIT HANDLER
    // -------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (view === 'signup') {
                await handleSignup();
            } else if (view === 'forgot-password') {
                await handleForgotPassword();
            } else {
                await handleLogin();
            }
        } catch (err: any) {
            let errorMsg = err.message || '';
            // Network / fetch failures
            if (
                errorMsg.includes('Failed to fetch') ||
                errorMsg.includes('NetworkError') ||
                errorMsg.includes('ERR_NETWORK') ||
                errorMsg.includes('fetch')
            ) {
                errorMsg = t(
                    'Unable to connect to the server. Please check your internet connection and try again.',
                    'सर्वर से कनेक्ट करने में असमर्थ। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
                );
            } else if (errorMsg.includes('Email not confirmed')) {
                errorMsg = t(
                    'Email not confirmed. Please check your inbox for the verification link.',
                    'ईमेल की पुष्टि नहीं हुई है। कृपया सत्यापन लिंक के लिए अपना इनबॉक्स जांचें।'
                );
            } else if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('CredentialsSignin')) {
                errorMsg = t(
                    'Invalid email or password. Please try again.',
                    'गलत ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।'
                );
            }
            setError(errorMsg || t('Something went wrong', 'कुछ गलत हो गया'));
            setLoading(false);
        }
    };

    // -------------------------
    // SIGN UP — calls our /api/auth/signup endpoint
    // -------------------------
    const handleSignup = async () => {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name || email.split('@')[0],
                email,
                password,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Signup failed');
        }

        setMessage(
            t(
                'Account created! You can now log in.',
                'खाता बनाया गया! अब आप लॉगिन कर सकते हैं।'
            )
        );

        // Transition to login view after a short delay
        setTimeout(() => {
            setView('login');
            setLoading(false);
        }, 1200);
    };

    // -------------------------
    // FORGOT PASSWORD
    // -------------------------
    const handleForgotPassword = async () => {
        try {
            const res = await fetch('/api/auth/forgot-password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send reset email');
            }

            setMessage(data.message || t('Check your email for a reset link!', 'रीसेट लिंक के लिए अपना ईमेल जांचें!'));
        } catch (err: any) {
            setError(err.message || t('Something went wrong. Please try again.', 'कुछ गलत हो गया। कृपया पुन: प्रयास करें।'));
        } finally {
            setLoading(false);
        }
    };

    // -------------------------
    // LOGIN (EMAIL/PASSWORD) — uses NextAuth credentials provider
    // -------------------------
    const handleLogin = async () => {
        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (result?.error) {
            throw new Error(result.error);
        }

        if (result?.ok) {
            setMessage(t('Login successful!', 'लॉगिन सफल!'));

            setTimeout(() => {
                onLoginSuccess();
                onClose();
            }, 500);
        } else {
            throw new Error('Login failed');
        }
    };

    // -------------------------
    // GOOGLE LOGIN — uses NextAuth Google provider
    // -------------------------
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        // Build callback URL: use pending action's returnUrl if available
        let callbackUrl = window.location.href;
        try {
            const stored = localStorage.getItem('post_action_after_login');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.returnUrl) {
                    callbackUrl = `${window.location.origin}${parsed.returnUrl}`;
                }
            }
        } catch {
            // Ignore parse errors, use default
        }

        // signIn with Google redirects the page (no redirect: false)
        await signIn('google', { callbackUrl });
    };

    if (!isOpen) return null;

    // -------------------------
    // UI
    // -------------------------
    const content = (
        <div className={`bg-white rounded-2xl ${isModal ? 'shadow-2xl max-w-md w-full p-6 relative' : 'shadow-xl p-8'}`}>
            {/* Close */}
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            )}

            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">
                    {view === 'signup'
                        ? t('Create Account', 'खाता बनाएं')
                        : view === 'forgot-password'
                            ? t('Reset Password', 'पासवर्ड रीसेट करें')
                            : (title || t('Login', 'लॉगिन'))}
                </h2>
                <p className="text-gray-600 text-sm">
                    {view === 'forgot-password'
                        ? t('Enter your email to receive a reset link', 'रीसेट लिंक प्राप्त करने के लिए अपना ईमेल दर्ज करें')
                        : (customMessage || t('Submit your travel stories', 'अपनी यात्रा कहानियां साझा करें'))}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            {/* Success */}
            {message && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-600 text-sm">{message}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {view === 'signup' && (
                    <input
                        type="text"
                        placeholder={t('Your Name', 'आपका नाम')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full border p-3 rounded focus:outline-none focus:border-royal-blue"
                    />
                )}

                <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border p-3 rounded focus:outline-none focus:border-royal-blue"
                />

                {view !== 'forgot-password' && (
                    <div className="space-y-1">
                        <input
                            type="password"
                            placeholder={t('Password', 'पासवर्ड')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full border p-3 rounded focus:outline-none focus:border-royal-blue"
                        />
                        {view === 'login' && (
                            <button
                                type="button"
                                onClick={() => setView('forgot-password')}
                                className="text-xs text-royal-blue hover:underline"
                            >
                                {t('Forgot password?', 'पासवर्ड भूल गए?')}
                            </button>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-royal-blue text-white p-3 rounded font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50"
                >
                    {loading
                        ? t('Please wait...', 'कृपया प्रतीक्षा करें...')
                        : view === 'signup'
                            ? t('Sign Up', 'साइन अप')
                            : view === 'forgot-password'
                                ? t('Send Reset Link', 'रीसेट लिंक भेजें')
                                : t('Login', 'लॉगिन')}
                </button>

                {view === 'forgot-password' && (
                    <button
                        type="button"
                        onClick={() => setView('login')}
                        className="w-full text-sm text-gray-500 hover:text-royal-blue"
                    >
                        {t('Back to Login', 'लॉगिन पर वापस जाएं')}
                    </button>
                )}
            </form>

            {/* OAuth */}
            {view !== 'forgot-password' && (
                <div className="mt-4 space-y-2">
                    <div className="relative flex items-center justify-center py-2">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase tracking-wider">{t('or', 'या')}</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full border p-3 rounded flex items-center justify-center gap-3 hover:bg-gray-50 transition-all font-semibold"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('Continue with Google', 'Google से जारी रखें')}
                    </button>
                </div>
            )}

            {/* Toggle Signup/Login */}
            {view !== 'forgot-password' && (
                <div className="mt-4 text-center text-sm">
                    <button
                        onClick={() => {
                            setView(view === 'login' ? 'signup' : 'login');
                            setError(null);
                            setMessage(null);
                        }}
                        className="text-royal-blue font-semibold"
                    >
                        {view === 'signup'
                            ? t('Already have an account? Login', 'पहले से खाता है? लॉगिन करें')
                            : t("Don't have an account? Sign up", 'खाता नहीं है? साइन अप करें')}
                    </button>
                </div>
            )}
        </div>
    );

    if (!isModal) return content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="max-w-md w-full">
                {content}
            </div>
        </div>
    );
}
