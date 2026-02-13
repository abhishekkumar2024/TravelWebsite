'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toggleLike, fetchLikeStatus, fetchLikeCount } from '@/lib/supabaseInteractions';
import { useLoginModal } from './LoginModalContext';
import { useBlogInteractions } from './BlogInteractionsProvider';

interface LikeButtonProps {
    blogId: string;
    variant?: 'default' | 'compact';
}

export function LikeCount({ blogId }: { blogId: string }) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        fetchLikeCount(blogId).then(setCount);
    }, [blogId]);

    if (count === null) return <span className="animate-pulse opacity-50">...</span>;
    return <span>{count}</span>;
}

export default function LikeButton({ blogId, variant = 'default' }: LikeButtonProps) {
    const isCompact = variant === 'compact';

    // Try to use the batch context (available on list pages)
    let contextData: ReturnType<typeof useBlogInteractions> | null = null;
    try {
        contextData = useBlogInteractions();
    } catch {
        // Not in a provider — fall back to standalone mode (blog detail page)
    }

    if (contextData) {
        return <LikeButtonWithContext blogId={blogId} variant={variant} ctx={contextData} />;
    }

    return <LikeButtonStandalone blogId={blogId} variant={variant} />;
}

// ─── Fast version using batched context (for listing pages) ────────
function LikeButtonWithContext({
    blogId,
    variant,
    ctx,
}: {
    blogId: string;
    variant: 'default' | 'compact';
    ctx: ReturnType<typeof useBlogInteractions>;
}) {
    const isCompact = variant === 'compact';
    const { user, likeCounts, likedByUser, handleToggleLike, isLoading, registerBlogId } = ctx;
    const { openLoginModal, pendingAction, clearPendingAction } = useLoginModal();

    // Register this blogId for batch fetching
    useEffect(() => {
        registerBlogId(blogId);
    }, [blogId, registerBlogId]);

    // Handle pending action after login
    useEffect(() => {
        if (user && pendingAction?.type === 'like' && pendingAction.id === blogId) {
            if (!likedByUser.has(blogId)) {
                handleToggleLike(blogId);
            }
            clearPendingAction();
        }
    }, [user, pendingAction, blogId, likedByUser, handleToggleLike, clearPendingAction]);

    const liked = likedByUser.has(blogId);
    const count = likeCounts.get(blogId) || 0;

    const handleClick = () => {
        if (!user) {
            openLoginModal({
                message: 'Login to like this post',
                pendingAction: { type: 'like', id: blogId },
            });
            return;
        }
        handleToggleLike(blogId);
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-gray-400">
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClick();
                }}
                className={`flex items-center justify-center rounded-full transition-all duration-300 ${isCompact ? 'p-1.5' : 'p-2'} ${liked ? 'bg-red-50 text-red-500 scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title={liked ? 'Unlike' : 'Like'}
            >
                <svg
                    className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} ${liked ? 'fill-current' : 'fill-none'}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
            </button>
            <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                {count}
            </span>
        </div>
    );
}

// ─── Standalone version (for blog detail page, no context needed) ──
function LikeButtonStandalone({ blogId, variant }: { blogId: string; variant: 'default' | 'compact' }) {
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const { openLoginModal, pendingAction, clearPendingAction } = useLoginModal();
    const isCompact = variant === 'compact';

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            const countVal = await fetchLikeCount(blogId);
            setCount(countVal);

            if (user) {
                const status = await fetchLikeStatus(blogId, user.id);
                setLiked(status);
            }
            setLoading(false);
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const newUser = session?.user || null;
            setUser(newUser);

            if (newUser) {
                const status = await fetchLikeStatus(blogId, newUser.id);
                setLiked(status);
            } else {
                setLiked(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [blogId]);

    useEffect(() => {
        if (user && pendingAction?.type === 'like' && pendingAction.id === blogId) {
            const processPendingLike = async () => {
                const isAlreadyLiked = await fetchLikeStatus(blogId, user.id);
                if (!isAlreadyLiked) {
                    await handleLikeInternal(user.id, false, count);
                }
                clearPendingAction();
            };
            processPendingLike();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, pendingAction, blogId]);

    const handleLikeInternal = async (userId: string, currentLiked: boolean, currentCount: number) => {
        const newLiked = !currentLiked;
        const newCount = newLiked ? currentCount + 1 : currentCount - 1;
        setLiked(newLiked);
        setCount(newCount);

        const { liked: finalLiked, error } = await toggleLike(blogId, userId);

        if (error) {
            setLiked(!newLiked);
            setCount(currentCount);
            alert('Failed to update like status');
            return;
        }
        setLiked(finalLiked);
    };

    const handleClick = () => {
        if (!user) {
            openLoginModal({
                message: 'Login to like this post',
                pendingAction: { type: 'like', id: blogId },
            });
            return;
        }
        handleLikeInternal(user.id, liked, count);
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
        <div className="flex items-center gap-2">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClick();
                }}
                className={`flex items-center justify-center rounded-full transition-all duration-300 ${isCompact ? 'p-1.5' : 'p-2'} ${liked ? 'bg-red-50 text-red-500 scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title={liked ? 'Unlike' : 'Like'}
            >
                <svg
                    className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} ${liked ? 'fill-current' : 'fill-none'}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
            </button>
            <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                {count}
            </span>
        </div>
    );
}
