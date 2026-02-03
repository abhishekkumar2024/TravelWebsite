'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/components/LanguageProvider';
import LoginModal from '@/components/LoginModal';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);

    const redirectTo = searchParams.get('redirectTo') || '/';

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push(redirectTo);
            } else {
                setLoading(false);
            }
        };
        checkUser();
    }, [router, redirectTo]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-sand">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-royal-blue/5 to-deep-maroon/5 px-4">
            <div className="max-w-md w-full">
                <LoginModal
                    isOpen={true}
                    onClose={() => router.push('/')}
                    onLoginSuccess={() => router.push(redirectTo)}
                    isModal={false}
                />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-sand">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
