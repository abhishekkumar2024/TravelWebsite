'use client';

import Image from 'next/image';
import Link from 'next/link';
import Head from 'next/head';
import { useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

import BlogCard from '@/components/BlogCard';
import DestinationCard from '@/components/DestinationCard';
import { demoBlogs, demoDestinations } from '@/lib/data';

export default function HomePage() {
    const { t } = useLanguage();




    return (
        <>
            <Head>
                <title>{t('Rajasthan Travel Guide', 'राजस्थान यात्रा गाइड')} | Travel Website</title>
                <meta name="description" content={t('Discover Rajasthan travel blogs, destinations, and travel essentials', 'राजस्थान यात्रा ब्लॉग, स्थान और यात्रा सामग्री खोजें')} />

                {/* Preload critical pages for faster navigation */}
                <link rel="preload" href="/blogs" as="document" />
                <link rel="preload" href="/destinations" as="document" />
                <link rel="preload" href="/essentials" as="document" />

                {/* Preload critical resources */}
                <link rel="preload" href="/api/blogs" as="fetch" crossOrigin="anonymous" />
                <link rel="preload" href="/api/destinations" as="fetch" crossOrigin="anonymous" />
            </Head>
            {/* Hero Section */}
            <section
                className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1920&q=80')",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-royal-blue/90 to-deep-maroon/80"></div>

                <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto pt-20">
                    <div className="inline-block glass px-4 py-2 rounded-full text-sm mb-6 animate-fade-in">
                        {t('✨ Your Gateway to Royal Rajasthan', '✨ शाही राजस्थान का आपका प्रवेश द्वार')}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight animate-slide-up">
                        <span>{t('Enjoy the Magic of', 'खोजें जादू')}</span>
                        <br />
                        <span className="gradient-text">{t('Rajasthan', 'राजस्थान का')}</span>
                    </h1>

                    <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto animate-slide-up stagger-1">
                        {t(
                            'Explore majestic forts, vibrant culture, and timeless traditions through stories from travelers like you.',
                            'आप जैसे यात्रियों की कहानियों के माध्यम से भव्य किलों, जीवंत संस्कृति और कालातीत परंपराओं का अन्वेषण करें।'
                        )}
                    </p>

                    <div className="flex gap-4 justify-center flex-wrap animate-slide-up stagger-2">
                        <Link
                            href="/blogs"
                            className="px-8 py-4 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-semibold rounded-lg text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            {t('Explore Blogs', 'ब्लॉग देखें')}
                        </Link>
                        <Link
                            href="/destinations"
                            className="px-8 py-4 border-2 border-desert-gold text-desert-gold font-semibold rounded-lg text-lg hover:bg-desert-gold hover:text-white transition-all"
                        >
                            {t('View Destinations', 'स्थान देखें')}
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-12 mt-12 pt-8 border-t border-white/20 animate-slide-up stagger-3">
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-desert-gold">50+</div>
                            <div className="text-sm opacity-80">{t('Travel Stories', 'यात्रा कहानियां')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-desert-gold">6</div>
                            <div className="text-sm opacity-80">{t('Destinations', 'स्थान')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-desert-gold">10K+</div>
                            <div className="text-sm opacity-80">{t('Happy Readers', 'खुश पाठक')}</div>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow">
                    <svg className="w-8 h-8 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </section>

            {/* Featured Destinations */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                        {t('Featured Destinations', 'प्रमुख स्थान')}
                    </h2>
                    <p className="text-center text-gray-500 text-lg max-w-2xl mx-auto mb-12">
                        {t(
                            'Explore the most beautiful cities in the Land of Kings',
                            'राजाओं की भूमि के सबसे खूबसूरत शहरों का अन्वेषण करें'
                        )}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {demoDestinations.slice(0, 6).map((dest) => (
                            <DestinationCard key={dest.id} destination={dest} />
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            href="/destinations"
                            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-royal-blue text-royal-blue font-semibold rounded-lg hover:bg-royal-blue hover:text-white transition-all"
                        >
                            {t('View All Destinations', 'सभी स्थान देखें')} →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Latest Blogs */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                        {t('Latest Blogs', 'नवीनतम ब्लॉग')}
                    </h2>
                    <p className="text-center text-gray-500 text-lg max-w-2xl mx-auto mb-12">
                        {t('Stories and guides from fellow travelers', 'साथी यात्रियों की कहानियां और गाइड')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {demoBlogs.slice(0, 3).map((blog) => (
                            <BlogCard key={blog.id} blog={blog} />
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            href="/blogs"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            {t('View All Blogs', 'सभी ब्लॉग देखें')} →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Affiliate Banner */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto bg-gradient-to-r from-royal-blue to-deep-maroon rounded-2xl p-8 md:p-12 text-white overflow-hidden relative">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-desert-gold/20 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="max-w-xl">
                            <h3 className="text-2xl md:text-3xl font-bold mb-4">
                                {t('Plan Your Rajasthan Trip', 'अपनी राजस्थान यात्रा की योजना बनाएं')}
                            </h3>
                            <p className="opacity-90">
                                {t(
                                    'Book hotels, tours, and experiences at the best prices. Trusted by thousands of travelers.',
                                    'सर्वोत्तम कीमतों पर होटल, टूर और अनुभव बुक करें। हजारों यात्रियों द्वारा विश्वसनीय।'
                                )}
                            </p>
                        </div>
                        <a
                            href="#"
                            className="px-8 py-4 bg-white text-royal-blue font-bold rounded-lg text-lg hover:bg-gray-100 transition-all whitespace-nowrap"
                        >
                            {t('Book Now →', 'अभी बुक करें →')}
                        </a>
                    </div>
                </div>
            </section>

            {/* Submit CTA */}
            <section className="py-20 px-4 bg-sand">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {t('Share Your Travel Story', 'अपनी यात्रा कहानी साझा करें')}
                    </h2>
                    <p className="text-gray-600 text-lg mb-8">
                        {t(
                            'Been to Rajasthan? Share your experience with our community and inspire others to explore!',
                            'राजस्थान गए हैं? हमारे समुदाय के साथ अपना अनुभव साझा करें और दूसरों को प्रेरित करें!'
                        )}
                    </p>
                    <Link
                        href="/submit"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-royal-blue text-white font-semibold rounded-lg text-lg hover:bg-[#2a4a73] transition-all"
                    >
                        {t('Submit Your Blog →', 'अपना ब्लॉग जमा करें →')}
                    </Link>
                </div>
            </section>
        </>
    );
}
