'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useDraft, SubmitDraftData } from '@/hooks/useDraft';
import TipTapEditor from '@/components/editor/TipTapEditor';
import ImageUploader from '@/components/editor/ImageUploader';
import ImageGallery from '@/components/editor/ImageGallery';
// Removed LoginModal import as we are using redirect now
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
    { value: 'ajmer', label: 'Ajmer' },
    { value: 'bikaner', label: 'Bikaner' },
    { value: 'chittorgarh', label: 'Chittorgarh' },
    { value: 'kumbhalgarh', label: 'Kumbhalgarh' },
    { value: 'ranthambore', label: 'Ranthambore' },
    { value: 'bharatpur', label: 'Bharatpur' },
    { value: 'alwar', label: 'Alwar' },
    { value: 'kota', label: 'Kota' },
    { value: 'bundi', label: 'Bundi' },
    { value: 'shekhawati', label: 'Shekhawati' },
    { value: 'rajasthan', label: 'Rajasthan (Other)' },
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
    const router = useRouter();
    const { t } = useLanguage();
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [createdSlug, setCreatedSlug] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    // Removed showLoginModal as we redirect to /login now
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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

    // SEO Fields
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [focusKeyword, setFocusKeyword] = useState('');
    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [showSeoSection, setShowSeoSection] = useState(false);

    // Draft auto-save
    const [showDraftRestoreModal, setShowDraftRestoreModal] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<SubmitDraftData | null>(null);
    const draftInitialized = useRef(false);
    const { saveDraft, loadDraft, clearDraft, scheduleAutoSave, lastSaved, isSaving, hasDraft, getLastSavedText } = useDraft('submit');

    // Load draft on mount
    useEffect(() => {
        if (draftInitialized.current) return;
        draftInitialized.current = true;

        const draft = loadDraft();
        if (draft && draft.savedAt) {
            // Check if draft has meaningful content
            const hasContent = draft.titleEn || draft.contentEn || draft.excerptEn;
            if (hasContent) {
                setPendingDraft(draft);
                setShowDraftRestoreModal(true);
            }
        }
    }, [loadDraft]);

    // Restore draft handler
    const handleRestoreDraft = () => {
        if (pendingDraft) {
            setDestination(pendingDraft.destination || '');
            setCategory(pendingDraft.category || '');
            setTitleEn(pendingDraft.titleEn || '');
            setTitleHi(pendingDraft.titleHi || '');
            setExcerptEn(pendingDraft.excerptEn || '');
            setExcerptHi(pendingDraft.excerptHi || '');
            setContentEn(pendingDraft.contentEn || '');
            setContentHi(pendingDraft.contentHi || '');
            setCoverImage(pendingDraft.coverImage || null);
            setUploadedImages(pendingDraft.uploadedImages || []);
            setMetaTitle(pendingDraft.metaTitle || '');
            setMetaDescription(pendingDraft.metaDescription || '');
            setFocusKeyword(pendingDraft.focusKeyword || '');
            setCanonicalUrl(pendingDraft.canonicalUrl || '');
        }
        setShowDraftRestoreModal(false);
        setPendingDraft(null);
    };

    const handleDiscardDraft = () => {
        clearDraft();
        setShowDraftRestoreModal(false);
        setPendingDraft(null);
    };

    // Auto-save draft when form changes
    useEffect(() => {
        // Only save if there's meaningful content
        const hasContent = titleEn || contentEn || excerptEn;
        if (hasContent && !submitted) {
            scheduleAutoSave({
                destination,
                category,
                titleEn,
                titleHi,
                excerptEn,
                excerptHi,
                contentEn,
                contentHi,
                coverImage,
                uploadedImages,
                metaTitle,
                metaDescription,
                focusKeyword,
                canonicalUrl,
            });
        }
    }, [
        destination, category, titleEn, titleHi, excerptEn, excerptHi,
        contentEn, contentHi, coverImage, uploadedImages, metaTitle,
        metaDescription, focusKeyword, canonicalUrl, submitted, scheduleAutoSave
    ]);

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
            const downloadURL = await uploadBlogImage(file);

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
        const altText = prompt(
            'Describe this image for SEO (e.g., "Hawa Mahal palace in Jaipur at sunset"):\n\nGood alt text helps Google rank your images in search results.',
            titleEn || ''
        );
        // Use the provided alt text, fall back to blog title, then destination
        const finalAlt = altText?.trim() || titleEn || destination || 'Rajasthan travel photo';
        setContentEn((prev) => prev + `<img src="${url}" alt="${finalAlt.replace(/"/g, '&quot;')}" />`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if user is logged in
        if (!user) {
            router.push('/login?redirectTo=/submit');
            return;
        }

        setSubmitting(true);

        try {
            // Safety: strip any base64 images from content before submitting
            // Base64 images can be 5-15 MB each, causing massive payloads and timeouts
            let cleanContentEn = contentEn;
            let cleanContentHi = contentHi || contentEn;

            const base64Pattern = /(<img[^>]*src=["']data:image\/[^"']+["'][^>]*>)/gi;
            const base64MatchesEn = contentEn.match(base64Pattern);
            const base64MatchesHi = cleanContentHi.match(base64Pattern);

            if (base64MatchesEn || base64MatchesHi) {
                const count = (base64MatchesEn?.length || 0) + (base64MatchesHi?.length || 0);
                const proceed = confirm(
                    `⚠️ Found ${count} embedded image(s) in your content that could cause upload to fail or take very long.\n\n` +
                    `These images will be removed. Please use the image upload button (📷) in the toolbar to add images instead.\n\n` +
                    `Click OK to continue submitting without embedded images, or Cancel to go back and fix them.`
                );

                if (!proceed) {
                    setSubmitting(false);
                    return;
                }

                // Strip base64 images
                cleanContentEn = contentEn.replace(base64Pattern, '<!-- image removed: please use upload button -->');
                cleanContentHi = (contentHi || contentEn).replace(base64Pattern, '<!-- image removed: please use upload button -->');
            }
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
                content_en: cleanContentEn,
                content_hi: cleanContentHi,
                coverImage: coverImage || '/images/jaipur-hawa-mahal.webp',
                images: uploadedImages,
                status: (isAdminUser ? 'published' : 'pending') as 'published' | 'pending',
                // SEO Fields
                meta_title: metaTitle || titleEn,
                meta_description: metaDescription || excerptEn,
                focus_keyword: focusKeyword,
                canonical_url: canonicalUrl,
                // Pass verified user ID to skip redundant auth check inside createBlog
                authorId: user.id,
            };

            const { id, slug, error } = await createBlog(blogData);
            if (error || !id) {
                // Check if error is due to authentication
                if (error?.includes('logged in') || error?.includes('authenticated')) {
                    router.push('/login?redirectTo=/submit');
                    return;
                }
                throw new Error(error || 'Unknown error');
            }

            // Clear draft on successful submission
            clearDraft();
            setCreatedSlug(slug || id);
            setSubmitted(true);
        } catch (error: any) {
            console.error('Submit error:', error);
            // Check if error is due to authentication
            if (error?.message?.includes('logged in') || error?.message?.includes('authenticated')) {
                router.push('/login?redirectTo=/submit');
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
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {isAdminUser && createdSlug && (
                                <Link
                                    href={`/blog/${createdSlug}`}
                                    className="inline-block px-6 py-3 bg-desert-gold text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                                >
                                    {t('View Blog', 'ब्लॉग देखें')}
                                </Link>
                            )}
                            <Link
                                href="/"
                                className="inline-block px-6 py-3 bg-royal-blue text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                            >
                                {t('Back to Home', 'होम पर वापस जाएं')}
                            </Link>
                        </div>
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
            {/* Removed LoginModal as we are using a dedicated /login page */}

            {/* Login Prompt Popup */}
            {showLoginPrompt && (
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
                                    router.push('/login?redirectTo=/submit');
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

            {/* Draft Restore Modal */}
            {showDraftRestoreModal && pendingDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {t('Draft Found!', 'ड्राफ्ट मिला!')}
                        </h3>
                        <p className="text-gray-600 mb-2">
                            {t(
                                'You have an unsaved draft from your previous session.',
                                'आपके पिछले सत्र से एक असहेजा ड्राफ्ट है।'
                            )}
                        </p>
                        {pendingDraft.titleEn && (
                            <p className="text-sm text-gray-500 mb-4 italic">
                                "{pendingDraft.titleEn.slice(0, 50)}{pendingDraft.titleEn.length > 50 ? '...' : ''}"
                            </p>
                        )}
                        <p className="text-xs text-gray-400 mb-4">
                            {t('Saved', 'सहेजा गया')}: {new Date(pendingDraft.savedAt).toLocaleString()}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDiscardDraft}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                            >
                                {t('Discard', 'छोड़ें')}
                            </button>
                            <button
                                onClick={handleRestoreDraft}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                            >
                                {t('Restore Draft', 'ड्राफ्ट पुनर्स्थापित करें')}
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
                                    onClick={() => router.push('/login?redirectTo=/submit')}
                                    className="px-8 py-3 bg-white text-royal-blue font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                                >
                                    {t('Login / Sign Up', 'लॉगिन / साइन अप')}
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="max-w-full mx-auto">
                            {/* Full Width Editor */}
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
                                                    onClick={() => router.push('/login?redirectTo=/submit')}
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
                                                {t('Destinations', 'स्थान')}
                                            </label>

                                            {/* Multi-select Tags */}
                                            <div className="mb-2 flex flex-wrap gap-2">
                                                {destination.split(',').filter(Boolean).map((city) => {
                                                    const label = destinations.find(d => d.value === city)?.label || city;
                                                    return (
                                                        <span key={city} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                                            {label}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const validCities = destination.split(',').filter(c => c && c !== city);
                                                                    setDestination(validCities.join(','));
                                                                }}
                                                                className="ml-2 text-blue-600 hover:text-blue-900 focus:outline-none"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                            </div>

                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (!val) return;

                                                    const currentCities = destination.split(',').filter(Boolean);
                                                    if (!currentCities.includes(val)) {
                                                        const newCities = [...currentCities, val];
                                                        setDestination(newCities.join(','));
                                                    }
                                                    // Reset select to empty by keeping value="" and handling change
                                                }}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                            >
                                                <option value="">{t('Add a destination...', 'एक गंतव्य जोड़ें...')}</option>
                                                {destinations.filter(d => d.value && !destination.split(',').includes(d.value)).map((d) => (
                                                    <option key={d.value} value={d.value}>
                                                        {d.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {t('You can select multiple cities.', 'आप कई शहरों का चयन कर सकते हैं।')}
                                            </p>
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
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Title (English)
                                            </label>
                                            <span className={`text-xs font-medium ${titleEn.length > 0 && titleEn.length <= 60
                                                ? 'text-green-600'
                                                : titleEn.length > 60
                                                    ? 'text-orange-500'
                                                    : 'text-gray-400'
                                                }`}>
                                                {titleEn.length}/60
                                            </span>
                                        </div>
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
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Short Excerpt (English)
                                            </label>
                                            <span className={`text-xs font-medium ${excerptEn.length >= 150 && excerptEn.length <= 160
                                                ? 'text-green-600'
                                                : excerptEn.length > 160
                                                    ? 'text-orange-500'
                                                    : 'text-gray-400'
                                                }`}>
                                                {excerptEn.length}/160
                                            </span>
                                        </div>
                                        <textarea
                                            value={excerptEn}
                                            onChange={(e) => setExcerptEn(e.target.value)}
                                            required
                                            rows={2}
                                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-desert-gold ${excerptEn.length >= 150 && excerptEn.length <= 160
                                                ? 'border-green-200'
                                                : 'border-gray-200'
                                                }`}
                                            placeholder="A brief summary of your blog..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {t('Ideal length: 150-160 characters for best SEO.', 'आदर्श लंबाई: सर्वश्रेष्ठ एसईओ के लिए 150-160 अक्षर।')}
                                        </p>
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

                                    {/* SEO Optimization Section */}
                                    <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
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
                                                {/* Meta Title */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="font-semibold text-gray-700">
                                                            {t('Meta Title', 'मेटा शीर्षक')}
                                                        </label>
                                                        <span className={`text-xs font-medium ${metaTitle.length >= 50 && metaTitle.length <= 60
                                                            ? 'text-green-600'
                                                            : metaTitle.length > 60
                                                                ? 'text-red-500'
                                                                : 'text-orange-500'
                                                            }`}>
                                                            {metaTitle.length}/60
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={metaTitle}
                                                        onChange={(e) => setMetaTitle(e.target.value)}
                                                        placeholder={titleEn || t('Enter meta title for search engines...', 'खोज इंजन के लिए मेटा शीर्षक दर्ज करें...')}
                                                        maxLength={60}
                                                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${metaTitle.length >= 50 && metaTitle.length <= 60
                                                            ? 'border-green-200 focus:border-green-500'
                                                            : 'border-gray-200 focus:border-royal-blue'
                                                            }`}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                                        <span>{t('Ideal: 50-60 characters.', 'आदर्श: 50-60 अक्षर।')}</span>
                                                        {metaTitle.length < 50 && (
                                                            <span className="text-orange-500">{t('Too short', 'बहुत छोटा')}</span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Meta Description */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="font-semibold text-gray-700">
                                                            {t('Meta Description', 'मेटा विवरण')}
                                                        </label>
                                                        <span className={`text-xs font-medium ${metaDescription.length >= 150 && metaDescription.length <= 160
                                                            ? 'text-green-600'
                                                            : metaDescription.length > 160
                                                                ? 'text-red-500'
                                                                : 'text-orange-500'
                                                            }`}>
                                                            {metaDescription.length}/160
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        value={metaDescription}
                                                        onChange={(e) => setMetaDescription(e.target.value)}
                                                        placeholder={excerptEn || t('Enter a compelling description for search engines...', 'खोज इंजन के लिए आकर्षक विवरण दर्ज करें...')}
                                                        maxLength={160}
                                                        rows={3}
                                                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all resize-none ${metaDescription.length >= 150 && metaDescription.length <= 160
                                                            ? 'border-green-200 focus:border-green-500'
                                                            : 'border-gray-200 focus:border-royal-blue'
                                                            }`}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                                        <span>{t('Ideal: 150-160 characters.', 'आदर्श: 150-160 अक्षर।')}</span>
                                                        {metaDescription.length < 150 && (
                                                            <span className="text-orange-500">{t('Too short', 'बहुत छोटा')}</span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Focus Keyword */}
                                                <div>
                                                    <label className="block mb-2 font-semibold text-gray-700">
                                                        {t('Focus Keyword', 'फोकस कीवर्ड')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={focusKeyword}
                                                        onChange={(e) => setFocusKeyword(e.target.value)}
                                                        placeholder={t('e.g., "Jaipur travel guide" or "Rajasthan budget trip"', 'जैसे, "जयपुर यात्रा गाइड" या "राजस्थान बजट यात्रा"')}
                                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue transition-all"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {t('The main keyword you want this post to rank for.', 'मुख्य कीवर्ड जिसके लिए आप चाहते हैं कि यह पोस्ट रैंक करे।')}
                                                    </p>
                                                </div>

                                                {/* SEO Tips */}
                                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                                                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                        <span>💡</span> {t('SEO Tips', 'एसईओ सुझाव')}
                                                    </h4>
                                                    <ul className="text-sm text-gray-600 space-y-1">
                                                        <li>• {t('Include your focus keyword in the title and first paragraph', 'शीर्षक और पहले पैराग्राफ में अपना फोकस कीवर्ड शामिल करें')}</li>
                                                        <li>• {t('Use H1, H2, H3 headings to structure your content', 'अपनी सामग्री को संरचित करने के लिए H1, H2, H3 हेडिंग का उपयोग करें')}</li>
                                                        <li>• {t('Add alt text to images (we do this automatically)', 'छवियों में alt टेक्स्ट जोड़ें (हम यह स्वचालित रूप से करते हैं)')}</li>
                                                        <li>• {t('Write at least 300 words for better SEO', 'बेहतर SEO के लिए कम से कम 300 शब्द लिखें')}</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Draft Status Indicator */}
                                {(isSaving || lastSaved) && (
                                    <div className="flex items-center justify-center gap-2 py-2 text-sm">
                                        {isSaving ? (
                                            <>
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                                <span className="text-yellow-600">
                                                    {t('Saving draft...', 'ड्राफ्ट सहेजा जा रहा है...')}
                                                </span>
                                            </>
                                        ) : lastSaved ? (
                                            <>
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-green-600">
                                                    {t('Draft saved', 'ड्राफ्ट सहेजा गया')} • {getLastSavedText()}
                                                </span>
                                            </>
                                        ) : null}
                                    </div>
                                )}

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
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}
