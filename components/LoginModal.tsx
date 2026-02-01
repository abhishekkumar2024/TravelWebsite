'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from './LanguageProvider';
import { ensureAuthorExists } from '@/lib/supabaseAuthors';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export default function LoginModal({
    isOpen,
    onClose,
    onLoginSuccess,
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
            let errorMsg = err.message;
            if (errorMsg.includes('Email not confirmed')) {
                errorMsg = t(
                    'Email not confirmed. Please check your inbox for the verification link.',
                    'ईमेल की पुष्टि नहीं हुई है। कृपया सत्यापन लिंक के लिए अपना इनबॉक्स जांचें।'
                );
            }
            setError(errorMsg || t('Something went wrong', 'कुछ गलत हो गया'));
            setLoading(false);
        }
    };

    // -------------------------
    // SIGN UP
    // -------------------------
    const handleSignup = async () => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name || email.split('@')[0],
                    full_name: name || email.split('@')[0]
                },
            },
        });

        if (error) throw error;

        setMessage(
            t(
                'Verification email sent! Please check your inbox and confirm your email, then login here.',
                'सत्यापन ईमेल भेज दिया गया है! कृपया अपना इनबॉक्स जांचें और ईमेल की पुष्टि करें, फिर यहां लॉगिन करें।'
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
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        setMessage(
            t(
                'Password reset link sent! Please check your email.',
                'पासवर्ड रीसेट लिंक भेज दिया गया है! कृपया अपना ईमेल जांचें।'
            )
        );
        setLoading(false);
    };

    // -------------------------
    // LOGIN (EMAIL/PASSWORD)
    // -------------------------
    const handleLogin = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        const user = data.user;
        if (!user) return;

        // Ensure author exists (prevents FK error on first login)
        await ensureAuthorExists();

        setMessage(t('Login successful!', 'लॉगिन सफल!'));

        setTimeout(() => {
            onLoginSuccess();
            onClose();
        }, 500);
    };

    // -------------------------
    // MICROSOFT LOGIN
    // -------------------------
    const handleMicrosoftLogin = async () => {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                redirectTo: `${window.location.origin}/submit`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // -------------------------
    // UI
    // -------------------------
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">
                        {view === 'signup'
                            ? t('Create Account', 'खाता बनाएं')
                            : view === 'forgot-password'
                                ? t('Reset Password', 'पासवर्ड रीसेट करें')
                                : t('Login', 'लॉगिन')}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        {view === 'forgot-password'
                            ? t('Enter your email to receive a reset link', 'रीसेट लिंक प्राप्त करने के लिए अपना ईमेल दर्ज करें')
                            : t('Submit your travel stories', 'अपनी यात्रा कहानियां साझा करें')}
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
                            onClick={handleMicrosoftLogin}
                            className="w-full border p-3 rounded flex items-center justify-center gap-3 hover:bg-gray-50 transition-all font-semibold"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 23 23">
                                <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                                <path fill="#f35325" d="M1 1h10v10H1z" />
                                <path fill="#81bc06" d="M12 1h10v10H12z" />
                                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                <path fill="#ffba08" d="M12 12h10v10H12z" />
                            </svg>
                            {t('Continue with Microsoft', 'Microsoft से जारी रखें')}
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
        </div>
    );
}
