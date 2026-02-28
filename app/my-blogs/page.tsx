
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { fetchUserBlogs } from '@/lib/db/queries/blogs';
import { BlogPost } from '@/lib/data';
import { useSession } from 'next-auth/react';
import { SubmitDraftData } from '@/hooks/useDraft';
import ProfileHeader from '@/components/ProfileHeader';

// Helper to get draft from localStorage
function getLocalDraft(): SubmitDraftData | null {
    if (typeof window === 'undefined') return null;
    try {
        const draft = localStorage.getItem('travel_blog_draft_submit');
        if (draft) {
            const parsed = JSON.parse(draft);
            // Check if draft has meaningful content
            if (parsed.titleEn || parsed.contentEn || parsed.excerptEn) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Error loading draft:', e);
    }
    return null;
}

// Helper to clear draft
function clearLocalDraft() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('travel_blog_draft_submit');
    } catch (e) {
        console.error('Error clearing draft:', e);
    }
}

export default function MyBlogsPage() {
    const { t, lang } = useLanguage();
    const router = useRouter();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const { data: session, status: sessionStatus } = useSession();
    const user = session?.user as any;
    const [draft, setDraft] = useState<SubmitDraftData | null>(null);
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    useEffect(() => {
        // Load draft from localStorage
        const localDraft = getLocalDraft();
        if (localDraft) {
            setDraft(localDraft);
        }

        if (sessionStatus === 'loading') return;
        if (!session?.user) {
            router.push('/submit?login=true');
            return;
        }
        loadBlogs();
        setLoading(false);
    }, [sessionStatus]);

    const loadBlogs = async () => {
        try {
            if (!user?.id) return;
            const userBlogs = await fetchUserBlogs(user.id);
            setBlogs(userBlogs);
        } catch (error) {
            console.error('Error loading blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscardDraft = () => {
        clearLocalDraft();
        setDraft(null);
        setShowDiscardModal(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'draft':
                return 'bg-blue-100 text-blue-800';
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
            case 'draft':
                return t('Draft', 'ड्राफ्ट');
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

    const hasDraftOrBlogs = draft || blogs.length > 0;

    return (
        <section className="pt-32 pb-20 px-4">
            {/* Discard Draft Confirmation Modal */}
            {showDiscardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {t('Discard Draft?', 'ड्राफ्ट छोड़ें?')}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {t(
                                'This action cannot be undone. Your draft will be permanently deleted.',
                                'यह क्रिया पूर्ववत नहीं की जा सकती। आपका ड्राफ्ट स्थायी रूप से हटा दिया जाएगा।'
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDiscardModal(false)}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                            >
                                {t('Cancel', 'रद्द करें')}
                            </button>
                            <button
                                onClick={handleDiscardDraft}
                                className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all"
                            >
                                {t('Discard', 'छोड़ें')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {user && (
                    <ProfileHeader
                        userId={user.id}
                        email={user.email}
                        onProfileUpdate={loadBlogs}
                    />
                )}

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

                {/* Draft Section */}
                {draft && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            {t('Unsaved Draft', 'असहेजा ड्राफ्ट')}
                        </h2>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 border-dashed overflow-hidden">
                            <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
                                {/* Draft Icon */}
                                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>

                                {/* Draft Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor('draft')}`}>
                                            {getStatusLabel('draft')}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {t('Last saved', 'अंतिम बार सहेजा')}: {new Date(draft.savedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        {draft.titleEn || t('Untitled Draft', 'शीर्षकहीन ड्राफ्ट')}
                                    </h3>
                                    {draft.excerptEn && (
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {draft.excerptEn}
                                        </p>
                                    )}
                                    {draft.destination && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            📍 {draft.destination} {draft.category && `• ${draft.category}`}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => setShowDiscardModal(true)}
                                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg text-sm transition-all"
                                    >
                                        {t('Discard', 'छोड़ें')}
                                    </button>
                                    <Link
                                        href="/submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all"
                                    >
                                        {t('Continue Writing', 'लिखना जारी रखें')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submitted Blogs Section */}
                {blogs.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            {t('Submitted Blogs', 'जमा किए गए ब्लॉग')} ({blogs.length})
                        </h2>
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
                                                href={`/edit/${blog.slug || blog.id}`}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-all"
                                            >
                                                {t('Edit', 'संपादित करें')}
                                            </Link>

                                            {(blog.status === 'published' || blog.status === 'approved') && (
                                                <Link
                                                    href={`/blogs/${blog.slug || blog.id}/`}
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
                    </div>
                )}

                {/* Empty State - Only show if no draft and no blogs */}
                {!hasDraftOrBlogs && (
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
                )}
            </div>
        </section>
    );
}

