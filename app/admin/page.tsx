'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isAdmin, getAdminStatus, getAdminStats, fetchBlogsByStatus } from '@/lib/admin';
import { approveBlog, rejectBlog, deleteBlog } from '@/lib/supabaseBlogs';
import AdminLogin from '@/components/AdminLogin';
import ProfileHeader from '@/components/ProfileHeader';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

type BlogStatus = 'pending' | 'published' | 'rejected' | 'draft';
type MainTab = 'blogs' | 'products' | 'messages';

import {
    fetchAllProductsForAdmin,
    createProduct,
    updateProduct,
    deleteProduct
} from '@/lib/supabaseProducts';
import {
    fetchContactMessages,
    updateMessageStatus
} from '@/lib/supabaseContact';
import { AffiliateProduct } from '@/app/essentials/EssentialsContent';

export default function AdminPage() {
    const { t } = useLanguage();
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mainTab, setMainTab] = useState<MainTab>('blogs');
    const [activeTab, setActiveTab] = useState<BlogStatus>('pending');
    const [blogs, setBlogs] = useState<any[]>([]);
    const [products, setProducts] = useState<AffiliateProduct[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        published: 0,
        rejected: 0,
        draft: 0,
    });
    const [processing, setProcessing] = useState<string | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AffiliateProduct | null>(null);
    const [productForm, setProductForm] = useState<Omit<AffiliateProduct, 'id'>>({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        affiliateLink: '',
        destinations: [],
        isActive: true,
    });

    useEffect(() => {
        checkAdminAccess();
    }, []);

    useEffect(() => {
        if (authenticated) {
            if (mainTab === 'blogs') {
                loadStats();
                loadBlogs();
            } else if (mainTab === 'products') {
                loadProducts();
            } else if (mainTab === 'messages') {
                loadMessages();
            }
        }
    }, [authenticated, mainTab, activeTab]);

    const checkAdminAccess = async () => {
        try {
            const { isAdmin, user } = await getAdminStatus();
            setAuthenticated(isAdmin);
            if (isAdmin && user) {
                setUser(user);
            }
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

    const loadProducts = async () => {
        const productsData = await fetchAllProductsForAdmin();
        setProducts(productsData);
    };

    const loadMessages = async () => {
        const messagesData = await fetchContactMessages();
        setMessages(messagesData);
    };

    const handleUpdateMessageStatus = async (id: string, status: string) => {
        setProcessing(id);
        try {
            const result = await updateMessageStatus(id, status);
            if (result.success) {
                await loadMessages();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating message status:', error);
        } finally {
            setProcessing(null);
        }
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing('product-form');
        try {
            if (editingProduct) {
                const { error } = await updateProduct(editingProduct.id, productForm);
                if (error) throw error;
            } else {
                const { error } = await createProduct(productForm);
                if (error) throw error;
            }
            setShowProductModal(false);
            setEditingProduct(null);
            setProductForm({
                name: '',
                description: '',
                price: '',
                imageUrl: '',
                affiliateLink: '',
                destinations: [],
                isActive: true,
            });
            await loadProducts();
        } catch (error: any) {
            alert(error.message || 'Error saving product');
        } finally {
            setProcessing(null);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        setProcessing(id);
        try {
            const { error } = await deleteProduct(id);
            if (error) throw error;
            await loadProducts();
        } catch (error: any) {
            alert(error.message || 'Error deleting product');
        } finally {
            setProcessing(null);
        }
    };

    const openEditProduct = (product: AffiliateProduct) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name,
            description: product.description || '',
            price: product.price,
            imageUrl: product.imageUrl,
            affiliateLink: product.affiliateLink,
            destinations: product.destinations,
            isActive: product.isActive,
        });
        setShowProductModal(true);
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

    const handleDeleteBlog = async (blogId: string, blogTitle: string) => {
        if (!confirm(t(
            `Are you sure you want to PERMANENTLY DELETE this blog?\n\n"${blogTitle}"\n\nThis action cannot be undone!`,
            `क्या आप वाकई इस ब्लॉग को स्थायी रूप से हटाना चाहते हैं?\n\n"${blogTitle}"\n\nयह क्रिया पूर्ववत नहीं की जा सकती!`
        ))) {
            return;
        }

        setProcessing(blogId);
        try {
            const result = await deleteBlog(blogId);
            if (result.success) {
                await loadBlogs();
                await loadStats();
            } else {
                alert(t('Failed to delete blog', 'ब्लॉग को हटाने में विफल') + ': ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting blog:', error);
            alert(t('An error occurred', 'एक त्रुटि हुई'));
        } finally {
            setProcessing(null);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' });
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
            <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 pt-20">
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
                                href="/submit"
                                className="px-4 py-2 bg-desert-gold hover:bg-desert-gold/90 text-white rounded-lg transition-all font-bold"
                            >
                                {t('Create New Blog', 'नया ब्लॉग बनाएं')}
                            </Link>
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

            {/* Profile Header */}
            <div className="max-w-7xl mx-auto px-4 mt-6">
                {user && (
                    <ProfileHeader
                        userId={user.id}
                        email={user.email}
                        onProfileUpdate={loadBlogs}
                    />
                )}
            </div>

            {/* Main Tabs */}
            <div className="max-w-7xl mx-auto px-4 mt-6">
                <div className="flex bg-white/10 p-1 rounded-xl border border-white/20 w-fit">
                    <button
                        onClick={() => setMainTab('blogs')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${mainTab === 'blogs' ? 'bg-white text-gray-900 shadow-lg' : 'text-white hover:bg-white/10'
                            }`}
                    >
                        {t('Blogs', 'ब्लॉग')}
                    </button>
                    <button
                        onClick={() => setMainTab('products')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${mainTab === 'products' ? 'bg-white text-gray-900 shadow-lg' : 'text-white hover:bg-white/10'
                            }`}
                    >
                        {t('Products', 'उत्पाद')}
                    </button>
                    <button
                        onClick={() => setMainTab('messages')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${mainTab === 'messages' ? 'bg-white text-gray-900 shadow-lg' : 'text-white hover:bg-white/10'
                            }`}
                    >
                        {t('Messages', 'संदेश')}
                    </button>
                </div>
            </div>

            {mainTab === 'blogs' && (
                <>
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
                                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === tab
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
                                                    src={blog.cover_image || '/images/jaipur-hawa-mahal.webp'}
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
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${blog.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
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
                                                    <div className="flex flex-wrap gap-3">
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
                                                            href={`/blogs/${blog.slug || blog.id}/`}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                                                        >
                                                            {t('View', 'देखें')}
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteBlog(blog.id, blog.title_en)}
                                                            disabled={processing === blog.id}
                                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {t('Delete', 'हटाएं')}
                                                        </button>
                                                    </div>
                                                )}

                                                {activeTab !== 'pending' && (
                                                    <div className="flex flex-wrap gap-3">
                                                        <Link
                                                            href={`/blogs/${blog.slug || blog.id}/`}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                                                        >
                                                            {t('View', 'देखें')}
                                                        </Link>
                                                        <Link
                                                            href={`/edit/${blog.id}`}
                                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
                                                        >
                                                            {t('Edit', 'संपादित करें')}
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
                                                        <button
                                                            onClick={() => handleDeleteBlog(blog.id, blog.title_en)}
                                                            disabled={processing === blog.id}
                                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {t('Delete', 'हटाएं')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {mainTab === 'products' && (
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">{t('Manage Affiliate Products', 'एफिलिएट उत्पाद प्रबंधित करें')}</h2>
                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setProductForm({
                                    name: '',
                                    description: '',
                                    price: '',
                                    imageUrl: '',
                                    affiliateLink: '',
                                    destinations: [],
                                    isActive: true,
                                });
                                setShowProductModal(true);
                            }}
                            className="px-6 py-2 bg-desert-gold hover:bg-desert-gold/90 text-white font-bold rounded-lg transition-all"
                        >
                            {t('Add New Product', 'नया उत्पाद जोड़ें')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-white/10 rounded-xl border border-white/20">
                                <p className="text-gray-300">{t('No products found', 'कोई उत्पाद नहीं मिला')}</p>
                            </div>
                        ) : (
                            products.map((product) => (
                                <div key={product.id} className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden border border-white/20">
                                    <div className="aspect-square relative">
                                        <img
                                            src={product.imageUrl || '/images/pushkar.webp'}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {!product.isActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                                                    Inactive
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-white font-bold text-lg mb-1 truncate">{product.name}</h3>
                                        <p className="text-desert-gold font-bold mb-2">{product.price}</p>
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {product.destinations.map(d => (
                                                <span key={d} className="px-2 py-0.5 bg-white/10 text-gray-300 text-xs rounded-full">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditProduct(product)}
                                                className="flex-1 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg transition-all"
                                            >
                                                {t('Edit', 'संपादित करें')}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                disabled={processing === product.id}
                                                className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                                            >
                                                {t('Delete', 'हटाएं')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {mainTab === 'messages' && (
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">{t('Contact Messages', 'संपर्क संदेश')}</h2>
                        <button
                            onClick={loadMessages}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            {t('Refresh', 'रीफ्रेश')}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 text-center border border-white/20">
                                <p className="text-gray-300 text-lg">
                                    {t('No messages found', 'कोई संदेश नहीं मिला')}
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`bg-white/10 backdrop-blur-lg rounded-lg p-6 border transition-all ${msg.status === 'new' ? 'border-desert-gold/50 bg-white/15' : 'border-white/20'
                                        }`}
                                >
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-white">{msg.subject}</h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${msg.status === 'new' ? 'bg-desert-gold text-black' : 'bg-gray-500 text-white'
                                                    }`}>
                                                    {msg.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-400 mb-4">
                                                <p><span className="text-gray-500">{t('From', 'से')}:</span> <span className="text-white">{msg.name}</span> ({msg.email})</p>
                                                <p><span className="text-gray-500">{t('Date', 'तारीख')}:</span> {new Date(msg.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-black/20 rounded-lg p-4 text-gray-200 whitespace-pre-wrap italic border border-white/5">
                                                "{msg.message}"
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2 justify-end">
                                            {msg.status === 'new' ? (
                                                <button
                                                    onClick={() => handleUpdateMessageStatus(msg.id, 'read')}
                                                    disabled={processing === msg.id}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                                                >
                                                    {t('Mark as Read', 'पढ़ा हुआ मानों')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateMessageStatus(msg.id, 'new')}
                                                    disabled={processing === msg.id}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                                                >
                                                    {t('Mark as Unread', 'बिना पढ़ा हुआ मानों')}
                                                </button>
                                            )}
                                            <a
                                                href={`mailto:${msg.email}?subject=Re: ${msg.subject}`}
                                                className="px-4 py-2 bg-royal-blue hover:bg-royal-blue/80 text-white rounded-lg text-sm font-semibold transition-all text-center"
                                            >
                                                {t('Reply via Email', 'ईमेल से जवाब दें')}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">
                                {editingProduct ? t('Edit Product', 'उत्पाद संपादित करें') : t('Add New Product', 'नया उत्पाद जोड़ें')}
                            </h2>
                            <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleProductSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    required
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-desert-gold"
                                    placeholder="e.g. Rajasthan Travel Guide"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Price</label>
                                    <input
                                        type="text"
                                        required
                                        value={productForm.price}
                                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-desert-gold"
                                        placeholder="e.g. $19.99 or ₹999"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Image URL</label>
                                    <input
                                        type="url"
                                        required
                                        value={productForm.imageUrl}
                                        onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-desert-gold"
                                        placeholder="https://images.unsplash.com/..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Affiliate Link</label>
                                <input
                                    type="url"
                                    required
                                    value={productForm.affiliateLink}
                                    onChange={(e) => setProductForm({ ...productForm, affiliateLink: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-desert-gold"
                                    placeholder="https://amazon.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={productForm.description}
                                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-desert-gold min-h-[100px]"
                                    placeholder="Brief product description..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Destinations (Comma separated)</label>
                                <input
                                    type="text"
                                    value={productForm.destinations.join(', ')}
                                    onChange={(e) => setProductForm({
                                        ...productForm,
                                        destinations: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')
                                    })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-desert-gold"
                                    placeholder="jaipur, udaipur, jaisalmer"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={productForm.isActive}
                                    onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                                    className="w-4 h-4 bg-white/5 border border-white/10 rounded accent-desert-gold"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-400">Active (Visible to users)</label>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowProductModal(false)}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing === 'product-form'}
                                    className="flex-1 py-3 bg-desert-gold hover:bg-desert-gold/90 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                                >
                                    {processing === 'product-form' ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
