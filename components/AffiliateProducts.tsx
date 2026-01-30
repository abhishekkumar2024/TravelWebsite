'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';
import { dataCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';

interface AffiliateProduct {
    id: string;
    name: string;
    description?: string;
    price: string;
    imageUrl: string;
    affiliateLink: string;
    destinations: string[];
    isActive: boolean;
}

interface AffiliateProductsProps {
    destination?: string;
    limit?: number;
}

export default function AffiliateProducts({ destination, limit = 4 }: AffiliateProductsProps) {
    const { t } = useLanguage();
    const [products, setProducts] = useState<AffiliateProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simple demo products for now instead of Firebase
        const demoProducts: AffiliateProduct[] = [
            {
                id: '1',
                name: 'Rajasthan Travel Guide Book',
                price: '₹799',
                imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
                affiliateLink: '#',
                destinations: ['jaipur', 'udaipur'],
                isActive: true,
            },
            {
                id: '2',
                name: 'Desert Safari Hat',
                price: '₹499',
                imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300',
                affiliateLink: '#',
                destinations: ['jaisalmer'],
                isActive: true,
            },
        ];

        let filtered = demoProducts;
        if (destination) {
            filtered = demoProducts.filter(p =>
                p.destinations.includes(destination) || p.destinations.length === 0
            );
        }

        const limited = filtered.slice(0, limit);
        dataCache.set(CACHE_KEYS.PRODUCTS, limited, CACHE_DURATION.MEDIUM);
        setProducts(limited);
        setLoading(false);
    }, [destination, limit]);

    if (loading) {
        return (
            <div className="animate-pulse flex gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-48 h-64 bg-gray-200 rounded-xl"></div>
                ))}
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <section className="py-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                    {t('Recommended Products', 'अनुशंसित उत्पाद')} ✨
                </h3>
                <span className="text-sm text-gray-500">
                    {t('Affiliate links', 'सहबद्ध लिंक')}
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map((product) => (
                    <a
                        key={product.id}
                        href={product.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-desert-gold/30 transition-all duration-300"
                    >
                        <div className="aspect-square bg-gray-50 overflow-hidden">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                                    <svg className="w-12 h-12 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <h4 className="font-medium text-gray-800 text-sm line-clamp-2 mb-1 group-hover:text-royal-blue transition-colors">
                                {product.name}
                            </h4>
                            <div className="flex items-center justify-between">
                                <span className="text-desert-gold font-bold">{product.price}</span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Shop
                                </span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}
