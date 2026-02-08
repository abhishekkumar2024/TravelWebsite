'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageProvider';
import { supabase } from '@/lib/supabaseClient';
import { getAuthorProfile } from '@/lib/supabaseAuthors';

export default function Navbar() {
    const { lang, setLang, t, mounted } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const navRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Check initial user
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            if (user) loadAvatar(user.id);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadAvatar(session.user.id);
            } else {
                setAvatarUrl(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadAvatar = async (userId: string) => {
        const profile = await getAuthorProfile(userId);
        if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
        }
    };

    // Close mobile menu when clicking outside
    useEffect(() => {
        if (!mobileMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!navRef.current) return;
            if (!navRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [mobileMenuOpen]);

    return (
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-3 items-center">
                {/* Logo Section - Left */}
                <div className="flex justify-start">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/logo-sm.webp"
                            alt="CamelThar Logo"
                            width={48}
                            height={48}
                            className="h-12 w-auto rounded-full"
                        />
                        <span className="text-xl font-bold text-royal-blue whitespace-nowrap">
                            {t('CamelThar', 'कैमलथार')}
                        </span>
                    </Link>
                </div>

                {/* Nav Links - Center (Desktop) */}
                <div className="hidden md:flex items-center justify-center gap-8">
                    <Link href="/" className="font-medium text-gray-600 hover:text-royal-blue transition-colors">
                        {t('Home', 'होम')}
                    </Link>
                    <Link href="/blogs" className="font-medium text-gray-600 hover:text-royal-blue transition-colors">
                        {t('Blogs', 'ब्लॉग')}
                    </Link>
                    <Link href="/destinations" className="font-medium text-gray-600 hover:text-royal-blue transition-colors">
                        {t('Destinations', 'स्थान')}
                    </Link>
                    <Link href="/essentials" className="font-medium text-gray-600 hover:text-royal-blue transition-colors flex items-center gap-1">
                        <span className="text-sm">🎒</span>
                        {t('Travel Essentials', 'यात्रा आवश्यकताएं')}
                    </Link>
                </div>

                {/* Actions Section - Right */}
                <div className="flex justify-end items-center gap-4">
                    {/* Language Toggle */}
                    <div className="flex bg-gray-200 rounded-full p-1">
                        <button
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${lang === 'en' ? 'bg-white text-royal-blue shadow-sm' : 'text-gray-500'
                                }`}
                            onClick={() => setLang('en')}
                        >
                            EN
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${lang === 'hi' ? 'bg-white text-royal-blue shadow-sm' : 'text-gray-500'
                                }`}
                            onClick={() => setLang('hi')}
                        >
                            हि
                        </button>
                    </div>

                    {mounted && user && (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/my-blogs"
                                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all text-sm"
                            >
                                {avatarUrl ? (
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm">
                                        <Image
                                            src={avatarUrl}
                                            alt="Profile"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : null}
                                {t('My Blogs', 'मेरे ब्लॉग')}
                            </Link>
                            <button
                                onClick={async () => {
                                    await supabase.auth.signOut({ scope: 'local' });
                                    window.location.reload();
                                }}
                                className="hidden sm:inline-flex items-center justify-center w-9 h-9 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                                title={t('Logout', 'लॉगआउट')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <Link
                        href="/submit"
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
                    >
                        {t('Submit Blog', 'ब्लॉग जमा करें')}
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden flex flex-col gap-1.5 p-2"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <span className="w-6 h-0.5 bg-gray-700 transition-all"></span>
                        <span className="w-6 h-0.5 bg-gray-700 transition-all"></span>
                        <span className="w-6 h-0.5 bg-gray-700 transition-all"></span>
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white px-4 py-4 shadow-lg">
                    <div className="flex flex-col gap-4">
                        <Link
                            href="/"
                            className="text-lg py-2 px-4 rounded-lg hover:bg-gray-100"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {t('Home', 'होम')}
                        </Link>
                        <Link
                            href="/blogs"
                            className="text-lg py-2 px-4 rounded-lg hover:bg-gray-100"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {t('Blogs', 'ब्लॉग')}
                        </Link>
                        <Link
                            href="/destinations"
                            className="text-lg py-2 px-4 rounded-lg hover:bg-gray-100"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {t('Destinations', 'स्थान')}
                        </Link>
                        <Link
                            href="/essentials"
                            className="text-lg py-2 px-4 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span>🎒</span>
                            {t('Travel Essentials', 'यात्रा आवश्यकताएं')}
                        </Link>

                        {mounted && user && (
                            <>
                                <Link
                                    href="/my-blogs"
                                    className="text-lg py-2 px-4 rounded-lg hover:bg-gray-100 font-medium text-royal-blue"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('My Blogs', 'मेरे ब्लॉग')}
                                </Link>
                                <button
                                    className="text-lg py-2 px-4 rounded-lg hover:bg-red-50 font-medium text-red-600 text-left flex items-center gap-2"
                                    onClick={async () => {
                                        await supabase.auth.signOut({ scope: 'local' });
                                        setMobileMenuOpen(false);
                                        window.location.reload();
                                    }}
                                >
                                    <span>🚪</span>
                                    {t('Logout', 'लॉगआउट')}
                                </button>
                            </>
                        )}

                        <Link
                            href="/submit"
                            className="text-lg py-2 px-4 rounded-lg bg-desert-gold text-white text-center"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {t('Submit Blog', 'ब्लॉग जमा करें')}
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
