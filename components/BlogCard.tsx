'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageProvider';
import type { BlogPost } from '@/lib/data';
import { useState, useEffect } from 'react';
import LikeButton from './LikeButton';
import CommentButton from './CommentButton';

interface BlogCardProps {
    blog: BlogPost;
    priority?: boolean;
}

export default function BlogCard({ blog, priority = false }: BlogCardProps) {
    const { lang, mounted } = useLanguage();

    const title = lang === 'hi' && mounted ? blog.title_hi : blog.title_en;
    const excerpt = lang === 'hi' && mounted ? blog.excerpt_hi : blog.excerpt_en;

    // Use consistent locale for SSR (en-US), then switch to lang-based on client
    const dateLocale = mounted && lang === 'hi' ? 'hi-IN' : 'en-US';
    const date = new Date(blog.publishedAt || blog.created_at || new Date()).toLocaleDateString(
        dateLocale,
        { month: 'short', day: 'numeric', year: 'numeric' }
    );

    return (
        <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 relative flex flex-col h-full border border-gray-100">
            {/* Main Navigation Link (Absolute overlay excluding bottom bar) */}
            <Link
                href={`/blog/${blog.slug || blog.id}`}
                className="absolute inset-0 z-0"
                aria-label={`Read ${title}`}
            />

            {/* Content Container */}
            <div className="flex-1 flex flex-col z-10 pointer-events-none">
                <div className="h-56 relative overflow-hidden">
                    <Image
                        src={blog.coverImage}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={priority}
                    />
                    <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-royal-blue text-[10px] font-bold uppercase rounded-full shadow-sm">
                            {blog.category}
                        </span>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                        <span>{date}</span>
                        <span>•</span>
                        <span>{blog.readTime || '5 min'}</span>
                    </div>

                    <h3 className="text-xl font-bold mb-3 text-gray-900 line-clamp-2 leading-tight group-hover:text-royal-blue transition-colors">
                        {title}
                    </h3>

                    <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                        {excerpt}
                    </p>
                </div>
            </div>

            {/* Interaction Bar (Bottom - Clickable) */}
            <div
                className="relative z-20 px-5 pt-0 pb-5 flex items-center justify-between mt-auto border-t border-gray-50 bg-white pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                        {blog.author.avatar ? (
                            <Image
                                src={blog.author.avatar}
                                alt={blog.author.name}
                                width={32}
                                height={32}
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                {blog.author.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <span className="font-bold text-gray-800 text-xs">{blog.author.name}</span>
                </div>

                <div className="flex items-center gap-4">
                    <LikeButton blogId={blog.id} variant="compact" />
                    <CommentButton blogId={blog.id} slug={blog.slug} variant="compact" />
                </div>
            </div>
        </div>
    );
}
