'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import AffiliateProducts from '@/components/AffiliateProducts';
import type { BlogPost } from '@/lib/data';

interface BlogContentProps {
    blog: BlogPost;
}

export default function BlogContent({ blog }: BlogContentProps) {
    const { lang } = useLanguage();

    const title = lang === 'hi' ? blog.title_hi : blog.title_en;
    const content = lang === 'hi' ? blog.content_hi : blog.content_en;

    const date = new Date(blog.publishedAt).toLocaleDateString(
        lang === 'hi' ? 'hi-IN' : 'en-US',
        { dateStyle: 'long' }
    );

    return (
        <article className="pt-24 pb-20 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Cover Image */}
                <div className="h-96 relative">
                    <Image
                        src={blog.coverImage}
                        alt={title}
                        fill
                        className="object-cover"
                        priority
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
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12">
                    {/* Author */}
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
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

                    {/* Body - Render HTML content */}
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />

                    {/* Affiliate Products */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <AffiliateProducts destination={blog.destination} limit={4} />
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

