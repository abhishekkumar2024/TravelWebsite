'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface BlogPost {
    id: string;
    title_en: string;
    title_hi?: string;
    excerpt_en: string;
    content_en: string;
    destination: string;
    category: string;
    coverImage: string;
    author: { name: string; email: string };
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
}

interface AffiliateProduct {
    id: string;
    name: string;
    price: string;
    imageUrl: string;
    affiliateLink: string;
    destinations: string[];
    isActive: boolean;
    createdAt: Date;
}

const ADMIN_PASSWORD = 'camelthar2024'; // Simple demo password

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'blogs' | 'products'>('blogs');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [products, setProducts] = useState<AffiliateProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
    const [showProductForm, setShowProductForm] = useState(false);

    // Product form state
    const [productForm, setProductForm] = useState({
        name: '',
        price: '',
        imageUrl: '',
        affiliateLink: '',
        destinations: [] as string[],
    });

    const destinations = ['jaipur', 'udaipur', 'jaisalmer', 'jodhpur', 'pushkar', 'mount-abu'];

    // Fetch blogs and products
    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch blogs
            const blogsQuery = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
            const blogsSnapshot = await getDocs(blogsQuery);
            const blogsData = blogsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as BlogPost[];
            setBlogs(blogsData);

            // Fetch products
            const productsQuery = query(collection(db, 'affiliateProducts'), orderBy('createdAt', 'desc'));
            const productsSnapshot = await getDocs(productsQuery);
            const productsData = productsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as AffiliateProduct[];
            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
        } else {
            alert('Invalid password');
        }
    };

    const updateBlogStatus = async (blogId: string, status: 'approved' | 'rejected') => {
        try {
            await updateDoc(doc(db, 'blogs', blogId), { status });
            setBlogs(prev => prev.map(blog =>
                blog.id === blogId ? { ...blog, status } : blog
            ));
            setSelectedBlog(null);
        } catch (error) {
            console.error('Error updating blog:', error);
            alert('Failed to update blog status');
        }
    };

    const addProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newProduct = {
                ...productForm,
                isActive: true,
                createdAt: new Date(),
            };
            const docRef = await addDoc(collection(db, 'affiliateProducts'), newProduct);
            setProducts(prev => [{ id: docRef.id, ...newProduct } as AffiliateProduct, ...prev]);
            setProductForm({ name: '', price: '', imageUrl: '', affiliateLink: '', destinations: [] });
            setShowProductForm(false);
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Failed to add product');
        }
    };

    const toggleProductStatus = async (productId: string, isActive: boolean) => {
        try {
            await updateDoc(doc(db, 'affiliateProducts', productId), { isActive: !isActive });
            setProducts(prev => prev.map(p =>
                p.id === productId ? { ...p, isActive: !isActive } : p
            ));
        } catch (error) {
            console.error('Error toggling product:', error);
        }
    };

    const deleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await deleteDoc(doc(db, 'affiliateProducts', productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const filteredBlogs = blogs.filter(blog => {
        const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;
        const matchesSearch = !searchQuery ||
            blog.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
            blog.author.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="backdrop-blur-lg bg-white/10 p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                        <p className="text-gray-400 mt-2">Enter password to continue</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
                        />
                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-black/30 backdrop-blur-lg border-r border-white/10 p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white">CamelThar</span>
                </div>

                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveTab('blogs')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'blogs'
                                ? 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 text-amber-400 border border-amber-400/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        Blog Submissions
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'products'
                                ? 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 text-amber-400 border border-amber-400/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Affiliate Products
                    </button>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                {activeTab === 'blogs' ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Blog Submissions</h1>
                                <p className="text-gray-400 mt-1">Review and manage submitted blogs</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search blogs..."
                                        className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 w-64"
                                    />
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Status Filters */}
                        <div className="flex gap-3 mb-6">
                            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all ${statusFilter === status
                                            ? status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                : status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    : status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        : 'bg-white/20 text-white border border-white/30'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                    <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs">
                                        {status === 'all' ? blogs.length : blogs.filter(b => b.status === status).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Blog Cards */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : filteredBlogs.length === 0 ? (
                            <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-400 text-lg">No blog submissions found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredBlogs.map((blog) => (
                                    <div
                                        key={blog.id}
                                        className="backdrop-blur-lg bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-amber-400/30 transition-all hover:shadow-lg hover:shadow-amber-500/10 group"
                                    >
                                        <div className="relative h-40 overflow-hidden">
                                            <img
                                                src={blog.coverImage || 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600'}
                                                alt={blog.title_en}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute top-3 right-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${blog.status === 'pending' ? 'bg-yellow-500 text-yellow-900'
                                                        : blog.status === 'approved' ? 'bg-green-500 text-green-900'
                                                            : 'bg-red-500 text-red-100'
                                                    }`}>
                                                    {blog.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{blog.title_en}</h3>
                                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{blog.excerpt_en}</p>
                                            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                                                <span>{blog.author.name}</span>
                                                <span className="px-2 py-1 bg-white/10 rounded-lg">{blog.destination}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedBlog(blog)}
                                                    className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-sm font-medium"
                                                >
                                                    Preview
                                                </button>
                                                {blog.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateBlogStatus(blog.id, 'approved')}
                                                            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all text-sm font-medium"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => updateBlogStatus(blog.id, 'rejected')}
                                                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all text-sm font-medium"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Products Tab */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Affiliate Products</h1>
                                <p className="text-gray-400 mt-1">Manage products shown to visitors</p>
                            </div>
                            <button
                                onClick={() => setShowProductForm(true)}
                                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Add Product
                            </button>
                        </div>

                        {/* Products Grid */}
                        {products.length === 0 ? (
                            <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <p className="text-gray-400 text-lg">No affiliate products yet</p>
                                <button
                                    onClick={() => setShowProductForm(true)}
                                    className="mt-4 px-6 py-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-all"
                                >
                                    Add your first product
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <div
                                        key={product.id}
                                        className={`backdrop-blur-lg bg-white/5 rounded-2xl overflow-hidden border transition-all ${product.isActive ? 'border-white/10 hover:border-amber-400/30' : 'border-red-500/30 opacity-60'
                                            }`}
                                    >
                                        <div className="relative h-40 overflow-hidden bg-white/5">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            {!product.isActive && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="text-red-400 font-bold">HIDDEN</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-white font-bold mb-1 line-clamp-1">{product.name}</h3>
                                            <p className="text-amber-400 font-bold mb-2">{product.price}</p>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {product.destinations.map((dest) => (
                                                    <span key={dest} className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">
                                                        {dest}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => toggleProductStatus(product.id, product.isActive)}
                                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${product.isActive
                                                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                        }`}
                                                >
                                                    {product.isActive ? 'Hide' : 'Show'}
                                                </button>
                                                <button
                                                    onClick={() => deleteProduct(product.id)}
                                                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Blog Preview Modal */}
            {selectedBlog && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-white/10">
                        <div className="relative h-64">
                            <img
                                src={selectedBlog.coverImage || 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600'}
                                alt={selectedBlog.title_en}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setSelectedBlog(null)}
                                className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedBlog.status === 'pending' ? 'bg-yellow-500 text-yellow-900'
                                        : selectedBlog.status === 'approved' ? 'bg-green-500 text-green-900'
                                            : 'bg-red-500 text-red-100'
                                    }`}>
                                    {selectedBlog.status.toUpperCase()}
                                </span>
                                <span className="text-gray-400">{selectedBlog.destination}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-400">{selectedBlog.category}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">{selectedBlog.title_en}</h2>
                            <p className="text-gray-400 mb-4">{selectedBlog.excerpt_en}</p>
                            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedBlog.content_en }} />
                            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
                                <div className="text-gray-400">
                                    By <span className="text-white">{selectedBlog.author.name}</span>
                                </div>
                                {selectedBlog.status === 'pending' && (
                                    <div className="flex gap-3 ml-auto">
                                        <button
                                            onClick={() => updateBlogStatus(selectedBlog.id, 'approved')}
                                            className="px-6 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => updateBlogStatus(selectedBlog.id, 'rejected')}
                                            className="px-6 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showProductForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 rounded-2xl max-w-lg w-full border border-white/10 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Add Affiliate Product</h2>
                            <button
                                onClick={() => setShowProductForm(false)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={addProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Product Name</label>
                                <input
                                    type="text"
                                    value={productForm.name}
                                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    placeholder="Desert Safari Camera Bag"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Price</label>
                                <input
                                    type="text"
                                    value={productForm.price}
                                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    placeholder="₹2,499"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Image URL</label>
                                <input
                                    type="url"
                                    value={productForm.imageUrl}
                                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Affiliate Link</label>
                                <input
                                    type="url"
                                    value={productForm.affiliateLink}
                                    onChange={(e) => setProductForm({ ...productForm, affiliateLink: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    placeholder="https://amazon.in/..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Show for Destinations</label>
                                <div className="flex flex-wrap gap-2">
                                    {destinations.map((dest) => (
                                        <button
                                            key={dest}
                                            type="button"
                                            onClick={() => {
                                                const updated = productForm.destinations.includes(dest)
                                                    ? productForm.destinations.filter(d => d !== dest)
                                                    : [...productForm.destinations, dest];
                                                setProductForm({ ...productForm, destinations: updated });
                                            }}
                                            className={`px-3 py-1 rounded-lg text-sm transition-all ${productForm.destinations.includes(dest)
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                                }`}
                                        >
                                            {dest.charAt(0).toUpperCase() + dest.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all mt-6"
                            >
                                Add Product
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
