'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

interface CategoryInfo {
    value: string;
    label: string;
    label_hi: string;
    icon: string;
    gradient: string;
    description: string;
    description_hi: string;
}

const CATEGORIES: CategoryInfo[] = [
    {
        value: 'City Guide',
        label: 'City Guide',
        label_hi: 'शहर गाइड',
        icon: '🏛️',
        gradient: 'from-blue-600 to-indigo-700',
        description: 'In-depth guides to explore Rajasthan\'s royal cities',
        description_hi: 'राजस्थान के शाही शहरों की विस्तृत गाइड',
    },
    {
        value: 'Travel Story',
        label: 'Travel Story',
        label_hi: 'यात्रा कहानी',
        icon: '✈️',
        gradient: 'from-emerald-500 to-teal-700',
        description: 'Real experiences from travelers like you',
        description_hi: 'आपके जैसे यात्रियों के वास्तविक अनुभव',
    },
    {
        value: 'Adventure',
        label: 'Adventure',
        label_hi: 'रोमांच',
        icon: '🏜️',
        gradient: 'from-orange-500 to-red-600',
        description: 'Desert safaris, treks, and adrenaline rushes',
        description_hi: 'रेगिस्तान सफारी, ट्रेक और रोमांच',
    },
    {
        value: 'Food & Culture',
        label: 'Food & Culture',
        label_hi: 'खान-पान और संस्कृति',
        icon: '🍛',
        gradient: 'from-amber-500 to-orange-600',
        description: 'Authentic cuisine and rich cultural traditions',
        description_hi: 'प्रामाणिक व्यंजन और समृद्ध सांस्कृतिक परंपराएं',
    },
    {
        value: 'Budget Travel',
        label: 'Budget Travel',
        label_hi: 'बजट यात्रा',
        icon: '💰',
        gradient: 'from-green-500 to-emerald-700',
        description: 'Smart tips to explore more, spend less',
        description_hi: 'कम खर्च में ज्यादा घूमने के स्मार्ट टिप्स',
    },
    {
        value: 'Luxury',
        label: 'Luxury',
        label_hi: 'लक्ज़री',
        icon: '👑',
        gradient: 'from-yellow-500 via-amber-500 to-yellow-600',
        description: 'Premium stays, palaces, and royal experiences',
        description_hi: 'प्रीमियम स्टे, महल और शाही अनुभव',
    },
];

interface CategoryShowcaseProps {
    categoryCounts: Record<string, number>;
}

export default function CategoryShowcase({ categoryCounts }: CategoryShowcaseProps) {
    const { t } = useLanguage();

    return (
        <section className="py-20 px-4 bg-white relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-desert-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-royal-blue/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-desert-gold/10 rounded-full text-desert-gold text-sm font-semibold mb-4">
                        <span>📚</span>
                        {t('Browse by Interest', 'रुचि के अनुसार देखें')}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {t('Explore by Category', 'श्रेणी के अनुसार खोजें')}
                    </h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        {t(
                            'Find stories that match your travel style — from budget backpacking to luxury palace stays',
                            'अपनी यात्रा शैली से मिलती कहानियां खोजें — बजट बैकपैकिंग से लेकर लक्ज़री पैलेस स्टे तक'
                        )}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {CATEGORIES.map((cat, index) => {
                        const count = categoryCounts[cat.value] || 0;

                        return (
                            <Link
                                key={cat.value}
                                href={`/blogs/?category=${encodeURIComponent(cat.value)}`}
                                id={`category-${cat.value.toLowerCase().replace(/\s+/g, '-')}`}
                                className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                                style={{ animationDelay: `${index * 0.08}s` }}
                            >
                                {/* Gradient accent bar */}
                                <div className={`h-1.5 bg-gradient-to-r ${cat.gradient}`}></div>

                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            {cat.icon}
                                        </div>
                                        {count > 0 && (
                                            <span className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded-full border border-gray-100 group-hover:bg-desert-gold/10 group-hover:text-desert-gold group-hover:border-desert-gold/20 transition-colors">
                                                {count} {count === 1 ? t('blog', 'ब्लॉग') : t('blogs', 'ब्लॉग')}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-royal-blue transition-colors">
                                        {t(cat.label, cat.label_hi)}
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed mb-4">
                                        {t(cat.description, cat.description_hi)}
                                    </p>

                                    <div className="flex items-center text-sm font-semibold text-royal-blue opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-8px] group-hover:translate-x-0">
                                        {t('Explore', 'खोजें')}
                                        <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export { CATEGORIES };
