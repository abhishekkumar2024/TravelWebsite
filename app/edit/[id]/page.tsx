
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import TipTapEditor from '@/components/editor/TipTapEditor';
import ImageUploader from '@/components/editor/ImageUploader';
import ImageGallery from '@/components/editor/ImageGallery';
import LoginModal from '@/components/LoginModal';
import { uploadBlogImage, uploadCoverImage } from '@/lib/upload';
import { fetchBlogById, updateBlog } from '@/lib/supabaseBlogs';
import { supabase } from '@/lib/supabaseClient';
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

export default function EditBlogPage({ params }: { params: { id: string } }) {
    const { t } = useLanguage();
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
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
    const [currentStatus, setCurrentStatus] = useState<string>('pending');

    // SEO Fields
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [focusKeyword, setFocusKeyword] = useState('');
    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [showSeoSection, setShowSeoSection] = useState(false);

    useEffect(() => {
        const init = async () => {
            // 1. Check User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/submit?login=true');
                return;
            }
            setUser(user);
            const isAdm = await isAdmin();
            setIsAdminUser(isAdm);

            // 2. Load Blog Data
            try {
                const blog = await fetchBlogById(params.id);
                if (!blog) {
                    alert('Blog not found!');
                    router.push('/my-blogs');
                    return;
                }

                // Verify ownership
                // Note: blog object doesn't strictly have author_id in the interface, 
                // but supabase fetch returns it. We might need to check logic carefully.
                // Assuming RLS allows reading own blogs.
                // Ideally passing author_id in FetchBlogById response would be better, 
                // but for now relying on user context or admin.

                // Pre-fill form
                setTitleEn(blog.title_en);
                setTitleHi(blog.title_hi);
                setExcerptEn(blog.excerpt_en);
                setExcerptHi(blog.excerpt_hi);
                setContentEn(blog.content_en);
                setContentHi(blog.content_hi);
                setDestination(blog.destination);
                setCategory(blog.category);
                setCoverImage(blog.coverImage);
                setUploadedImages(blog.images || []);
                setCurrentStatus(blog.status);

                // SEO
                setMetaTitle(blog.meta_title || '');
                setMetaDescription(blog.meta_description || '');
                setFocusKeyword(blog.focus_keyword || '');
                setCanonicalUrl(blog.canonical_url || '');

            } catch (error) {
                console.error('Error fetching blog:', error);
                alert('Error loading blog data');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [params.id, router]);

    // Derived metrics
    const wordCount = useMemo(() => {
        if (!contentEn) return 0;
        const text = contentEn.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) return 0;
        return text.split(' ').length;
    }, [contentEn]);

    const readingTimeMinutes = useMemo(() => {
        if (!wordCount) return 0;
        return Math.max(1, Math.round(wordCount / 200));
    }, [wordCount]);

    const handleImageUpload = useCallback(async (file: File): Promise<string> => {
        try {
            const downloadURL = await uploadBlogImage(file);
            setUploadedImages((prev) => [...prev, downloadURL]);
            return downloadURL;
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. ' + (error.message || ''));
            throw error;
        }
    }, []);

    const handleCoverUpload = useCallback(async (file: File): Promise<string> => {
        try {
            return await uploadCoverImage(file);
        } catch (error: any) {
            console.error('Error uploading cover:', error);
            alert('Failed to upload cover image. ' + (error.message || ''));
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
        setSubmitting(true);

        try {
            const result = await updateBlog(params.id, {
                title_en: titleEn,
                title_hi: titleHi,
                excerpt_en: excerptEn,
                excerpt_hi: excerptHi,
                content_en: contentEn,
                content_hi: contentHi,
                destination,
                category,
                coverImage: coverImage || undefined,
                images: uploadedImages,
                // Keep existing status unless admin changes it? 
                // Usually editing a published blog might require re-approval or stay published.
                // For simplicity, we keep status as is, unless user explicitly requests "Submit for Review".
                // But here we just update content.
                // If it was rejected, maybe set to pending?
                status: currentStatus === 'rejected' ? 'pending' : undefined,

                // SEO
                meta_title: metaTitle,
                meta_description: metaDescription,
                focus_keyword: focusKeyword,
                canonical_url: canonicalUrl,
            });

            if (!result.success) {
                throw new Error(result.error || 'Update failed');
            }

            setSubmitted(true);
        } catch (error: any) {
            console.error('Submit error:', error);
            alert(t('Failed to update. Please try again.', 'अपडेट करने में विफल। कृपया पुनः प्रयास करें।'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('Loading blog data...', 'ब्लॉग डेटा लोड हो रहा है...')}</p>
                </div>
            </section>
        );
    }

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
                        <h2 className="text-2xl font-bold mb-4">{t('Blog Updated!', 'ब्लॉग अपडेट हो गया!')}</h2>
                        <p className="text-gray-600 mb-6">
                            {t('Your changes have been saved successfully.', 'आपके परिवर्तन सफलतापूर्वक सहेज लिए गए हैं।')}
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => router.push('/my-blogs')}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
                            >
                                {t('Back to Dashboard', 'डैशबोर्ड पर वापस जाएं')}
                            </button>
                            <button
                                onClick={() => {
                                    setSubmitted(false);
                                    // Optional: reload data?
                                }}
                                className="px-6 py-3 bg-royal-blue text-white font-semibold rounded-lg transition-all"
                            >
                                {t('Keep Editing', 'संपादन जारी रखें')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <>
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {t('Edit Blog', 'ब्लॉग संपादित करें')}
                    </h1>
                    <p className="text-lg opacity-90">
                        {t('Update your travel story', 'अपनी यात्रा कहानी अपडेट करें')}
                    </p>
                </div>
            </section>

            <section className="py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
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

                                <div className="mb-6">
                                    <ImageUploader
                                        onUpload={handleCoverUpload}
                                        currentImage={coverImage}
                                        onImageChange={setCoverImage}
                                        label={t('Cover Image', 'कवर इमेज')}
                                    />
                                </div>

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
                                    />
                                </div>

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
                                    />
                                </div>

                                <div className="mb-6 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-700">
                                            {t('Your Story', 'आपकी कहानी')}
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
                                        placeholder={t('Start typing...', 'टाइप करना शुरू करें...')}
                                        onImageUpload={handleImageUpload}
                                    />
                                </div>

                                <ImageGallery
                                    images={uploadedImages}
                                    onRemove={handleRemoveImage}
                                    onInsert={handleInsertImage}
                                />

                                {/* SEO Section Reuse */}
                                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowSeoSection(!showSeoSection)}
                                        className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between hover:bg-gray-100 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🔍</span>
                                            <div className="text-left">
                                                <h3 className="font-bold text-gray-800">
                                                    {t('SEO Optimization', 'एसईओ अनुकूलन')}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {t('Improve your search engine visibility', 'अपनी खोज इंजन दृश्यता में सुधार करें')}
                                                </p>
                                            </div>
                                        </div>
                                        <svg
                                            className={`w-5 h-5 text-gray-500 transition-transform ${showSeoSection ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showSeoSection && (
                                        <div className="p-6 space-y-6 border-t border-gray-200">
                                            <div>
                                                <label className="block mb-2 font-semibold text-gray-700">
                                                    {t('Meta Title', 'मेटा शीर्षक')}
                                                    <span className="ml-2 text-xs text-gray-400 font-normal">
                                                        ({metaTitle.length}/60 {t('characters', 'अक्षर')})
                                                    </span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={metaTitle}
                                                    onChange={(e) => setMetaTitle(e.target.value)}
                                                    maxLength={60}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 font-semibold text-gray-700">
                                                    {t('Meta Description', 'मेटा विवरण')}
                                                    <span className="ml-2 text-xs text-gray-400 font-normal">
                                                        ({metaDescription.length}/160 {t('characters', 'अक्षर')})
                                                    </span>
                                                </label>
                                                <textarea
                                                    value={metaDescription}
                                                    onChange={(e) => setMetaDescription(e.target.value)}
                                                    maxLength={160}
                                                    rows={3}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue transition-all resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 font-semibold text-gray-700">
                                                    {t('Focus Keyword', 'फोकस कीवर्ड')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={focusKeyword}
                                                    onChange={(e) => setFocusKeyword(e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-2 font-semibold text-gray-700">
                                                    {t('Canonical URL', 'कैनोनिकल यूआरएल')}
                                                </label>
                                                <input
                                                    type="url"
                                                    value={canonicalUrl}
                                                    onChange={(e) => setCanonicalUrl(e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-bold rounded-lg text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting
                                    ? t('Updating...', 'अपडेट हो रहा है...')
                                    : t('Update Blog', 'ब्लॉग अपडेट करें')}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => router.push('/my-blogs')}
                                    className="text-gray-500 hover:text-gray-700 underline"
                                >
                                    {t('Cancel', 'रद्द करें')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}
