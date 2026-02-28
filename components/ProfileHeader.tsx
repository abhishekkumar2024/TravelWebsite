'use client';

import { useState, useEffect, useRef } from 'react';
import { uploadAvatar } from '@/lib/upload';
import { useLanguage } from './LanguageProvider';
import Image from 'next/image';
import Link from 'next/link';

interface ProfileHeaderProps {
    userId: string;
    email: string;
    onProfileUpdate?: () => void;
}

export default function ProfileHeader({ userId, email, onProfileUpdate }: ProfileHeaderProps) {
    const { t } = useLanguage();
    const [profile, setProfile] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        try {
            const res = await fetch(`/api/profile/?userId=${encodeURIComponent(userId)}`);
            const data = await res.json();
            if (data.profile) {
                setProfile(data.profile);
                setNewName(data.profile.name || '');
            }
        } catch (e) {
            console.error('Failed to load profile:', e);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadAvatar(file);
            await fetch('/api/profile/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates: { avatar_url: url } }),
            });
            await loadProfile();
            if (onProfileUpdate) onProfileUpdate();
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            alert(t('Failed to upload profile picture', 'प्रोफ़ाइल चित्र अपलोड करने में विफल'));
        } finally {
            setUploading(false);
        }
    };

    const handleNameSave = async () => {
        if (!newName.trim()) return;
        try {
            await fetch('/api/profile/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates: { name: newName } }),
            });
            await loadProfile();
            setIsEditing(false);
            if (onProfileUpdate) onProfileUpdate();
        } catch (error) {
            console.error('Failed to update name:', error);
        }
    };

    if (!profile) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg relative bg-gray-100">
                    {profile.avatar_url ? (
                        <Image
                            src={profile.avatar_url}
                            alt={profile.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-3xl font-bold">
                            {profile.name?.charAt(0).toUpperCase() || email.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </div>
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>

            <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="px-3 py-1 border rounded-lg text-lg font-bold"
                            autoFocus
                        />
                        <button
                            onClick={handleNameSave}
                            className="p-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        >
                            ✓
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 justify-center md:justify-start">
                        {profile.name || 'Traveler'}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-gray-400 hover:text-indigo-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </h2>
                )}
                <p className="text-gray-500">{email}</p>
                <div className="mt-2 flex gap-2 justify-center md:justify-start text-sm text-gray-400">
                    <span>{t('Member since', 'सदस्यता तिथि')} {new Date(profile.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex gap-4 justify-center md:justify-start">
                    <Link href="/profile" className="px-4 py-2 bg-royal-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit Full Profile & SEO
                    </Link>
                </div>
            </div>
        </div>
    );
}
