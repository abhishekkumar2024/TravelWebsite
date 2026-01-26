'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from './LanguageProvider';

export default function Navbar() {
    const { lang, setLang, t } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/camelthar_logo.png"
                        alt="CamelThar Logo"
                        width={40}
                        height={40}
                        className="h-10 w-auto"
                    />
                    <span className="text-xl font-bold text-royal-blue">
                        {t('CamelThar', 'कैमलथार')}
                    </span>
                </Link>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/" className="font-medium text-gray-600 hover:text-royal-blue py-2">
                        {t('Home', 'होम')}
                    </Link>
                    <Link href="/blogs" className="font-medium text-gray-600 hover:text-royal-blue py-2">
                        {t('Blogs', 'ब्लॉग')}
                    </Link>
                    <Link href="/destinations" className="font-medium text-gray-600 hover:text-royal-blue py-2">
                        {t('Destinations', 'स्थान')}
                    </Link>
                    <Link href="/essentials" className="font-medium text-gray-600 hover:text-royal-blue py-2 flex items-center gap-1">
                        <span className="text-sm">🎒</span>
                        {t('Travel Essentials', 'यात्रा आवश्यकताएं')}
                    </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
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

                    <Link
                        href="/submit"
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
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
