'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

import BlogCard from '@/components/BlogCard';
import AffiliateProducts from '@/components/AffiliateProducts';
import { demoBlogs, BlogPost } from '@/lib/data';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';

const destinations = ['all', 'jaipur', 'udaipur', 'jaisalmer', 'jodhpur', 'pushkar'];

// Optimized batch sizes for faster initial load
const INITIAL_BATCH_SIZE = 3; // Reduced to 3 for ultra-fast first load
const SUBSEQUENT_BATCH_SIZE = 9;

// Skeleton loader component for fast initial render
function BlogCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
            <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
            <div className="p-6">
                <div className="flex gap-4 mb-3">
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded mb-2 w-full"></div>
                <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded mb-2 w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-gray-100">
                    <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    );
}

export default function BlogsPage() {
    const { t, lang } = useLanguage();

    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {

        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        console.log('=== fetchBlogs called ===');
        setLoading(true);

        try {


            try {
                // BACKGROUND FETCH: Fetch real blogs without blocking UI
                // Add timeout to prevent long waits
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Query timeout')), 5000); // 5 second timeout
                });

                const queryPromise = getDocs(query(
                    collection(db, 'blogs'),
                    where('status', '==', 'approved'),
                    orderBy('createdAt', 'desc'),
                    limit(INITIAL_BATCH_SIZE)
                ));

                const snapshot = await Promise.race([queryPromise, timeoutPromise]) as any;
                console.log('Firestore query completed, docs:', snapshot.docs.length);

                // Get the last visible document for pagination
                const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
                setLastVisible(lastVisibleDoc);
                setHasMore(snapshot.docs.length === INITIAL_BATCH_SIZE);

                const firestoreBlogs = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                    publishedAt: doc.data().createdAt?.toDate() || new Date(),
                })) as BlogPost[];

                // Replace demo blogs with real blogs if we have them
                if (firestoreBlogs.length > 0) {
                    console.log('=== Replacing with real blogs ===');
                    console.log('Real blogs count:', firestoreBlogs.length);
                    // Deduplicate by ID
                    const uniqueBlogs = firestoreBlogs.filter((blog, index, self) =>
                        index === self.findIndex((b) => b.id === blog.id)
                    );
                    setBlogs(uniqueBlogs);
                    // Store in cache for 10 minutes
                    dataCache.set(CACHE_KEYS.BLOGS, uniqueBlogs, CACHE_DURATION.MEDIUM);
                    console.log('Real blogs set in state');
                } else {
                    console.log('=== No real blogs found, using demo blogs ===');
                    setBlogs(demoBlogs);
                }
            } catch (error) {
                console.error('=== Error fetching blogs, using fallback ===', error);
                setBlogs(demoBlogs);
                setHasMore(false);
            }
            console.log('=== fetchBlogs complete ===');
        } catch (error) {
            console.error('=== Critical error in fetchBlogs, using fallback ===', error);
            setBlogs(demoBlogs);
            setLoading(false);
            setHasMore(false);
        }
        setLoading(false);
    };

    const loadMoreBlogs = async () => {
        if (!lastVisible) return;
        setLoadingMore(true);

        try {
            const nextQuery = query(
                collection(db, 'blogs'),
                where('status', '==', 'approved'),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible),
                limit(SUBSEQUENT_BATCH_SIZE)
            );

            const snapshot = await getDocs(nextQuery);
            const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            setLastVisible(lastVisibleDoc);
            setHasMore(snapshot.docs.length === SUBSEQUENT_BATCH_SIZE);

            const newBlogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                publishedAt: doc.data().createdAt?.toDate() || new Date(),
            })) as BlogPost[];

            setBlogs(prev => [...prev, ...newBlogs]);
        } catch (error) {
            console.error('Error loading more blogs:', error);
        }
        setLoadingMore(false);
    };

    // Memoize filtered blogs to prevent unnecessary re-renders
    const filteredBlogs = useMemo(() => {
        console.log('=== Filtering blogs ===');
        console.log('Current blogs in state:', blogs.length);
        console.log('Current blog IDs:', blogs.map(b => b.id));
        console.log('Filter:', filter, 'Search:', search);

        const result = blogs.filter((blog) => {
            const matchesFilter = filter === 'all' || blog.destination === filter;
            const title = lang === 'hi' ? blog.title_hi : blog.title_en;
            const excerpt = lang === 'hi' ? blog.excerpt_hi : blog.excerpt_en;
            const matchesSearch =
                !search ||
                title.toLowerCase().includes(search.toLowerCase()) ||
                excerpt.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        console.log('Filtered blogs count:', result.length);
        console.log('Filtered blog IDs:', result.map(b => b.id));
        console.log('=== Filtering complete ===');

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
                        // Show skeleton loaders while loading - renders instantly
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <BlogCardSkeleton key={i} />
                            ))}
                        </div>
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

                    {/* Load More Button */}
                    {!loading && hasMore && filter === 'all' && !search && (
                        <div className="mt-12 text-center">
                            <button
                                onClick={loadMoreBlogs}
                                disabled={loadingMore}
                                className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                                        {t('Loading...', 'लोड हो रहा है...')}
                                    </>
                                ) : (
                                    <>
                                        {t('Load More', 'और लोड करें')}
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </>
                                )}
                            </button>
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

