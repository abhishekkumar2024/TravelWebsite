'use client';

import { useState, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import TipTapEditor from '@/components/editor/TipTapEditor';
import LivePreview from '@/components/editor/LivePreview';
import ImageUploader from '@/components/editor/ImageUploader';
import ImageGallery from '@/components/editor/ImageGallery';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

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

    // Form state
    const [authorName, setAuthorName] = useState('');
    const [authorEmail, setAuthorEmail] = useState('');
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

    // Real Firebase Storage upload function
    const handleImageUpload = useCallback(async (file: File): Promise<string> => {
        try {
            console.log('Starting upload for:', file.name);
            // Create a unique file name
            const fileName = `blog-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = ref(storage, fileName);

            console.log('Uploading to Ref:', storageRef.fullPath);

            // Upload file to Firebase Storage
            const snapshot = await uploadBytes(storageRef, file);
            console.log('Upload complete, getting URL...');

            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log('Got URL:', downloadURL);

            // Add to uploaded images list
            setUploadedImages((prev) => [...prev, downloadURL]);

            return downloadURL;
        } catch (error: any) {
            console.error('Error uploading image:', error);

            // Helpful error messages
            let message = 'Failed to upload image.';
            if (error.code === 'storage/unauthorized') {
                message = 'Permission denied. Check your Firebase Storage rules.';
            } else if (error.code === 'storage/canceled') {
                message = 'Upload canceled.';
            } else if (error.code === 'storage/unknown') {
                message = 'Unknown error occurred. Check CORS configuration.';
            }

            alert(`${message} \n\nCheck console for details.`);

            // Mock success for development if real upload fails (Optional, removing for now to force fix)
            // return 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800';
            throw error;
        }
    }, []);

    const handleCoverUpload = useCallback(async (file: File): Promise<string> => {
        try {
            // Create a unique file name for cover image
            const fileName = `blog-covers/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, fileName);

            // Upload file to Firebase Storage
            const snapshot = await uploadBytes(storageRef, file);

            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);

            return downloadURL;
        } catch (error) {
            console.error('Error uploading cover image:', error);
            throw new Error('Failed to upload cover image');
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
            // In production, this would save to Firestore
            const blogData = {
                author: { name: authorName, email: authorEmail },
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
                status: 'pending',
                createdAt: new Date(),
            };

            // Save to Firestore
            await addDoc(collection(db, 'blogs'), blogData);

            setSubmitted(true);
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit. Please try again.');
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
                            {t(
                                "Your blog has been submitted successfully and is under review. We'll notify you once it's published.",
                                'आपका ब्लॉग सफलतापूर्वक जमा हो गया है और समीक्षाधीन है। प्रकाशित होने पर हम आपको सूचित करेंगे।'
                            )}
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

    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white">
                <div className="max-w-4xl mx-auto text-center">
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
            </section>

            {/* Form Section */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column - Editor */}
                            <div className="space-y-6">
                                {/* Author Info */}
                                <div className="bg-white rounded-2xl shadow-sm p-6">
                                    <h2 className="text-xl font-bold mb-4 text-royal-blue">
                                        {t('Author Information', 'लेखक की जानकारी')}
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Your Name', 'आपका नाम')}
                                            </label>
                                            <input
                                                type="text"
                                                value={authorName}
                                                onChange={(e) => setAuthorName(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                                placeholder="Rahul Sharma"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Your Email', 'आपका ईमेल')}
                                            </label>
                                            <input
                                                type="email"
                                                value={authorEmail}
                                                onChange={(e) => setAuthorEmail(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-desert-gold"
                                                placeholder="rahul@example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

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
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Content (English)
                                        </label>
                                        <TipTapEditor
                                            content={contentEn}
                                            onChange={setContentEn}
                                            placeholder="Write your travel story here... Use the toolbar to format text, add headings, and insert images."
                                            onImageUpload={handleImageUpload}
                                        />
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
                                    disabled={submitting}
                                    className="w-full py-4 bg-gradient-to-r from-desert-gold to-[#B8922F] text-white font-bold rounded-lg text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting
                                        ? 'Submitting...'
                                        : t('Submit Blog for Review', 'समीक्षा के लिए ब्लॉग जमा करें')}
                                </button>

                                <p className="text-center text-gray-500 text-sm">
                                    {t(
                                        'Your blog will be reviewed by our team before publishing',
                                        'प्रकाशन से पहले हमारी टीम द्वारा आपके ब्लॉग की समीक्षा की जाएगी'
                                    )}
                                </p>
                            </div>

                            {/* Right Column - Live Preview */}
                            <div className="lg:sticky lg:top-24 lg:self-start">
                                <LivePreview
                                    title={titleEn}
                                    coverImage={coverImage}
                                    content={contentEn}
                                    category={category}
                                    authorName={authorName}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </>
    );
}
