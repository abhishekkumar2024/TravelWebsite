'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TocHeading {
    id: string;
    text: string;
    level: number; // 2 or 3
}

/**
 * Slugify heading text into a URL-safe anchor ID.
 * Example: "Best Places to Visit" → "best-places-to-visit"
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')   // remove special chars
        .replace(/\s+/g, '-')       // spaces → dashes
        .replace(/-+/g, '-')        // collapse multiple dashes
        .trim()
        .replace(/^-+|-+$/g, '');   // trim leading/trailing dashes
}

/**
 * Extract headings (h2, h3) from an HTML string.
 * Uses DOMParser when available (browser), falls back to regex (SSR).
 * Returns array of { id, text, level }
 */
export function extractHeadings(html: string): TocHeading[] {
    const headings: TocHeading[] = [];
    const usedIds = new Set<string>();

    const addHeading = (level: number, text: string) => {
        if (!text) return;
        let id = slugify(text);
        // Handle duplicate IDs
        if (usedIds.has(id)) {
            let counter = 2;
            while (usedIds.has(`${id}-${counter}`)) counter++;
            id = `${id}-${counter}`;
        }
        usedIds.add(id);
        headings.push({ id, text, level });
    };

    // Prefer DOMParser (browser) — handles nested tags, line breaks, complex HTML safely
    if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const elements = doc.querySelectorAll('h2, h3');

        elements.forEach((el) => {
            const level = parseInt(el.tagName.replace('H', ''), 10);
            const text = el.textContent?.trim() || '';
            addHeading(level, text);
        });
    } else {
        // Fallback: regex for SSR (Next.js server-renders 'use client' components)
        const regex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            const level = parseInt(match[1], 10);
            const text = match[2].replace(/<[^>]*>/g, '').trim();
            addHeading(level, text);
        }
    }

    return headings;
}

/**
 * Inject anchor IDs into heading tags in the HTML content.
 * This modifies <h2> and <h3> to include id="slug" attributes.
 */
export function injectHeadingIds(html: string, headings: TocHeading[]): string {
    let headingIndex = 0;
    return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (fullMatch, level, attrs, content) => {
        if (headingIndex >= headings.length) return fullMatch;

        const heading = headings[headingIndex];
        const plainText = content.replace(/<[^>]*>/g, '').trim();

        // Only replace if text matches (safety check)
        if (plainText === heading.text) {
            headingIndex++;
            // If attrs already has an id, replace it; otherwise add one
            if (/id=["'][^"']*["']/i.test(attrs)) {
                attrs = attrs.replace(/id=["'][^"']*["']/i, `id="${heading.id}"`);
            } else {
                attrs = ` id="${heading.id}"${attrs}`;
            }
            return `<h${level}${attrs}>${content}</h${level}>`;
        }

        return fullMatch;
    });
}

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
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
                    }`}
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
