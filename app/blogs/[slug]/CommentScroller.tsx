'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Isolated Component for search params handling.
 * Wrapped in Suspense to prevent deoptimization of the entire parent article.
 */
export default function CommentScroller() {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('scroll') === 'comments') {
            const timer = setTimeout(() => {
                const element = document.getElementById('comments-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    return null;
}
