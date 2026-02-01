
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { fetchUserBlogs } from '@/lib/supabaseBlogs';
import { BlogPost } from '@/lib/data';
import { supabase } from '@/lib/supabaseClient';

export default function MyBlogsPage() {
    const { t, lang } = useLanguage();
    const router = useRouter();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/submit?login=true');
            return;
        }
        setUser(user);
        loadBlogs();
    };

    const loadBlogs = async () => {
        try {
            const userBlogs = await fetchUserBlogs();
            setBlogs(userBlogs);
        } catch (error) {
            console.error('Error loading blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'published':
            case 'approved':
                return t('Published', 'प्रकाशित');
            case 'rejected':
                return t('Rejected', 'अस्वीकृत');
            default:
                return t('Pending Review', 'समीक्षाधीन');
        }
    };

    if (loading) {
        return (
            <div className="pt-32 pb-20 px-4 max-w-7xl mx-auto text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue mx-auto"></div>
                <p className="mt-4 text-gray-600">{t('Loading your blogs...', 'आपके ब्लॉग लोड हो रहे हैं...')}</p>
            </div>
        );
    }

    return (
        <section className="pt-32 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('My Blogs', 'मेरे ब्लॉग')}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {t('Manage and edit your submitted travel stories', 'अपनी जमा की गई यात्रा कहानियों को प्रबंधित और संपादित करें')}
                        </p>
                    </div>
                    <Link
                        href="/submit"
                        className="px-6 py-3 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                        {t('Write New Blog', 'नया ब्लॉग लिखें')}
                    </Link>
                </div>

                {blogs.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-dashed border-gray-200">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {t('No blogs yet', 'अभी तक कोई ब्लॉग नहीं')}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {t(
                                "You haven't submitted any blogs yet. Start your journey today!",
                                'आपने अभी तक कोई ब्लॉग जमा नहीं किया है। आज ही अपनी यात्रा शुरू करें!'
                            )}
                        </p>
                        <Link
                            href="/submit"
                            className="inline-block px-6 py-2 border-2 border-royal-blue text-royal-blue font-semibold rounded-lg hover:bg-royal-blue hover:text-white transition-all"
                        >
                            {t('Write Your First Blog', 'अपना पहला ब्लॉग लिखें')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {blogs.map((blog) => (
                            <div
                                key={blog.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col md:flex-row"
                            >
                                {/* Thumbnail */}
                                <div className="w-full md:w-48 h-48 md:h-auto relative shrink-0">
                                    <img
                                        src={blog.coverImage || 'https://via.placeholder.com/400'}
                                        alt={lang === 'hi' ? blog.title_hi : blog.title_en}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(blog.status)}`}>
                                                {getStatusLabel(blog.status)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(blog.publishedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                                            {lang === 'hi' ? blog.title_hi : blog.title_en}
                                        </h2>
                                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                            {lang === 'hi' ? blog.excerpt_hi : blog.excerpt_en}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 mt-auto">
                                        <Link
                                            href={`/edit/${blog.id}`}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-all"
                                        >
                                            {t('Edit', 'संपादित करें')}
                                        </Link>

                                        {(blog.status === 'published' || blog.status === 'approved') && (
                                            <Link
                                                href={`/blog/${blog.id}`}
                                                target="_blank"
                                                className="px-4 py-2 border border-gray-200 hover:border-royal-blue hover:text-royal-blue text-gray-600 font-medium rounded-lg text-sm transition-all"
                                            >
                                                {t('View Live', 'लाइव देखें')}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
