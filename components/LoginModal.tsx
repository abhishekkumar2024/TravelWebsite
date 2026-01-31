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

    const [isSignUp, setIsSignUp] = useState(false);
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
            if (isSignUp) {
                await handleSignup();
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

        // Note: If email confirmation is ON, this insert might fail due to RLS.
        // That's okay, because ensureAuthorExists() will catch it later when they log in.
        if (data.user) {
            try {
                await supabase.from('authors').insert({
                    id: data.user.id,
                    name: name || email.split('@')[0],
                    email: email,
                });
            } catch (e) {
                console.log('Author creation deferred until email confirmation');
            }
        }

        setMessage(
            t(
                'Verification email sent! Please check your inbox and confirm your email before logging in.',
                'सत्यापन ईमेल भेज दिया गया है! कृपया अपना इनबॉक्स जांचें और लॉगिन करने से पहले अपने ईमेल की पुष्टि करें।'
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
    // GOOGLE LOGIN
    // -------------------------
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/submit`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
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
                        {isSignUp ? t('Create Account', 'खाता बनाएं') : t('Login', 'लॉगिन')}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        {t('Submit your travel stories', 'अपनी यात्रा कहानियां साझा करें')}
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
                    {isSignUp && (
                        <input
                            type="text"
                            placeholder={t('Your Name', 'आपका नाम')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full border p-3 rounded"
                        />
                    )}

                    <input
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full border p-3 rounded"
                    />

                    <input
                        type="password"
                        placeholder={t('Password', 'पासवर्ड')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full border p-3 rounded"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-3 rounded font-semibold"
                    >
                        {loading
                            ? t('Please wait...', 'कृपया प्रतीक्षा करें...')
                            : isSignUp
                                ? t('Sign Up', 'साइन अप')
                                : t('Login', 'लॉगिन')}
                    </button>
                </form>

                {/* OAuth */}
                <div className="mt-4 space-y-2">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full border p-3 rounded"
                    >
                        {t('Continue with Google', 'Google से जारी रखें')}
                    </button>

                    <button
                        onClick={handleMicrosoftLogin}
                        className="w-full border p-3 rounded"
                    >
                        {t('Continue with Microsoft', 'Microsoft से जारी रखें')}
                    </button>
                </div>

                {/* Toggle */}
                <div className="mt-4 text-center text-sm">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setMessage(null);
                        }}
                        className="text-blue-600"
                    >
                        {isSignUp
                            ? t('Already have an account? Login', 'पहले से खाता है? लॉगिन करें')
                            : t("Don't have an account? Sign up", 'खाता नहीं है? साइन अप करें')}
                    </button>
                </div>
            </div>
        </div>
    );
}
