'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from './LanguageProvider';

interface AdminLoginProps {
    onLoginSuccess: () => void;
    onCancel?: () => void;
}

export default function AdminLogin({ onLoginSuccess, onCancel }: AdminLoginProps) {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            if (data.user) {
                const user = data.user as any;
                const role = user.role ||
                    user.app_metadata?.role ||
                    user.user_metadata?.role ||
                    user.raw_app_meta_data?.role;

                console.log('Admin login attempt:', { email: user.email, role });

                if (role !== 'admin') {
                    await supabase.auth.signOut();
                    setError(`${t('Access denied. Admin privileges required.', 'अस्वीकृत पहुंच। व्यवस्थापक विशेषाधिकार आवश्यक हैं।')} (Detected Role: ${role || 'none'})`);
                    setLoading(false);
                    return;
                }

                onLoginSuccess();
            }
        } catch (err: any) {
            setError(err.message || t('Login failed', 'लॉगिन विफल'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-royal-blue to-deep-maroon rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {t('Admin Login', 'व्यवस्थापक लॉगिन')}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        {t('Access admin dashboard', 'व्यवस्थापक डैशबोर्ड तक पहुंच')}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('Email', 'ईमेल')}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue"
                            placeholder="admin@example.com"
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
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('Logging in...', 'लॉगिन हो रहा है...') : t('Login', 'लॉगिन')}
                    </button>

                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                        >
                            {t('Cancel', 'रद्द करें')}
                        </button>
                    )}
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        {t('Only users with admin role can access this page', 'केवल व्यवस्थापक भूमिका वाले उपयोगकर्ता इस पृष्ठ तक पहुंच सकते हैं')}
                    </p>
                </div>
            </div>
        </div>
    );
}
