'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

export interface AffiliateProduct {
    id: string;
    name: string;
    description?: string;
    price: string;
    imageUrl: string;
    affiliateLink: string;
    destinations: string[];
    isActive: boolean;
}

interface EssentialsContentProps {
    products: AffiliateProduct[];
}

const categories = [
    { id: 'all', name: 'All Essentials', nameHi: 'सभी आवश्यक', icon: '🎒', color: 'from-purple-500 to-pink-500' },
    { id: 'jaipur', name: 'Jaipur', nameHi: 'जयपुर', icon: '🏰', color: 'from-pink-500 to-rose-500' },
    { id: 'udaipur', name: 'Udaipur', nameHi: 'उदयपुर', icon: '🌊', color: 'from-blue-500 to-cyan-500' },
    { id: 'jaisalmer', name: 'Jaisalmer', nameHi: 'जैसलमेर', icon: '🏜️', color: 'from-amber-500 to-orange-500' },
    { id: 'jodhpur', name: 'Jodhpur', nameHi: 'जोधपुर', icon: '💙', color: 'from-blue-600 to-indigo-500' },
    { id: 'pushkar', name: 'Pushkar', nameHi: 'पुष्कर', icon: '🕉️', color: 'from-orange-500 to-red-500' },
];

const essentialTips = [
    { icon: '👒', title: 'Sun Protection', titleHi: 'धूप से सुरक्षा', desc: 'Hat, sunscreen, sunglasses are must!' },
    { icon: '💧', title: 'Stay Hydrated', titleHi: 'हाइड्रेटेड रहें', desc: 'Carry reusable water bottles' },
    { icon: '📸', title: 'Capture Memories', titleHi: 'यादें संजोएं', desc: 'Camera gear for stunning shots' },
    { icon: '🎒', title: 'Light Backpack', titleHi: 'हल्का बैकपैक', desc: 'Easy to carry while exploring' },
];

export default function EssentialsContent({ products }: EssentialsContentProps) {
    const { t, lang } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState('all');


    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.destinations.includes(selectedCategory) || p.destinations.length === 0);

    return (
        <>
            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
                        <span className="animate-pulse">🛍️</span>
                        {t('Affiliate Products', 'सहबद्ध उत्पाद')}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        {t('Travel Essentials', 'यात्रा आवश्यकताएं')} ✨
                    </h1>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
                        {t(
                            'Pack smart for your Rajasthan adventure! Handpicked gear and essentials for every destination.',
                            'अपने राजस्थान साहसिक यात्रा के लिए स्मार्ट पैकिंग करें! हर गंतव्य के लिए चुनिंदा गियर।'
                        )}
                    </p>

                    {/* Quick Tips */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {essentialTips.map((tip, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all">
                                <span className="text-3xl mb-2 block">{tip.icon}</span>
                                <p className="font-semibold text-sm">{tip.title}</p>

                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Category Tabs */}
            <section className="py-8 px-4 bg-white border-b sticky top-16 z-40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id
                                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                {cat.name}

                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Products Grid */}
            <section className="py-12 px-4 bg-gradient-to-b from-white to-amber-50">
                <div className="max-w-7xl mx-auto">
                    {products.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">🎒</div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">
                                {t('No products yet', 'अभी तक कोई उत्पाद नहीं')}
                            </h3>
                            <p className="text-gray-500">
                                {t('Check back soon for amazing travel gear!', 'जल्द ही शानदार ट्रैवल गियर के लिए वापस आएं!')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {selectedCategory === 'all'
                                        ? t('All Products', 'सभी उत्पाद')
                                        : `${categories.find(c => c.id === selectedCategory)?.name} ${t('Essentials', 'आवश्यकताएं')}`
                                    }
                                </h2>
                                <span className="text-gray-500">
                                    {filteredProducts.length} {t('items', 'आइटम')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map((product) => (
                                    <a
                                        key={product.id}
                                        href={product.affiliateLink}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                                    >
                                        <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden relative">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        target.style.display = 'none';
                                                        const fallback = target.nextElementSibling as HTMLElement;
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className="w-full h-full items-center justify-center" style={{ display: product.imageUrl ? 'none' : 'flex' }}>
                                                <span className="text-5xl">🎒</span>
                                            </div>
                                            {/* Hover overlay with Buy Now */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                                <span className="px-4 py-2 bg-white text-amber-600 font-semibold rounded-full shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                    </svg>
                                                    {t('Buy Now', 'अभी खरीदें')}
                                                </span>
                                            </div>
                                            {/* Affiliate badge */}
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-medium shadow-md">
                                                {t('Affiliate', 'सहबद्ध')}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                                                {product.name}
                                            </h3>
                                            {/* Product description */}
                                            {product.description && (
                                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                                    {product.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                                                    {product.price}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    {product.destinations.slice(0, 2).map(d => (
                                                        <span key={d} className="px-2 py-0.5 bg-gray-100 rounded-full capitalize">
                                                            {d}
                                                        </span>
                                                    ))}
                                                </span>
                                            </div>
                                            {/* Buy button at bottom */}
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <div className="w-full py-2 text-center bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg group-hover:from-amber-600 group-hover:to-orange-600 transition-all flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                    {t('Shop Now', 'अभी खरीदें')}
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Trust Banner */}
            <section className="py-12 px-4 bg-gradient-to-r from-royal-blue to-deep-maroon text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-2xl font-bold mb-4">
                        {t('Why Trust Our Picks?', 'हमारी पसंद पर भरोसा क्यों करें?')}
                    </h3>
                    <p className="opacity-90 mb-6">
                        {t(
                            'We personally test and use every product we recommend. As travelers ourselves, we know what works!',
                            'हम व्यक्तिगत रूप से हर उत्पाद का परीक्षण और उपयोग करते हैं। यात्री होने के नाते, हम जानते हैं क्या काम करता है!'
                        )}
                    </p>
                    <div className="flex items-center justify-center gap-8 text-sm opacity-80">
                        <div className="flex items-center gap-2">
                            <span>✅</span> {t('Tested by travelers', 'यात्रियों द्वारा परीक्षित')}
                        </div>
                        <div className="flex items-center gap-2">
                            <span>🌟</span> {t('Top rated', 'शीर्ष रेटेड')}
                        </div>
                        <div className="flex items-center gap-2">
                            <span>💰</span> {t('Best prices', 'सर्वोत्तम कीमत')}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
