'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface BlogInteractionsContextType {
    // Auth state (shared across all buttons)
    user: any;

    // Like data
    likeCounts: Map<string, number>;
    likedByUser: Set<string>;

    // Comment data
    commentCounts: Map<string, number>;

    // Actions
    handleToggleLike: (blogId: string) => Promise<void>;

    // Loading state
    isLoading: boolean;

    // Register a blog ID to fetch data for
    registerBlogId: (blogId: string) => void;
}

const BlogInteractionsContext = createContext<BlogInteractionsContextType | undefined>(undefined);

interface BlogInteractionsProviderProps {
    children: ReactNode;
    blogIds?: string[];
}

export function BlogInteractionsProvider({ children, blogIds: initialBlogIds = [] }: BlogInteractionsProviderProps) {
    const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
    const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
    const [likedByUser, setLikedByUser] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Track registered blog IDs (for dynamic registration)
    const registeredIdsRef = useRef<Set<string>>(new Set(initialBlogIds));
    const [registeredIds, setRegisteredIds] = useState<string[]>(initialBlogIds);
    const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasFetchedRef = useRef(false);

    // Register blog IDs dynamically (e.g., when BlogCard mounts)
    const registerBlogId = useCallback((blogId: string) => {
        if (registeredIdsRef.current.has(blogId)) return;
        registeredIdsRef.current.add(blogId);

        // Debounce: wait for all cards to register, then trigger a single fetch
        if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = setTimeout(() => {
            setRegisteredIds(Array.from(registeredIdsRef.current));
        }, 50); // 50ms debounce to collect all card registrations
    }, []);

    // Single auth check via NextAuth session
    const { data: session } = useSession();
    const user = session?.user as any;

    // Batch fetch all interaction data via API route
    useEffect(() => {
        if (registeredIds.length === 0) {
            setIsLoading(false);
            return;
        }

        const fetchAllData = async () => {
            setIsLoading(true);

            try {
                const res = await fetch('/api/interactions/batch/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        blogIds: registeredIds,
                        userId: user?.id,
                    }),
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();

                // Convert back from plain objects to Maps/Sets
                const likes = new Map<string, number>();
                Object.entries(data.likes || {}).forEach(([k, v]) => likes.set(k, v as number));

                const comments = new Map<string, number>();
                Object.entries(data.comments || {}).forEach(([k, v]) => comments.set(k, v as number));

                const userLikes = new Set<string>(data.userLikes || []);

                setLikeCounts(likes);
                setCommentCounts(comments);
                setLikedByUser(userLikes);
            } catch (err) {
                console.error('Error fetching blog interactions:', err);
            } finally {
                setIsLoading(false);
                hasFetchedRef.current = true;
            }
        };

        fetchAllData();
    }, [registeredIds, user]);

    // Handle like toggle via API route with optimistic update
    const handleToggleLike = useCallback(async (blogId: string) => {
        if (!user) return; // Should be handled by caller with login modal

        const isCurrentlyLiked = likedByUser.has(blogId);
        const currentCount = likeCounts.get(blogId) || 0;

        // Optimistic update
        setLikedByUser(prev => {
            const next = new Set(prev);
            if (isCurrentlyLiked) next.delete(blogId);
            else next.add(blogId);
            return next;
        });
        setLikeCounts(prev => {
            const next = new Map(prev);
            next.set(blogId, isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1);
            return next;
        });

        // Server call via API route
        try {
            const res = await fetch('/api/interactions/like/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blogId, userId: user.id }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const { liked: finalLiked, error } = await res.json();

            if (error) {
                // Revert on error
                setLikedByUser(prev => {
                    const next = new Set(prev);
                    if (isCurrentlyLiked) next.add(blogId);
                    else next.delete(blogId);
                    return next;
                });
                setLikeCounts(prev => {
                    const next = new Map(prev);
                    next.set(blogId, currentCount);
                    return next;
                });
                alert('Failed to update like status');
                return;
            }

            // Sync with server response
            setLikedByUser(prev => {
                const next = new Set(prev);
                if (finalLiked) next.add(blogId);
                else next.delete(blogId);
                return next;
            });
        } catch (err) {
            // Revert on network error
            setLikedByUser(prev => {
                const next = new Set(prev);
                if (isCurrentlyLiked) next.add(blogId);
                else next.delete(blogId);
                return next;
            });
            setLikeCounts(prev => {
                const next = new Map(prev);
                next.set(blogId, currentCount);
                return next;
            });
            console.error('Error toggling like:', err);
        }
    }, [user, likedByUser, likeCounts]);

    return (
        <BlogInteractionsContext.Provider value={{
            user,
            likeCounts,
            likedByUser,
            commentCounts,
            handleToggleLike,
            isLoading,
            registerBlogId,
        }}>
            {children}
        </BlogInteractionsContext.Provider>
    );
}

export function useBlogInteractions() {
    const context = useContext(BlogInteractionsContext);
    if (context === undefined) {
        throw new Error('useBlogInteractions must be used within a BlogInteractionsProvider');
    }
    return context;
}
