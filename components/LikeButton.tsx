'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toggleLike, fetchLikeStatus, fetchLikeCount } from '@/lib/supabaseInteractions';
import LoginModal from './LoginModal';

interface LikeButtonProps {
    blogId: string;
}

export default function LikeButton({ blogId }: LikeButtonProps) {
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            const [status, likeCount] = await Promise.all([
                user ? fetchLikeStatus(blogId, user.id) : Promise.resolve(false),
                fetchLikeCount(blogId)
            ]);

            setLiked(status);
            setCount(likeCount);
            setLoading(false);
        };

        init();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [blogId]);

    const handleLike = async () => {
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        // Optimistic update
        const newLiked = !liked;
        const newCount = newLiked ? count + 1 : count - 1;
        setLiked(newLiked);
        setCount(newCount);

        const { liked: finalLiked, error } = await toggleLike(blogId, user.id);

        if (error) {
            // Revert on error
            setLiked(!newLiked);
            setCount(count);
            alert('Failed to update like status');
        } else {
            setLiked(finalLiked);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-400">
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleLike}
                    className={`flex items-center justify-center p-2 rounded-full transition-all duration-300 ${liked
                            ? 'bg-red-50 text-red-500 scale-110'
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                    title={liked ? 'Unlike' : 'Like'}
                >
                    <svg
                        className={`w-6 h-6 ${liked ? 'fill-current' : 'fill-none'}`}
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                </button>
                <span className={`text-sm font-semibold ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                    {count} {count === 1 ? 'Like' : 'Likes'}
                </span>
            </div>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => {
                    setShowLoginModal(false);
                    // Refresh user state will happen via onAuthStateChange
                }}
            />
        </>
    );
}
