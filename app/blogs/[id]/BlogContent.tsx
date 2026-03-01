'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import LikeButton, { LikeCount } from '@/components/LikeButton';
import CommentButton from '@/components/CommentButton';
import ShareButton from '@/components/ShareButton';
import type { BlogPost } from '@/lib/data';
import BackToTop from '@/components/BackToTop';
import TableOfContents from '@/components/TableOfContents';
import { TocHeading } from '@/lib/blog-utils';
import CommentScroller from './CommentScroller';

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
    initialContent: {
        en: { html: string; headings: TocHeading[] };
        hi: { html: string; headings: TocHeading[] };
    };
}

export default function BlogContent({ blog, relatedBlogs = [], initialContent }: BlogContentProps) {
    const { lang, t, mounted } = useLanguage();
    const router = useRouter();

    // Intercept internal link clicks for fast SPA-like navigation
    useEffect(() => {
        const handleInternalLinks = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link && link instanceof HTMLAnchorElement) {
                const href = link.getAttribute('href');
                const isInternal = href?.startsWith('/') || href?.includes(window.location.host);

                if (isInternal && !link.hasAttribute('target')) {
                    e.preventDefault();
                    // Extract path if it's an absolute URL but internal
                    const url = new URL(link.href);
                    router.push(url.pathname + url.search + url.hash);
                }
            }
        };

        document.addEventListener('click', handleInternalLinks);
        return () => document.removeEventListener('click', handleInternalLinks);
    }, [router]);

    // VERY IMPORTANT: Use initialContent for SSR/Hydration to match page.tsx
    // Once mounted, we can switch based on localStorage language
    const currentData = mounted && lang === 'hi' ? initialContent.hi : initialContent.en;
    const title = mounted && lang === 'hi' ? blog.title_hi : blog.title_en;
    const content = currentData.html;
    const headings = currentData.headings;

    const dateLocale = mounted && lang === 'hi' ? 'hi-IN' : 'en-US';
    const publishedDate = new Date(blog.publishedAt).toLocaleDateString(
        dateLocale,
        { dateStyle: 'long' }
    );

    // Show updated date if it exists and is different from published date
    const isUpdated = blog.updated_at &&
        new Date(blog.updated_at).toLocaleDateString() !== new Date(blog.publishedAt).toLocaleDateString();

    const updatedDate = isUpdated
        ? new Date(blog.updated_at!).toLocaleDateString(dateLocale, { dateStyle: 'long' })
        : null;

    return (
        <article className="pt-28 pb-20 px-4 bg-gray-50/30 min-h-screen">
            {/* Suspense boundary for search params hook to prevent root bailout */}
            <Suspense fallback={null}>
                <CommentScroller />
            </Suspense>
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
                    <Link href="/blogs/" className="hover:text-royal-blue transition-colors">{t('Blogs', 'ब्लॉग')}</Link>
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
                                {publishedDate}
                            </div>
                            {updatedDate && (
                                <div className="flex items-center gap-2 text-desert-gold font-bold">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {t('Updated:', 'अपडेट किया गया:')} {updatedDate}
                                </div>
                            )}
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
                            <Link href="/blogs/" className="hover:text-royal-blue">{t('Blogs', 'ब्लॉग')}</Link>
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

