'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TocHeading } from '@/lib/blog-utils';

interface TableOfContentsProps {
    headings: TocHeading[];
    className?: string;
}

export default function TableOfContents({ headings, className = '' }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Preserve URL hash on page load — highlight correct TOC item
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) setActiveId(hash);
    }, []);

    // Track which heading is currently visible
    useEffect(() => {
        if (headings.length === 0) return;

        const handleIntersect = (entries: IntersectionObserverEntry[]) => {
            // Sort by top position to always pick the top-most visible heading
            // (entries array order is NOT guaranteed to match DOM order)
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

            if (visible.length > 0) {
                setActiveId(visible[0].target.id);
            }
        };

        // Use requestAnimationFrame instead of setTimeout — waits for the next
        // paint cycle so DOM is guaranteed to be ready. No magic delay needed.
        const rafId = requestAnimationFrame(() => {
            observerRef.current = new IntersectionObserver(handleIntersect, {
                rootMargin: '-80px 0px -60% 0px', // account for navbar
                threshold: 0.1,
            });

            headings.forEach(({ id }) => {
                const el = document.getElementById(id);
                if (el) observerRef.current?.observe(el);
            });
        });

        return () => {
            cancelAnimationFrame(rafId);
            observerRef.current?.disconnect();
        };
    }, [headings]);

    const handleClick = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) {
            // Use native scrollIntoView — works with CSS scroll-margin-top
            // (defined in globals.css for h2, h3 tags)
            el.scrollIntoView({ behavior: 'smooth' });
            setActiveId(id);
            // Update URL hash without scrolling
            window.history.replaceState(null, '', `#${id}`);
        }
    }, []);

    if (headings.length < 2) return null; // Don't show TOC for very short posts

    return (
        <nav
            className={`toc-container bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-200/60 overflow-hidden ${className}`}
            aria-label="Table of Contents"
        >
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-100/50 transition-colors"
                aria-expanded={!isCollapsed}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-royal-blue/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-royal-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </div>
                    <span className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                        In This Article
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                        ({headings.length} sections)
                    </span>
                </div>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Links */}
            <div
                className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 overflow-hidden opacity-0' : 'max-h-[600px] overflow-y-auto opacity-100'
                    }`}
                style={!isCollapsed ? { scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' } : undefined}
            >
                <ol className="px-6 pb-5 space-y-1 list-none m-0">
                    {headings.map((heading, index) => {
                        const isActive = activeId === heading.id;
                        const isSubheading = heading.level === 3;

                        return (
                            <li key={heading.id} className="m-0 p-0">
                                <a
                                    href={`#${heading.id}`}
                                    onClick={(e) => handleClick(e, heading.id)}
                                    className={`
                                        group flex items-start gap-2 py-2 px-3 rounded-lg text-sm transition-all duration-200
                                        no-underline hover:no-underline
                                        ${isSubheading ? 'ml-5' : ''}
                                        ${isActive
                                            ? 'bg-royal-blue/10 text-royal-blue font-semibold'
                                            : 'text-gray-600 hover:text-royal-blue hover:bg-gray-100/70'
                                        }
                                    `}
                                    aria-current={isActive ? 'location' : undefined}
                                >
                                    <span className={`
                                        flex-shrink-0 mt-0.5 text-xs font-mono
                                        ${isActive ? 'text-royal-blue' : 'text-gray-400 group-hover:text-royal-blue/60'}
                                        ${isSubheading ? 'opacity-60' : ''}
                                    `}>
                                        {isSubheading ? '↳' : `${index + 1}.`}
                                    </span>
                                    <span className="leading-snug">{heading.text}</span>
                                </a>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
}
