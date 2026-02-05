'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import LikeButton, { LikeCount } from '@/components/LikeButton';
import CommentButton from '@/components/CommentButton';
import type { BlogPost } from '@/lib/data';

// Lazy load non-critical components to reduce initial bundle
const AffiliateProducts = dynamic(() => import('@/components/AffiliateProducts'), {
    loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />,
    ssr: false, // Don't SSR these - load on client
});

const CommentSection = dynamic(() => import('@/components/CommentSection'), {
    loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />,
    ssr: false,
});

const RelatedReads = dynamic(() => import('@/components/RelatedReads'), {
    loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />,
});

interface BlogContentProps {
    blog: BlogPost;
    relatedBlogs?: any[];
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
    const content = mounted && lang === 'hi' ? blog.content_hi : blog.content_en;

    const dateLocale = mounted && lang === 'hi' ? 'hi-IN' : 'en-US';
    const date = new Date(blog.publishedAt).toLocaleDateString(
        dateLocale,
        { dateStyle: 'long' }
    );

    return (
        <article className="pt-24 pb-20 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Cover Image - LCP optimization */}
                <div className="h-96 relative">
                    <Image
                        src={blog.coverImage}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, 896px"
                        className="object-cover"
                        priority
                        fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                        <span className="inline-block px-3 py-1 bg-desert-gold text-xs font-bold uppercase rounded-full mb-4">
                            {blog.category}
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">{title}</h1>
                        <div className="flex items-center gap-4 opacity-90">
                            <span>{date}</span>
                            <span>•</span>
                            <span>{blog.readTime}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 fill-desert-gold" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span className="font-bold">
                                    {/* This will show a live count inside the component */}
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

                    {/* Body - Render HTML content */}
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />

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

                {/* Back to Blogs */}
                <div className="px-8 pb-8 md:px-12 md:pb-12">
                    <Link
                        href="/blogs"
                        className="inline-flex items-center gap-2 text-desert-gold font-semibold hover:underline"
                    >
                        ← Back to all blogs
                    </Link>
                </div>
            </div>
        </article>
    );
}

