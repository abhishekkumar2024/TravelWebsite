'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

import { demoDestinations } from '@/lib/data';

export default function DestinationsPage() {
    const { t, lang } = useLanguage();




    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {t('Explore Rajasthan', 'राजस्थान का अन्वेषण करें')}
                    </h1>
                    <p className="text-lg opacity-90 max-w-2xl mx-auto">
                        {t(
                            'Discover the majestic cities of the Land of Kings',
                            'राजाओं की भूमि के भव्य शहरों की खोज करें'
                        )}
                    </p>
                </div>
            </section>

            {/* Destinations Grid */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {demoDestinations.map((dest) => {
                            const name = lang === 'hi' ? dest.name_hi : dest.name_en;
                            const tagline = lang === 'hi' ? dest.tagline_hi : dest.tagline_en;
                            const description = lang === 'hi' ? dest.description_hi : dest.description_en;

                            return (
                                <div
                                    key={dest.id}
                                    id={dest.id}
                                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="relative h-56 overflow-hidden">
                                        <Image
                                            src={dest.coverImage}
                                            alt={name}
                                            fill
                                            className="object-cover"
                                            quality={75}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <h3 className="text-2xl font-bold text-white">{name}</h3>
                                            <p className="text-desert-gold text-sm">{tagline}</p>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-600 text-sm mb-4">{description}</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {dest.attractions.slice(0, 3).map((attraction) => (
                                                <span
                                                    key={attraction}
                                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                                >
                                                    {attraction}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                            <div className="text-sm text-gray-500">
                                                <span className="font-medium">
                                                    {t('Best Time', 'सबसे अच्छा समय')}:
                                                </span>{' '}
                                                {dest.bestTime}
                                            </div>
                                            <Link
                                                href={`/blogs?destination=${dest.id}`}
                                                className="text-desert-gold font-semibold text-sm hover:underline"
                                            >
                                                {dest.blogCount} {t('blogs', 'ब्लॉग')} →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Travel Tips */}
            <section className="py-16 px-4 bg-sand">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        {t('Best Time to Visit', 'घूमने का सबसे अच्छा समय')}
                    </h2>
                    <p className="text-gray-600 mb-8">
                        {t(
                            'October to March is the ideal time to explore Rajasthan when the weather is pleasant and perfect for sightseeing.',
                            'अक्टूबर से मार्च राजस्थान घूमने का आदर्श समय है जब मौसम सुहावना होता है।'
                        )}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl">
                            <div className="text-4xl mb-3">🌡️</div>
                            <h3 className="font-bold mb-2">{t('Weather', 'मौसम')}</h3>
                            <p className="text-gray-600 text-sm">
                                {t('15°C - 30°C in winter, comfortable for travel', 'सर्दियों में 15°C - 30°C, यात्रा के लिए आरामदायक')}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl">
                            <div className="text-4xl mb-3">🎪</div>
                            <h3 className="font-bold mb-2">{t('Festivals', 'त्योहार')}</h3>
                            <p className="text-gray-600 text-sm">
                                {t('Pushkar Fair, Desert Festival, Holi', 'पुष्कर मेला, रेगिस्तान उत्सव, होली')}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl">
                            <div className="text-4xl mb-3">✈️</div>
                            <h3 className="font-bold mb-2">{t('How to Reach', 'कैसे पहुंचें')}</h3>
                            <p className="text-gray-600 text-sm">
                                {t('Airports in Jaipur, Udaipur, Jodhpur', 'जयपुर, उदयपुर, जोधपुर में हवाई अड्डे')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
