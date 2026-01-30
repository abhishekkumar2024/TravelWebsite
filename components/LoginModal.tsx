'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from './LanguageProvider';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
    const { t } = useLanguage();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setEmail('');
            setPassword('');
            setName('');
            setError(null);
            setMessage(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                // Sign up
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                        },
                    },
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    setMessage(
                        t(
                            'Account created! Please check your email to verify your account.',
                            'खाता बनाया गया! कृपया अपना खाता सत्यापित करने के लिए अपना ईमेल जांचें।'
                        )
                    );
                    // Auto login after signup
                    setTimeout(() => {
                        handleLogin();
                    }, 1000);
                }
            } else {
                // Sign in
                await handleLogin();
            }
        } catch (err: any) {
            setError(err.message || t('An error occurred', 'एक त्रुटि हुई'));
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            if (data.user) {
                setMessage(t('Login successful!', 'लॉगिन सफल!'));
                setTimeout(() => {
                    onLoginSuccess();
                    onClose();
                }, 500);
            }
        } catch (err: any) {
            setError(err.message || t('Login failed', 'लॉगिन विफल'));
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            const { error: googleError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/submit`,
                },
            });

            if (googleError) throw googleError;
        } catch (err: any) {
            setError(err.message || t('Google login failed', 'Google लॉगिन विफल'));
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-royal-blue mb-2">
                        {isSignUp ? t('Create Account', 'खाता बनाएं') : t('Login', 'लॉगिन')}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        {isSignUp
                            ? t('Sign up to submit your travel stories', 'अपनी यात्रा कहानियां जमा करने के लिए साइन अप करें')
                            : t('Login to submit your travel stories', 'अपनी यात्रा कहानियां जमा करने के लिए लॉगिन करें')}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {message && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm">{message}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('Your Name', 'आपका नाम')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={isSignUp}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                placeholder={t('Enter your name', 'अपना नाम दर्ज करें')}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('Email', 'ईमेल')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('Password', 'पासवर्ड')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                            placeholder={t('Enter password', 'पासवर्ड दर्ज करें')}
                        />
                        {isSignUp && (
                            <p className="text-xs text-gray-500 mt-1">
                                {t('Password must be at least 6 characters', 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए')}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading
                            ? t('Please wait...', 'कृपया प्रतीक्षा करें...')
                            : isSignUp
                                ? t('Sign Up', 'साइन अप करें')
                                : t('Login', 'लॉगिन')}
                    </button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-4 text-sm text-gray-500">{t('OR', 'या')}</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    {t('Continue with Google', 'Google के साथ जारी रखें')}
                </button>

                {/* Toggle Sign Up/Login */}
                <div className="mt-6 text-center text-sm">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                            setMessage(null);
                        }}
                        className="text-royal-blue hover:underline"
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
