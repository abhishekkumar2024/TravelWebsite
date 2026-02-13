'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchCommentCount } from '@/lib/supabaseInteractions';
import { useBlogInteractions } from './BlogInteractionsProvider';

interface CommentButtonProps {
    blogId: string;
    slug?: string;
    variant?: 'default' | 'compact';
}

export default function CommentButton({ blogId, slug, variant = 'default' }: CommentButtonProps) {
    // Try to use the batch context (available on list pages)
    let contextData: ReturnType<typeof useBlogInteractions> | null = null;
    try {
        contextData = useBlogInteractions();
    } catch {
        // Not in a provider — fall back to standalone mode
    }

    if (contextData) {
        return <CommentButtonWithContext blogId={blogId} slug={slug} variant={variant} ctx={contextData} />;
    }

    return <CommentButtonStandalone blogId={blogId} slug={slug} variant={variant} />;
}

// ─── Fast version using batched context (for listing pages) ────────
function CommentButtonWithContext({
    blogId,
    slug,
    variant,
    ctx,
}: {
    blogId: string;
    slug?: string;
    variant: 'default' | 'compact';
    ctx: ReturnType<typeof useBlogInteractions>;
}) {
    const router = useRouter();
    const isCompact = variant === 'compact';
    const { user, commentCounts, isLoading, registerBlogId } = ctx;

    // Register this blogId for batch fetching
    useEffect(() => {
        registerBlogId(blogId);
    }, [blogId, registerBlogId]);

    const count = commentCounts.get(blogId) || 0;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const blogPath = slug ? `/blog/${slug}` : `/blog/${blogId}`;
        const targetUrl = `${blogPath}?scroll=comments`;

        if (!user) {
            router.push(`/login?redirectTo=${encodeURIComponent(targetUrl)}`);
        } else {
            const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
            const isCurrentPage = currentPathname === blogPath;

            if (isCurrentPage) {
                const element = document.getElementById('comments-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    setTimeout(() => {
                        document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            } else {
                router.push(targetUrl);
            }
        }
    };

    if (isLoading) return <div className="w-5 h-5 bg-gray-100 rounded animate-pulse"></div>;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleClick}
                className={`flex items-center justify-center rounded-full transition-all duration-300 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-royal-blue ${isCompact ? 'p-1.5' : 'p-2'}`}
                title="View Comments"
            >
                <svg
                    className={isCompact ? 'w-4 h-4' : 'w-5 h-5'}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
            </button>
            <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold text-gray-500`}>
                {count}
            </span>
        </div>
    );
}

// ─── Standalone version (for individual pages without context) ──
function CommentButtonStandalone({ blogId, slug, variant = 'default' }: CommentButtonProps) {
    const router = useRouter();
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    const isCompact = variant === 'compact';

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            const commentCount = await fetchCommentCount(blogId);
            setCount(commentCount);
            setLoading(false);
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [blogId]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const blogPath = slug ? `/blog/${slug}` : `/blog/${blogId}`;
        const targetUrl = `${blogPath}?scroll=comments`;

        if (!user) {
            router.push(`/login?redirectTo=${encodeURIComponent(targetUrl)}`);
        } else {
            const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
            const isCurrentPage = currentPathname === blogPath;

            if (isCurrentPage) {
                const element = document.getElementById('comments-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    setTimeout(() => {
                        document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            } else {
                router.push(targetUrl);
            }
        }
    };

    if (loading) return <div className="w-5 h-5 bg-gray-100 rounded animate-pulse"></div>;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleClick}
                className={`flex items-center justify-center rounded-full transition-all duration-300 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-royal-blue ${isCompact ? 'p-1.5' : 'p-2'}`}
                title="View Comments"
            >
                <svg
                    className={isCompact ? 'w-4 h-4' : 'w-5 h-5'}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
            </button>
            <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-semibold text-gray-500`}>
                {count}
            </span>
        </div>
    );
}
