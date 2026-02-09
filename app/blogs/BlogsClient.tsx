'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

import BlogCard from '@/components/BlogCard';
import AffiliateProducts from '@/components/AffiliateProducts';
import { BlogPost } from '@/lib/data';




interface BlogsClientProps {
    initialBlogs: BlogPost[];
    destinations: string[];
}

export default function BlogsClient({ initialBlogs, destinations: initialDestinations }: BlogsClientProps) {
    const { t, lang } = useLanguage();

    // Ensure 'all' is the first option
    const destinations = ['all', ...initialDestinations];

    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs);
    // Since we pass initialBlogs from server, loading is false initially, 
    // unless we want to show loading during client-side hydration or updates.
    // However, fast initial paint is better.
    const [loading, setLoading] = useState(false);

    // Sync with server data if it changes or if we want to refetch client-side (optional)
    useEffect(() => {
        setBlogs(initialBlogs);
    }, [initialBlogs]);

    // Memoize filtered blogs to prevent unnecessary re-renders
    const filteredBlogs = useMemo(() => {
        const result = blogs.filter((blog) => {
            const matchesFilter = filter === 'all' || (blog.destination && blog.destination.toLowerCase().includes(filter));
            const title = lang === 'hi' ? blog.title_hi : blog.title_en;
            const excerpt = lang === 'hi' ? blog.excerpt_hi : blog.excerpt_en;
            const matchesSearch =
                !search ||
                title.toLowerCase().includes(search.toLowerCase()) ||
                excerpt.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        return result;
    }, [blogs, filter, search, lang]);

    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {t('Travel Blogs', 'यात्रा ब्लॉग')}
                    </h1>
                    <p className="text-lg opacity-90 max-w-2xl mx-auto">
                        {t(
                            'Stories, guides, and tips from travelers exploring Rajasthan',
                            'राजस्थान की खोज करने वाले यात्रियों की कहानियां, गाइड और टिप्स'
                        )}
                    </p>
                </div>
            </section>

            {/* Filters */}
            <section className="py-8 px-4 bg-white border-b sticky top-16 z-40">
                <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3">
                        {destinations.map((dest) => (
                            <button
                                key={dest}
                                onClick={() => setFilter(dest)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === dest
                                    ? 'bg-royal-blue text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {dest === 'all' ? t('All', 'सभी') : dest.charAt(0).toUpperCase() + dest.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('Search blogs...', 'ब्लॉग खोजें...')}
                            className="px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold w-64"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>
            </section>

            {/* Blogs Grid */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="text-center py-12">{t('Loading...', 'लोड हो रहा है...')}</div>
                    ) : filteredBlogs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4">📝</div>
                            <p className="text-gray-500 text-lg mb-2">{t('No blogs found', 'कोई ब्लॉग नहीं मिला')}</p>
                            <p className="text-gray-400 text-sm">
                                {t('Try adjusting your filters or search', 'अपने फ़िल्टर या खोज को समायोजित करने का प्रयास करें')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBlogs.map((blog) => (
                                <BlogCard key={blog.id} blog={blog} />
                            ))}
                        </div>
                    )}

                    {/* Affiliate Products Section */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <AffiliateProducts destination={filter !== 'all' ? filter : undefined} limit={4} />
                    </div>
                </div>
            </section>
        </>
    );
}
