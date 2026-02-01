'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import TipTapEditor from '@/components/editor/TipTapEditor';
import LivePreview from '@/components/editor/LivePreview';
import ImageUploader from '@/components/editor/ImageUploader';
import ImageGallery from '@/components/editor/ImageGallery';
import LoginModal from '@/components/LoginModal';
import { uploadBlogImage, uploadCoverImage } from '@/lib/upload';
import { createBlog } from '@/lib/supabaseBlogs';
import { supabase } from '@/lib/supabaseClient';
import { ensureAuthorExists } from '@/lib/supabaseAuthors';
import { isAdmin } from '@/lib/admin';

const destinations = [
    { value: '', label: 'Select destination' },
    { value: 'jaipur', label: 'Jaipur' },
    { value: 'udaipur', label: 'Udaipur' },
    { value: 'jaisalmer', label: 'Jaisalmer' },
    { value: 'jodhpur', label: 'Jodhpur' },
    { value: 'pushkar', label: 'Pushkar' },
    { value: 'mount-abu', label: 'Mount Abu' },
    { value: 'other', label: 'Other' },
];

const categories = [
    { value: '', label: 'Select category' },
    { value: 'City Guide', label: 'City Guide' },
    { value: 'Travel Story', label: 'Travel Story' },
    { value: 'Adventure', label: 'Adventure' },
    { value: 'Food & Culture', label: 'Food & Culture' },
    { value: 'Budget Travel', label: 'Budget Travel' },
    { value: 'Luxury', label: 'Luxury' },
];

export default function SubmitPage() {
    const { t } = useLanguage();
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState(false);

    // Form state
    const [destination, setDestination] = useState('');
    const [category, setCategory] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [titleHi, setTitleHi] = useState('');
    const [excerptEn, setExcerptEn] = useState('');
    const [excerptHi, setExcerptHi] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [contentHi, setContentHi] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);

    // Check authentication status
    useEffect(() => {
        checkUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const user = session.user;
                setUser(user);

                // Check if admin
                const isAdm = await isAdmin();
                setIsAdminUser(isAdm);

                // Ensure author exists
                await ensureAuthorExists();
                setSessionReady(true);
            } else {
                setUser(null);
                setSessionReady(false);
                setIsAdminUser(false);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);



    const checkUser = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
                setUser(currentUser);

                // Check if admin
                const isAdm = await isAdmin();
                setIsAdminUser(isAdm);

                // Ensure author exists (wrapped in try to not block the UI if it fails)
                try {
                    await ensureAuthorExists();
                } catch (e) {
                    console.error('Error ensuring author exists:', e);
                }

                setSessionReady(true);
            } else {
                setSessionReady(false);
                setIsAdminUser(false);
            }
        } catch (error) {
            console.error('Error checking user:', error);
            setSessionReady(false); // Ensure sessionReady is set to false on error
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccess = () => {
        checkUser();
        setShowLoginModal(false);
        setShowLoginPrompt(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    // Derived metrics for better writing UX
    const wordCount = useMemo(() => {
        if (!contentEn) return 0;
        const text = contentEn.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) return 0;
        return text.split(' ').length;
    }, [contentEn]);

    const readingTimeMinutes = useMemo(() => {
        if (!wordCount) return 0;
        return Math.max(1, Math.round(wordCount / 200)); // ~200 wpm
    }, [wordCount]);

    // Upload image used inside the rich-text editor
    const handleImageUpload = useCallback(async (file: File): Promise<string> => {
        try {
            console.log('Starting upload for:', file.name);
            const downloadURL = await uploadBlogImage(file);
            console.log('Got URL:', downloadURL);

            // Add to uploaded images list
            setUploadedImages((prev) => [...prev, downloadURL]);

            return downloadURL;
        } catch (error: any) {
            console.error('Error uploading image:', error);

            let message = 'Failed to upload image.';
            if (error?.message?.includes('Cloudinary is not configured')) {
                message = 'Image upload is not configured. Please set your Cloudinary env variables in .env.local.';
            } else if (error?.message?.includes('Cloudinary upload failed')) {
                message = 'Image upload failed on Cloudinary. Check your upload preset and allowed formats.';
            }

            alert(`${message}\n\nDetails: ${error?.message || 'See browser console.'}`);
            throw error;
        }
    }, []);

    const handleCoverUpload = useCallback(async (file: File): Promise<string> => {
        try {
            const url = await uploadCoverImage(file);
            return url;
        } catch (error: any) {
            console.error('Error uploading cover image:', error);

            let message = 'Failed to upload cover image.';
            if (error?.message?.includes('Cloudinary is not configured')) {
                message = 'Cover image upload is not configured. Please set your Cloudinary env variables in .env.local.';
            } else if (error?.message?.includes('Cloudinary upload failed')) {
                message = 'Cover image upload failed on Cloudinary. Check your upload preset and allowed formats.';
            }

            alert(`${message}\n\nDetails: ${error?.message || 'See browser console.'}`);
            throw error;
        }
    }, []);

    const handleRemoveImage = (index: number) => {
        setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleInsertImage = (url: string) => {
        setContentEn((prev) => prev + `<img src="${url}" alt="Travel photo" />`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if user is logged in
        if (!user) {
            setShowLoginPrompt(true);
            setShowLoginModal(true);
            return;
        }

        setSubmitting(true);

        try {
            const blogData = {
                author: {
                    name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Traveler',
                    email: user?.email || ''
                },
                destination,
                category,
                title_en: titleEn,
                title_hi: titleHi || titleEn,
                excerpt_en: excerptEn,
                excerpt_hi: excerptHi || excerptEn,
                content_en: contentEn,
                content_hi: contentHi || contentEn,
                coverImage: coverImage || 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800',
                images: uploadedImages,
                status: (isAdminUser ? 'published' : 'pending') as 'published' | 'pending',
            };

            const { id, error } = await createBlog(blogData);
            if (error || !id) {
                // Check if error is due to authentication
                if (error?.includes('logged in') || error?.includes('authenticated')) {
                    setShowLoginPrompt(true);
                    setShowLoginModal(true);
                    return;
                }
                throw new Error(error || 'Unknown error');
            }

            setSubmitted(true);
        } catch (error: any) {
            console.error('Submit error:', error);
            // Check if error is due to authentication
            if (error?.message?.includes('logged in') || error?.message?.includes('authenticated')) {
                setShowLoginPrompt(true);
                setShowLoginModal(true);
            } else {
                alert(t('Failed to submit. Please try again.', 'जमा करने में विफल। कृपया पुनः प्रयास करें।'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-4">{t('Thank You!', 'धन्यवाद!')}</h2>
                        <p className="text-gray-600 mb-6">
                            {isAdminUser
                                ? t('Your blog has been published successfully and is now live on the website!', 'आपका ब्लॉग सफलतापूर्वक प्रकाशित हो गया है और अब वेबसाइट पर लाइव है!')
                                : t(
                                    "Your blog has been submitted successfully and is under review. We'll notify you once it's published.",
                                    'आपका ब्लॉग सफलतापूर्वक जमा हो गया है और समीक्षाधीन है। प्रकाशित होने पर हम आपको सूचित करेंगे।'
                                )
                            }
                        </p>
                        <a
                            href="/"
                            className="inline-block px-6 py-3 bg-royal-blue text-white font-semibold rounded-lg"
                        >
                            {t('Back to Home', 'होम पर वापस जाएं')}
                        </a>
                    </div>
                </div>
            </section>
        );
    }

    if (loading) {
        return (
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('Loading...', 'लोड हो रहा है...')}</p>
                </div>
            </section>
        );
    }

    return (
        <>
            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => {
                    setShowLoginModal(false);
                    setShowLoginPrompt(false);
                }}
                onLoginSuccess={handleLoginSuccess}
            />

            {/* Login Prompt Popup */}
            {showLoginPrompt && !showLoginModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {t('Login Required', 'लॉगिन आवश्यक')}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {t(
                                'Please login first to submit your blog. You need to be logged in to submit travel stories.',
                                'कृपया पहले लॉगिन करें। यात्रा कहानियां जमा करने के लिए आपको लॉगिन होना आवश्यक है।'
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowLoginPrompt(false);
                                }}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                            >
                                {t('Cancel', 'रद्द करें')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowLoginModal(true);
                                    setShowLoginPrompt(false);
                                }}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                            >
                                {t('Login', 'लॉगिन')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-4">
                        {/* Empty spacer for balancing on desktop */}
                        <div className="hidden md:block"></div>

                        <div className="text-center">
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                {t('Submit Your Travel Story', 'अपनी यात्रा कहानी जमा करें')}
                            </h1>
                            <p className="text-lg opacity-90">
                                {t(
                                    'Share your Rajasthan experience with our community',
                                    'हमारे समुदाय के साथ अपना राजस्थान अनुभव साझा करें'
                                )}
                            </p>
                        </div>

                        <div className="flex justify-center md:justify-end">
                            {user && (
                                <div className="flex flex-col md:flex-row items-center gap-3">
                                    <div className="text-center md:text-right">
                                        <p className="text-sm opacity-90 font-medium">{user.email}</p>
                                        {user.user_metadata?.name && (
                                            <p className="text-xs opacity-75">{user.user_metadata.name}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
                                    >
                                        {t('Logout', 'लॉगआउट')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Form Section */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Login Banner - Show when not logged in */}
                    {!user && (
                        <div className="mb-6 bg-gradient-to-r from-royal-blue to-deep-maroon rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-white/90">
                                        {t(
                                            'Please login or create an account to submit your travel story.',
                                            'अपनी यात्रा कहानी जमा करने के लिए कृपया लॉगिन करें या खाता बनाएं।'
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowLoginModal(true)}
                                    className="px-8 py-3 bg-white text-royal-blue font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                                >
                                    {t('Login / Sign Up', 'लॉगिन / साइन अप')}
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column - Editor */}
                            <div className="space-y-6">
                                {!user && (
                                    <div className="bg-white rounded-2xl shadow-sm p-6">
                                        <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
                                            <div className="flex items-center justify-between flex-wrap gap-3">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                                                        {t('⚠️ Login Required', '⚠️ लॉगिन आवश्यक')}
                                                    </p>
                                                    <p className="text-sm text-yellow-800">
                                                        {t(
                                                            'You must be logged in to submit a blog. Please login first.',
                                                            'ब्लॉग जमा करने के लिए आपको लॉगिन होना आवश्यक है। कृपया पहले लॉगिन करें।'
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLoginModal(true)}
                                                    className="px-6 py-2 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all whitespace-nowrap"
                                                >
                                                    {t('Login Now', 'अभी लॉगिन करें')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Blog Details */}
                                <div className="bg-white rounded-2xl shadow-sm p-6">
                                    <h2 className="text-xl font-bold mb-4 text-royal-blue">
                                        {t('Blog Details', 'ब्लॉग विवरण')}
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Destination', 'स्थान')}
                                            </label>
                                            <select
                                                value={destination}
                                                onChange={(e) => setDestination(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                            >
                                                {destinations.map((d) => (
                                                    <option key={d.value} value={d.value}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Category', 'श्रेणी')}
                                            </label>
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                            >
                                                {categories.map((c) => (
                                                    <option key={c.value} value={c.value}>
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Cover Image */}
                                    <div className="mb-6">
                                        <ImageUploader
                                            onUpload={handleCoverUpload}
                                            currentImage={coverImage}
                                            onImageChange={setCoverImage}
                                            label={t('Cover Image', 'कवर इमेज')}
                                        />
                                    </div>

                                    {/* Title */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Title (English)
                                        </label>
                                        <input
                                            type="text"
                                            value={titleEn}
                                            onChange={(e) => setTitleEn(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                            placeholder="My Amazing Trip to Jaipur"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Title (Hindi - Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={titleHi}
                                            onChange={(e) => setTitleHi(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                            placeholder="जयपुर की मेरी अद्भुत यात्रा"
                                        />
                                    </div>

                                    {/* Excerpt */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Short Excerpt (English)
                                        </label>
                                        <textarea
                                            value={excerptEn}
                                            onChange={(e) => setExcerptEn(e.target.value)}
                                            required
                                            rows={2}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                            placeholder="A brief summary of your blog..."
                                        />
                                    </div>

                                    {/* Rich Text Editor */}
                                    <div className="mb-6 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-gray-700">
                                                    {t('Your Story', 'आपकी कहानी')}
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {t(
                                                        'Use headings, lists and images to make your story engaging.',
                                                        'अपनी कहानी को और रोचक बनाने के लिए हेडिंग, लिस्ट और इमेज का उपयोग करें।'
                                                    )}
                                                </p>
                                            </div>
                                            <div className="hidden md:flex flex-col items-end text-xs text-gray-500">
                                                <span>
                                                    {t('Words', 'शब्द')}: <span className="font-semibold">{wordCount}</span>
                                                </span>
                                                <span>
                                                    {t('Reading time', 'पढ़ने का समय')}: <span className="font-semibold">{readingTimeMinutes || 1}</span> min
                                                </span>
                                            </div>
                                        </div>
                                        <TipTapEditor
                                            content={contentEn}
                                            onChange={setContentEn}
                                            placeholder={t(
                                                'Start typing your travel story... You can add images, headings and more.',
                                                'अपनी यात्रा की कहानी लिखना शुरू करें... आप इमेज, हेडिंग और बहुत कुछ जोड़ सकते हैं।'
                                            )}
                                            onImageUpload={handleImageUpload}
                                        />
                                        <div className="mt-2 flex items-center justify-between md:hidden text-xs text-gray-500">
                                            <span>
                                                {t('Words', 'शब्द')}: <span className="font-semibold">{wordCount}</span>
                                            </span>
                                            <span>
                                                {t('Reading time', 'पढ़ने का समय')}: <span className="font-semibold">{readingTimeMinutes || 1}</span> min
                                            </span>
                                        </div>
                                    </div>

                                    {/* Uploaded Images Gallery */}
                                    <ImageGallery
                                        images={uploadedImages}
                                        onRemove={handleRemoveImage}
                                        onInsert={handleInsertImage}
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting || !sessionReady}
                                    className="w-full py-4 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-bold rounded-lg text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {!user
                                        ? t('Please Login First', 'कृपया पहले लॉगिन करें')
                                        : !sessionReady
                                            ? t('Verifying Session...', 'सत्र सत्यापित किया जा रहा है...')
                                            : submitting
                                                ? t('Submitting...', 'जमा हो रहा है...')
                                                : isAdminUser
                                                    ? t('Publish Blog Now', 'अभी ब्लॉग प्रकाशित करें')
                                                    : t('Submit Blog for Review', 'समीक्षा के लिए ब्लॉग जमा करें')}
                                </button>

                                <p className="text-center text-gray-500 text-sm">
                                    {isAdminUser
                                        ? t('You are logged in as admin. Your blog will be published immediately.', 'आप व्यवस्थापक के रूप में लॉग इन हैं। आपका ब्लॉग तुरंत प्रकाशित किया जाएगा।')
                                        : t(
                                            'Your blog will be reviewed by our team before publishing',
                                            'प्रकाशन से पहले हमारी टीम द्वारा आपके ब्लॉग की समीक्षा की जाएगी'
                                        )
                                    }
                                </p>
                            </div>

                            {/* Right Column - Live Preview */}
                            <div className="lg:sticky lg:top-24 lg:self-start">
                                <LivePreview
                                    title={titleEn}
                                    coverImage={coverImage}
                                    content={contentEn}
                                    category={category}
                                    authorName={user?.user_metadata?.name || user?.email?.split('@')[0] || 'Traveler'}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}
