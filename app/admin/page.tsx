'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isAdmin, getAdminStats, fetchBlogsByStatus } from '@/lib/admin';
import { approveBlog, rejectBlog } from '@/lib/supabaseBlogs';
import AdminLogin from '@/components/AdminLogin';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

type BlogStatus = 'pending' | 'published' | 'rejected' | 'draft';

export default function AdminPage() {
    const { t } = useLanguage();
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<BlogStatus>('pending');
    const [blogs, setBlogs] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        published: 0,
        rejected: 0,
        draft: 0,
    });
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    useEffect(() => {
        if (authenticated) {
            loadStats();
            loadBlogs();
        }
    }, [authenticated, activeTab]);

    const checkAdminAccess = async () => {
        try {
            const adminStatus = await isAdmin();
            setAuthenticated(adminStatus);
        } catch (error) {
            console.error('Error checking admin access:', error);
            setAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        const adminStats = await getAdminStats();
        setStats(adminStats);
    };

    const loadBlogs = async () => {
        const blogsData = await fetchBlogsByStatus(activeTab);
        setBlogs(blogsData);
    };

    const handleApprove = async (blogId: string) => {
        setProcessing(blogId);
        try {
            const result = await approveBlog(blogId);
            if (result.success) {
                await loadBlogs();
                await loadStats();
            } else {
                alert(t('Failed to approve blog', 'ब्लॉग को मंजूरी देने में विफल'));
            }
        } catch (error) {
            console.error('Error approving blog:', error);
            alert(t('An error occurred', 'एक त्रुटि हुई'));
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (blogId: string) => {
        if (!confirm(t('Are you sure you want to reject this blog?', 'क्या आप वाकई इस ब्लॉग को अस्वीकार करना चाहते हैं?'))) {
            return;
        }

        setProcessing(blogId);
        try {
            const result = await rejectBlog(blogId);
            if (result.success) {
                await loadBlogs();
                await loadStats();
            } else {
                alert(t('Failed to reject blog', 'ब्लॉग को अस्वीकार करने में विफल'));
            }
        } catch (error) {
            console.error('Error rejecting blog:', error);
            alert(t('An error occurred', 'एक त्रुटि हुई'));
        } finally {
            setProcessing(null);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setAuthenticated(false);
        setBlogs([]);
        setStats({
            total: 0,
            pending: 0,
            published: 0,
            rejected: 0,
            draft: 0,
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>{t('Loading...', 'लोड हो रहा है...')}</p>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return <AdminLogin onLoginSuccess={() => setAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {t('Admin Dashboard', 'व्यवस्थापक डैशबोर्ड')}
                            </h1>
                            <p className="text-gray-300">
                                {t('Manage blog submissions', 'ब्लॉग सबमिशन प्रबंधित करें')}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                            >
                                {t('View Site', 'साइट देखें')}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                            >
                                {t('Logout', 'लॉगआउट')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
                        <div className="text-gray-300 text-sm mb-1">{t('Total', 'कुल')}</div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                    </div>
                    <div className="bg-yellow-500/20 backdrop-blur-lg rounded-lg p-4 border border-yellow-500/30">
                        <div className="text-yellow-200 text-sm mb-1">{t('Pending', 'लंबित')}</div>
                        <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
                    </div>
                    <div className="bg-green-500/20 backdrop-blur-lg rounded-lg p-4 border border-green-500/30">
                        <div className="text-green-200 text-sm mb-1">{t('Published', 'प्रकाशित')}</div>
                        <div className="text-2xl font-bold text-green-300">{stats.published}</div>
                    </div>
                    <div className="bg-red-500/20 backdrop-blur-lg rounded-lg p-4 border border-red-500/30">
                        <div className="text-red-200 text-sm mb-1">{t('Rejected', 'अस्वीकृत')}</div>
                        <div className="text-2xl font-bold text-red-300">{stats.rejected}</div>
                    </div>
                    <div className="bg-gray-500/20 backdrop-blur-lg rounded-lg p-4 border border-gray-500/30">
                        <div className="text-gray-200 text-sm mb-1">{t('Draft', 'ड्राफ्ट')}</div>
                        <div className="text-2xl font-bold text-gray-300">{stats.draft}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-1 mb-6 border border-white/20">
                    <div className="flex gap-2">
                        {(['pending', 'published', 'rejected', 'draft'] as BlogStatus[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                                    activeTab === tab
                                        ? 'bg-white text-gray-900'
                                        : 'text-white hover:bg-white/10'
                                }`}
                            >
                                {t(
                                    tab.charAt(0).toUpperCase() + tab.slice(1),
                                    tab === 'pending' ? 'लंबित' : tab === 'published' ? 'प्रकाशित' : tab === 'rejected' ? 'अस्वीकृत' : 'ड्राफ्ट'
                                )}{' '}
                                ({tab === 'pending' ? stats.pending : tab === 'published' ? stats.published : tab === 'rejected' ? stats.rejected : stats.draft})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Blogs List */}
                <div className="space-y-4">
                    {blogs.length === 0 ? (
                        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 text-center border border-white/20">
                            <p className="text-gray-300 text-lg">
                                {t('No blogs found', 'कोई ब्लॉग नहीं मिला')}
                            </p>
                        </div>
                    ) : (
                        blogs.map((blog) => (
                            <div
                                key={blog.id}
                                className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all"
                            >
                                <div className="flex flex-col md:flex-row gap-4">
                                    {/* Cover Image */}
                                    <div className="w-full md:w-48 h-32 flex-shrink-0">
                                        <img
                                            src={blog.cover_image || 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800'}
                                            alt={blog.title_en}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1">
                                                    {blog.title_en}
                                                </h3>
                                                <p className="text-gray-300 text-sm mb-2">
                                                    {blog.excerpt_en || 'No excerpt'}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                blog.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                                blog.status === 'published' ? 'bg-green-500/20 text-green-300' :
                                                blog.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                                                'bg-gray-500/20 text-gray-300'
                                            }`}>
                                                {blog.status}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                                            <span>{t('Category', 'श्रेणी')}: {blog.category}</span>
                                            <span>{t('Destination', 'स्थान')}: {blog.destination || 'N/A'}</span>
                                            <span>
                                                {t('Created', 'बनाया गया')}: {new Date(blog.created_at).toLocaleDateString()}
                                            </span>
                                            {blog.author && (
                                                <span>
                                                    {t('Author', 'लेखक')}: {typeof blog.author === 'object' ? blog.author.name : 'Unknown'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {activeTab === 'pending' && (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleApprove(blog.id)}
                                                    disabled={processing === blog.id}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {processing === blog.id ? t('Processing...', 'प्रसंस्करण...') : t('Approve', 'मंजूरी दें')}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(blog.id)}
                                                    disabled={processing === blog.id}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {t('Reject', 'अस्वीकार करें')}
                                                </button>
                                                <Link
                                                    href={`/blog/${blog.id}`}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                                                >
                                                    {t('View', 'देखें')}
                                                </Link>
                                            </div>
                                        )}

                                        {activeTab !== 'pending' && (
                                            <div className="flex gap-3">
                                                <Link
                                                    href={`/blog/${blog.id}`}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                                                >
                                                    {t('View', 'देखें')}
                                                </Link>
                                                {activeTab === 'rejected' && (
                                                    <button
                                                        onClick={() => handleApprove(blog.id)}
                                                        disabled={processing === blog.id}
                                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {t('Approve', 'मंजूरी दें')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
