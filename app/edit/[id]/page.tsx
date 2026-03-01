
'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { useDraft, EditDraftData } from '@/hooks/useDraft';
import TipTapEditor from '@/components/editor/TipTapEditor';
import ImageUploader from '@/components/editor/ImageUploader';
import ImageGallery from '@/components/editor/ImageGallery';
// Removed LoginModal
import { uploadBlogImage, uploadCoverImage, deleteMedia, extractPublicIdFromUrl } from '@/lib/upload';
import { fetchBlogById, updateBlog } from '@/lib/db/queries/blogs';
import { SubmitLogger } from '@/lib/submitLogger';
import { useSession } from 'next-auth/react';
import { isAdmin } from '@/lib/db/queries/admin';

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

export default function EditBlogPage({ params }: { params: { id: string } }) {
    const { t } = useLanguage();
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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

    const [canonicalUrl, setCanonicalUrl] = useState('');
    const [showSeoSection, setShowSeoSection] = useState(false);

    // Draft auto-save
    const [showDraftRestoreModal, setShowDraftRestoreModal] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<EditDraftData | null>(null);
    const draftInitialized = useRef(false);
    const blogDataLoaded = useRef(false);
    // Track original data to compute diffs on submit (only send changed fields)
    const originalData = useRef<{
        titleEn: string; titleHi: string; excerptEn: string; excerptHi: string;
        contentEn: string; contentHi: string; destination: string; category: string;
        coverImage: string; images: string[];
        metaTitle: string; metaDescription: string; canonicalUrl: string;
    }>({
        titleEn: '', titleHi: '', excerptEn: '', excerptHi: '',
        contentEn: '', contentHi: '', destination: '', category: '',
        coverImage: '', images: [],
        metaTitle: '', metaDescription: '', canonicalUrl: '',
    });
    const { saveDraft, loadDraft, clearDraft, scheduleAutoSave, lastSaved, isSaving, hasDraft, getLastSavedText } = useDraft('edit', params.id);

    const { data: session, status: sessionStatus } = useSession();

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        const sessionUser = session?.user as any;

        if (!sessionUser) {
            router.push(`/login?redirectTo=/edit/${params.id}`);
            return;
        }

        const initializePage = async () => {
            // CRITICAL: Only load blog data ONCE
            if (blogDataLoaded.current) return;

            setLoading(true);
            try {
                setUser(sessionUser);
                const isUserAdmin = await isAdmin(sessionUser.role);
                setIsAdminUser(isUserAdmin);

                // Load Blog Data
                const blog = await fetchBlogById(params.id);
                if (!blog) {
                    alert('Blog not found!');
                    router.push('/my-blogs');
                    return;
                }

                // Pre-fill form
                setTitleEn(blog.title_en);
                setTitleHi(blog.title_hi);
                setExcerptEn(blog.excerpt_en);
                setExcerptHi(blog.excerpt_hi);
                setContentEn(blog.content_en);
                setContentHi(blog.content_hi);
                setDestination(blog.destination || '');
                setCategory(blog.category || '');
                setCoverImage(blog.coverImage);
                setUploadedImages(blog.images || []);
                setCurrentStatus(blog.status);

                // SEO
                setMetaTitle(blog.meta_title || '');
                setMetaDescription(blog.meta_description || '');
                setCanonicalUrl(blog.canonical_url || '');

                // Snapshot original data for diff-based updates
                originalData.current = {
                    titleEn: blog.title_en,
                    titleHi: blog.title_hi,
                    excerptEn: blog.excerpt_en,
                    excerptHi: blog.excerpt_hi,
                    contentEn: blog.content_en,
                    contentHi: blog.content_hi,
                    destination: blog.destination || '',
                    category: blog.category || '',
                    coverImage: blog.coverImage || '',
                    images: blog.images || [],
                    metaTitle: blog.meta_title || '',
                    metaDescription: blog.meta_description || '',
                    canonicalUrl: blog.canonical_url || '',
                };

                // Mark blog data as loaded for draft comparison
                blogDataLoaded.current = true;
            } catch (error) {
                console.error('Error loading blog:', error);
                alert('Error loading blog data');
            } finally {
                setLoading(false);
            }
        };

        initializePage();
    }, [params.id, router, sessionStatus, session]);

    // Check for draft after blog data loads
    useEffect(() => {
        if (!blogDataLoaded.current || draftInitialized.current || loading) return;
        draftInitialized.current = true;

        const draft = loadDraft() as EditDraftData | null;
        if (draft && draft.savedAt && draft.blogId === params.id) {
            // Check if draft has changes from saved blog data
            const hasChanges = draft.titleEn !== titleEn ||
                draft.contentEn !== contentEn ||
                draft.excerptEn !== excerptEn;
            if (hasChanges && (draft.titleEn || draft.contentEn || draft.excerptEn)) {
                setPendingDraft(draft);
                setShowDraftRestoreModal(true);
            }
        }
    }, [loadDraft, params.id, loading, titleEn, contentEn, excerptEn]);

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
        // Only save if blog data has been loaded and there's meaningful content
        if (!blogDataLoaded.current) return;

        const hasContent = titleEn || contentEn || excerptEn;
        if (hasContent && !submitted) {
            scheduleAutoSave({
                blogId: params.id,
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

                canonicalUrl,
            });
        }
    }, [
        params.id, destination, category, titleEn, titleHi, excerptEn, excerptHi,
        contentEn, contentHi, coverImage, uploadedImages, metaTitle,
        metaDescription, canonicalUrl, submitted, scheduleAutoSave
    ]);

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

    const handleImageUpload = useCallback(async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
        try {
            const downloadURL = await uploadBlogImage(file, onProgress);
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
        const altText = prompt(
            'Describe this image for SEO (e.g., "Hawa Mahal palace in Jaipur at sunset"):\n\nGood alt text helps Google rank your images in search results.',
            titleEn || ''
        );
        const finalAlt = altText?.trim() || titleEn || destination || 'Rajasthan travel photo';
        setContentEn((prev) => prev + `<img src="${url}" alt="${finalAlt.replace(/"/g, '&quot;')}" />`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const logger = new SubmitLogger('edit', user?.id || '', user?.email || '');

        try {
            // Stage 1: Base64 cleanup
            logger.startStage('base64_cleanup');
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
                    `Click OK to continue updating without embedded images, or Cancel to go back and fix them.`
                );

                if (!proceed) {
                    setSubmitting(false);
                    return;
                }

                cleanContentEn = contentEn.replace(base64Pattern, '<!-- image removed: please use upload button -->');
                cleanContentHi = (contentHi || contentEn).replace(base64Pattern, '<!-- image removed: please use upload button -->');
            }
            logger.endStage('base64_cleanup');

            // Stage 2: Image filtering
            logger.startStage('image_filtering');
            const allContent = cleanContentEn + (cleanContentHi || '');
            const usedImages = uploadedImages.filter(url => allContent.includes(url) || url === coverImage);
            const orphanedImages = uploadedImages.filter(url => !allContent.includes(url) && url !== coverImage);
            logger.endStage('image_filtering');

            // Stage 3: Build payload (diff-based)
            logger.startStage('payload_build');
            const payload: Record<string, any> = {};

            if (titleEn !== originalData.current.titleEn) payload.title_en = titleEn;
            if (titleHi !== originalData.current.titleHi) payload.title_hi = titleHi;
            if (excerptEn !== originalData.current.excerptEn) payload.excerpt_en = excerptEn;
            if (excerptHi !== originalData.current.excerptHi) payload.excerpt_hi = excerptHi;
            if (cleanContentEn !== originalData.current.contentEn) payload.content_en = cleanContentEn;
            if (cleanContentHi !== originalData.current.contentHi) payload.content_hi = cleanContentHi;
            if (destination !== originalData.current.destination) payload.destination = destination;
            if (category !== originalData.current.category) payload.category = category;
            if ((coverImage || '') !== (originalData.current.coverImage || '')) payload.coverImage = coverImage || undefined;
            if (JSON.stringify(usedImages) !== JSON.stringify(originalData.current.images)) payload.images = usedImages;
            if (currentStatus === 'rejected') payload.status = 'pending';
            if (metaTitle !== originalData.current.metaTitle) payload.meta_title = metaTitle;
            if (metaDescription !== originalData.current.metaDescription) payload.meta_description = metaDescription;
            if (canonicalUrl !== originalData.current.canonicalUrl) payload.canonical_url = canonicalUrl;

            const changedKeys = Object.keys(payload);
            logger.endStage('payload_build');

            if (changedKeys.length === 0) {
                setSubmitted(true);
                clearDraft();
                logger.save({ status: 'success', blogId: params.id });
                return;
            }

            // Stage 4: Database update
            logger.startStage('database_update');
            const payloadSize = new Blob([JSON.stringify(payload)]).size;
            const payloadSizeKB = (payloadSize / 1024).toFixed(1);
            if (payloadSize > 400 * 1024) {
                console.warn(`[Update] ⚠️ Large payload: ${payloadSizeKB}KB`);
            }

            const updatePromise = updateBlog(params.id, payload);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(
                    `Update timed out after 30 seconds. Your content may be too large (${payloadSizeKB}KB). ` +
                    `Try reducing images or content size and try again.`
                )), 30000)
            );
            const result = await Promise.race([updatePromise, timeoutPromise]);
            logger.endStage('database_update');

            if (!result.success) {
                throw new Error(result.error || 'Update failed');
            }

            // Stage 5: Orphan cleanup
            logger.startStage('orphan_cleanup');
            if (orphanedImages.length > 0) {
                orphanedImages.forEach(url => {
                    const publicId = extractPublicIdFromUrl(url);
                    if (publicId) {
                        const type = url.includes('/video/') ? 'video' : 'image';
                        deleteMedia(publicId, type).catch(() => { });
                    }
                });
            }
            logger.endStage('orphan_cleanup');

            // Stage 6: Cache revalidation
            logger.startStage('cache_revalidation');
            const slug = result.slug || params.id;
            fetch('/api/revalidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paths: [`/blogs/${slug}`, '/blogs', '/'],
                    tags: ['blogs'],
                }),
            }).catch(err => console.warn('[Revalidate] Non-critical error:', err));
            logger.endStage('cache_revalidation');

            // Update originalData to reflect new state
            originalData.current = {
                titleEn, titleHi, excerptEn, excerptHi,
                contentEn: cleanContentEn, contentHi: cleanContentHi,
                destination, category,
                coverImage: coverImage || '',
                images: usedImages,
                metaTitle, metaDescription, canonicalUrl,
            };

            // Calculate word count for logging
            const logWordCount = cleanContentEn.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;

            // Save performance log to Supabase (non-blocking)
            logger.save({
                blogId: params.id,
                blogSlug: slug,
                payloadSizeKB: parseFloat(payloadSizeKB),
                contentWordCount: logWordCount,
                imagesCount: usedImages.length,
                orphanedImagesCount: orphanedImages.length,
                status: 'success',
            });

            setSubmitted(true);
            clearDraft();
        } catch (error: any) {
            console.error('Submit error:', error);

            // Save error log to Supabase
            logger.save({
                blogId: params.id,
                status: 'error',
                errorMessage: error?.message || 'Unknown error',
            });

            alert(
                error.message?.includes('timed out')
                    ? error.message
                    : t('Failed to update. Please try again.', 'अपडेट करने में विफल। कृपया पुनः प्रयास करें।')
            );
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
                            {t('Unsaved Changes Found!', 'असहेजे परिवर्तन मिले!')}
                        </h3>
                        <p className="text-gray-600 mb-2">
                            {t(
                                'You have unsaved changes from your previous editing session.',
                                'आपके पिछले संपादन सत्र से असहेजे परिवर्तन हैं।'
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
                                {t('Restore Changes', 'परिवर्तन पुनर्स्थापित करें')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                                <div className="mb-6">
                                    <ImageUploader
                                        onUpload={handleCoverUpload}
                                        currentImage={coverImage}
                                        onImageChange={setCoverImage}
                                        label={t('Cover Image', 'कवर इमेज')}
                                    />
                                </div>

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
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t('Ideal length: 150-160 characters for best SEO.', 'आदर्श लंबाई: सर्वश्रेष्ठ एसईओ के लिए 150-160 अक्षर।')}
                                    </p>
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
                                                    maxLength={60}
                                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${metaTitle.length >= 50 && metaTitle.length <= 60
                                                        ? 'border-green-200 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-royal-blue'
                                                        }`}
                                                />
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {t('Ideal: 50-60 characters. Appears in browser tabs and search results.', 'आदर्श: 50-60 अक्षर। ब्राउज़र टैब और खोज परिणामों में दिखाई देता है।')}
                                                </p>
                                            </div>
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
                                                    maxLength={160}
                                                    rows={3}
                                                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all resize-none ${metaDescription.length >= 150 && metaDescription.length <= 160
                                                        ? 'border-green-200 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-royal-blue'
                                                        }`}
                                                />
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {t('Ideal: 150-160 characters. This appears below your title in search results.', 'आदर्श: 150-160 अक्षर। यह खोज परिणामों में आपके शीर्षक के नीचे दिखाई देता है।')}
                                                </p>
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
                                                {t('Saving changes...', 'परिवर्तन सहेजे जा रहे हैं...')}
                                            </span>
                                        </>
                                    ) : lastSaved ? (
                                        <>
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-green-600">
                                                {t('Changes saved', 'परिवर्तन सहेजे गए')} • {getLastSavedText()}
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            )}

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
                </div >
            </section >
        </>
    );
}
