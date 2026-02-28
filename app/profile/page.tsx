'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getAuthorProfile, updateAuthorProfile, ensureAuthorExists, Author } from '@/lib/db/queries';
import Link from 'next/link';

export default function ProfilePage() {
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [author, setAuthor] = useState<Author | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<Author>>({
        name: '',
        bio: '',
        slug: '',
        website: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: ''
    });

    useEffect(() => {
        if (sessionStatus === 'loading') return;

        const sessionUser = session?.user as any;
        if (!sessionUser) {
            router.push('/admin'); // Redirect to login
            return;
        }

        async function loadProfile() {
            try {
                const userId = sessionUser.id;
                // Ensure author row exists
                await ensureAuthorExists(
                    userId,
                    sessionUser.name || sessionUser.email?.split('@')[0] || 'Traveler',
                    sessionUser.email || '',
                    sessionUser.image
                );
                const profile = await getAuthorProfile(userId);

                if (profile) {
                    setAuthor(profile);
                    setFormData({
                        name: profile.name || '',
                        bio: profile.bio || '',
                        slug: profile.slug || '',
                        website: profile.website || '',
                        twitter: profile.twitter || '',
                        instagram: profile.instagram || '',
                        linkedin: profile.linkedin || '',
                        youtube: profile.youtube || ''
                    });
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [sessionStatus, session, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!author) return;

        setSaving(true);
        setMessage(null);

        try {
            const result = await updateAuthorProfile(author.id, formData);
            if (result.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                if (result.data) {
                    setAuthor(result.data as Author);
                }
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile: ' + result.error });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: 'An error occurred: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-royal-blue"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
                        <p className="mt-2 text-gray-600">Manage your author bio and social links for SEO.</p>
                    </div>
                    <Link href="/admin" className="text-royal-blue hover:text-blue-700 font-medium">
                        ← Back to Dashboard
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {message && (
                            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Basic Info */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Basic Info</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Username / Slug
                                        <span className="text-xs text-gray-400 font-normal ml-2">(camelthar.com/author/<b>username</b>)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                        placeholder="johndoe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                    placeholder="Tell readers about your travel experience..."
                                />
                                <p className="mt-1 text-xs text-gray-500">Keep it short and engaging (approx. 150-200 chars recommended).</p>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Social & Web</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Personal Website</label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                    placeholder="https://"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label>
                                    <input
                                        type="url"
                                        name="twitter"
                                        value={formData.twitter}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                        placeholder="https://twitter.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                                    <input
                                        type="url"
                                        name="instagram"
                                        value={formData.instagram}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        name="linkedin"
                                        value={formData.linkedin}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                                    <input
                                        type="url"
                                        name="youtube"
                                        value={formData.youtube}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue outline-none transition-all"
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className={`px-8 py-3 bg-royal-blue text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
