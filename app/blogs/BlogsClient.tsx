'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import Link from 'next/link';

import BlogCard from '@/components/BlogCard';
import AffiliateProducts from '@/components/AffiliateProducts';
import BackToTop from '@/components/BackToTop';
import { BlogPost } from '@/lib/data';
import { BlogInteractionsProvider } from '@/components/BlogInteractionsProvider';
import { CATEGORIES } from '@/components/CategoryShowcase';

interface BlogsClientProps {
    initialBlogs: BlogPost[];
    destinations: string[];
}

export default function BlogsClient({ initialBlogs, destinations: initialDestinations }: BlogsClientProps) {
    const searchParams = useSearchParams();

    // Ensure 'all' is the first option
    const destinations = ['all', ...initialDestinations];

    const [filter, setFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs);
    const [loading, setLoading] = useState(false);

    // Read ?category= from URL on mount
    useEffect(() => {
        const urlCategory = searchParams.get('category');
        if (urlCategory) {
            setCategoryFilter(urlCategory);
        }
    }, [searchParams]);

    // Sync with server data if it changes
    useEffect(() => {
        setBlogs(initialBlogs);
    }, [initialBlogs]);

    // Memoize filtered blogs to prevent unnecessary re-renders
    const filteredBlogs = useMemo(() => {
        return blogs.filter((blog) => {
            const matchesFilter = filter === 'all' || (blog.destination && blog.destination.toLowerCase().includes(filter));
            const matchesCategory = categoryFilter === 'all' || blog.category === categoryFilter;
            const matchesSearch =
                !search ||
                blog.title_en.toLowerCase().includes(search.toLowerCase()) ||
                blog.excerpt_en.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesCategory && matchesSearch;
        });
    }, [blogs, filter, categoryFilter, search]);


    return (
        <main className="min-h-screen bg-gray-50/30">
            {/* Top Breadcrumbs — Matching the style of individual blog posts */}
            <div className="pt-28 pb-4 px-4">
                <div className="max-w-7xl mx-auto">
                    <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap pb-2 md:pb-0 no-scrollbar">
                        <Link href="/" className="hover:text-royal-blue transition-colors flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Home
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-royal-blue font-bold">Travel Blogs</span>

                    </nav>
                </div>
            </div>

            {/* Page Header */}
            <section className="py-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white relative overflow-hidden">
                {/* Decorative background elements to match premium feel */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-desert-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 font-outfit">Travel Blogs</h1>
                    <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-light">
                        Authentic stories, guides, and tips from travelers exploring the royal heritage of Rajasthan.
                    </p>

                </div>
            </section>

            {/* Filters */}
            <section className="py-6 px-4 bg-white border-b sticky top-16 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3">
                        {destinations.map((dest) => (
                            <button
                                key={dest}
                                onClick={() => setFilter(dest)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === dest
                                    ? 'bg-royal-blue text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {dest === 'all' ? 'All' : dest.charAt(0).toUpperCase() + dest.slice(1)}

                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search blogs..."

                            className="px-4 py-2 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:border-desert-gold focus:ring-2 focus:ring-desert-gold/20 w-64 transition-all"
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

            {/* Category Filters */}
            <section className="py-3 px-4 bg-gray-50/80 border-b">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0">Category:</span>
                        <button
                            onClick={() => setCategoryFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${categoryFilter === 'all'
                                ? 'bg-royal-blue text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            All Categories
                        </button>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setCategoryFilter(cat.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${categoryFilter === cat.value
                                    ? 'bg-royal-blue text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Blogs Grid */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="text-center py-12">Loading...</div>

                    ) : filteredBlogs.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="text-6xl mb-6">📝</div>
                            <p className="text-gray-500 text-xl font-medium mb-2">No blogs found</p>
                            <p className="text-gray-400">Try adjusting your filters or search</p>

                        </div>
                    ) : (
                        <BlogInteractionsProvider blogIds={filteredBlogs.map(b => b.id)}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredBlogs.map((blog) => (
                                    <BlogCard key={blog.id} blog={blog} />
                                ))}
                            </div>
                        </BlogInteractionsProvider>
                    )}

                    {/* Affiliate Products Section */}
                    <div className="mt-16 pt-12 border-t border-gray-200">
                        <AffiliateProducts destination={filter !== 'all' ? filter : undefined} limit={4} />
                    </div>
                </div>
            </section>

            {/* Bottom Navigation Breadcrumbs */}
            <div className="max-w-7xl mx-auto px-4 pb-20 mt-8">
                <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                    <Link href="/" className="text-sm font-bold text-royal-blue hover:text-desert-gold transition-colors flex items-center gap-2">
                        ← Back to Home

                    </Link>
                    <nav className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        <Link href="/" className="hover:text-royal-blue">Home</Link>
                        <span>/</span>
                        <span>Travel Blogs</span>

                    </nav>
                </div>
            </div>

            <BackToTop />
        </main>
    );
}
