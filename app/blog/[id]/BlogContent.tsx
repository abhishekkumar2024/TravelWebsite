'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import LikeButton, { LikeCount } from '@/components/LikeButton';
import CommentButton from '@/components/CommentButton';
import ShareButton from '@/components/ShareButton';
import type { BlogPost } from '@/lib/data';
import BackToTop from '@/components/BackToTop';
import TableOfContents, { extractHeadings, injectHeadingIds } from '@/components/TableOfContents';

// Lazy load heavy below-the-fold components
const AuthorBox = dynamic(() => import('./AuthorBox'), {
    loading: () => <div className="animate-pulse h-48 bg-gray-50 rounded-2xl mb-12"></div>
});

const CommentSection = dynamic(() => import('@/components/CommentSection'), {
    loading: () => <div className="mt-12 pt-8 border-t border-gray-100 animate-pulse"><div className="h-64 bg-gray-100 rounded-2xl"></div></div>,
    ssr: false, // Don't render on server since it requires client-side auth
});

const AffiliateProducts = dynamic(() => import('@/components/AffiliateProducts'), {
    loading: () => <div className="animate-pulse"><div className="h-32 bg-gray-100 rounded-xl"></div></div>,
    ssr: true,
});

const RelatedReads = dynamic(() => import('@/components/RelatedReads'), {
    loading: () => <div className="mt-12 pt-8 border-t border-gray-100 animate-pulse"><div className="h-48 bg-gray-100 rounded-2xl"></div></div>,
    ssr: true,
});

interface BlogContentProps {
    blog: BlogPost;
    relatedBlogs?: any[];
}

/**
 * Processes blog HTML content to hide hashtag blocks and keyword dumps
 * from users while keeping them in the DOM for SEO crawlers.
 * Uses visually-hidden technique: content is invisible but still parsed by crawlers.
 */
function processContentForDisplay(html: string): string {
    if (!html) return html;

    // Pattern 1: Hide paragraphs that are primarily hashtag strings
    // e.g., <p>#JaisalmerTourism #TheGoldenCity #RajasthanDiaries ...</p>
    const hashtagBlockRegex = /(<p[^>]*>)(\s*(?:[^<]*#\w+[^<]*){3,})(<\/p>)/gi;
    html = html.replace(hashtagBlockRegex, (match, openTag, content, closeTag) => {
        // Only hide if the paragraph is mostly hashtags (more than 50% of words are hashtags)
        const words = content.trim().split(/\s+/);
        const hashtagCount = words.filter((w: string) => w.startsWith('#')).length;
        if (hashtagCount >= 3 || hashtagCount / words.length > 0.4) {
            return `${openTag}<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true">${content}</span>${closeTag}`;
        }
        return match;
    });

    return html;
}

export default function BlogContent({ blog, relatedBlogs = [] }: BlogContentProps) {
    const { lang, t, mounted } = useLanguage();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('scroll') === 'comments') {
            // Small delay to ensure the page has rendered enough content for accurate position
            const timer = setTimeout(() => {
                const element = document.getElementById('comments-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    // Use English content for SSR, then switch to lang-based on client
    const title = mounted && lang === 'hi' ? blog.title_hi : blog.title_en;
    const rawContent = mounted && lang === 'hi' ? blog.content_hi : blog.content_en;

    // Extract headings and inject anchor IDs for Table of Contents
    const headings = useMemo(() => extractHeadings(rawContent), [rawContent]);
    const contentWithIds = useMemo(() => injectHeadingIds(rawContent, headings), [rawContent, headings]);
    // Process content to hide hashtag blocks and keyword dumps from users
    const content = useMemo(() => processContentForDisplay(contentWithIds), [contentWithIds]);

    const dateLocale = mounted && lang === 'hi' ? 'hi-IN' : 'en-US';
    const date = new Date(blog.publishedAt).toLocaleDateString(
        dateLocale,
        { dateStyle: 'long' }
    );

    return (
        <article className="pt-28 pb-20 px-4 bg-gray-50/30 min-h-screen">
            {/* Top Breadcrumbs */}
            <div className="max-w-4xl mx-auto mb-6">
                <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap pb-2 md:pb-0 no-scrollbar">
                    <Link href="/" className="hover:text-royal-blue transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Home
                    </Link>
                    <span className="text-gray-300">/</span>
                    <Link href="/destinations/" className="hover:text-royal-blue transition-colors">Destinations</Link>
                    <span className="text-gray-300">/</span>
                    <Link href={`/destinations/${blog.destination}/`} className="hover:text-royal-blue transition-colors capitalize">
                        {blog.destination}
                    </Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-400 truncate max-w-[200px]">{title}</span>
                </nav>
            </div>

            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
                {/* Cover Image */}
                <div className="h-[300px] md:h-[500px] relative">
                    <Image
                        src={blog.coverImage}
                        alt={title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 100vw, 1200px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white w-full">
                        <span className="inline-block px-4 py-1 bg-desert-gold text-white text-[10px] md:text-xs font-bold uppercase rounded-full mb-4 shadow-lg">
                            {blog.category}
                        </span>
                        <h1 className="text-2xl md:text-5xl font-bold mb-4 leading-tight font-outfit drop-shadow-md">{title}</h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm opacity-90 font-medium">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {date}
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {blog.readTime}
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span className="font-bold">
                                    <LikeCount blogId={blog.id} />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <LikeButton blogId={blog.id} />
                        <CommentButton blogId={blog.id} slug={blog.slug} />
                        <ShareButton
                            title={title}
                            text={blog.excerpt_en || 'Check out this amazing blog from CamelThar!'}
                        />
                    </div>

                    <div className="flex gap-2">
                        {/* Share buttons could go here */}
                    </div>
                </div>

                <div className="p-8 md:p-12">
                    {/* Author & Interactions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl overflow-hidden">
                                {blog.author.avatar ? (
                                    <Image
                                        src={blog.author.avatar}
                                        alt={blog.author.name}
                                        width={48}
                                        height={48}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <span>{blog.author.name.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-royal-blue">{blog.author.name}</p>
                                <p className="text-sm text-gray-500">Traveler</p>
                            </div>
                        </div>

                        {/* Likes Integration */}
                        <div className="flex items-center bg-gray-50 px-4 py-2 rounded-full self-start md:self-auto">
                            <LikeButton blogId={blog.id} />
                        </div>
                    </div>

                    {/* Focus Keywords — SEO-only, visually hidden from users.
                        Keywords are already in meta tags + structured data for full SEO coverage.
                        This hidden section provides additional in-page signals for crawlers. */}
                    {blog.focus_keyword && (() => {
                        const keywords = blog.focus_keyword.split(',').map((k: string) => k.trim()).filter(Boolean);
                        if (keywords.length === 0) return null;
                        return (
                            <div
                                style={{
                                    position: 'absolute',
                                    width: '1px',
                                    height: '1px',
                                    padding: 0,
                                    margin: '-1px',
                                    overflow: 'hidden',
                                    clip: 'rect(0, 0, 0, 0)',
                                    whiteSpace: 'nowrap',
                                    border: 0,
                                }}
                                role="navigation"
                                aria-label="Blog topics"
                            >
                                <span>Topics: </span>
                                {keywords.map((keyword: string, idx: number) => (
                                    <span key={idx}>{keyword}{idx < keywords.length - 1 ? ', ' : ''}</span>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Table of Contents — helps Google show jump links in search results */}
                    <TableOfContents headings={headings} className="mb-8" />

                    {/* Body - Render HTML content */}
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />

                    {/* Author Box — Rich E-E-A-T signals */}
                    <AuthorBox author={blog.author} />


                    {/* Affiliate Products */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <AffiliateProducts destination={blog.destination} limit={4} />
                    </div>

                    {/* Related Reads - You Can Also Read Section */}
                    {relatedBlogs.length > 0 && (
                        <RelatedReads blogs={relatedBlogs} />
                    )}

                    {/* Comments Section */}
                    <div id="comments-section">
                        <CommentSection blogId={blog.id} />
                    </div>
                </div>

                {/* Back to Blogs / Bottom Breadcrumbs */}
                <div className="px-8 pb-12 md:px-12 md:pb-16">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-12 border-t border-gray-100">
                        <Link
                            href={`/destinations/${blog.destination}/`}
                            className="inline-flex items-center gap-2 text-royal-blue font-bold hover:text-desert-gold transition-colors capitalize"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
                            </svg>
                            Explore more {blog.destination}
                        </Link>

                        <nav className="flex items-center gap-2 text-xs text-gray-400 font-medium italic">
                            <Link href="/" className="hover:text-royal-blue">Home</Link>
                            <span>/</span>
                            <Link href="/destinations/" className="hover:text-royal-blue">Destinations</Link>
                            <span>/</span>
                            <span className="capitalize">{blog.destination}</span>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Premium Back to Top Button */}
            <BackToTop />
        </article >
    );
}

