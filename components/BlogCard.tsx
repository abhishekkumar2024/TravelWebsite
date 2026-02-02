'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageProvider';
import type { BlogPost } from '@/lib/data';

interface BlogCardProps {
    blog: BlogPost;
    priority?: boolean;
}

export default function BlogCard({ blog, priority = false }: BlogCardProps) {
    const { lang } = useLanguage();

    const title = lang === 'hi' ? blog.title_hi : blog.title_en;
    const excerpt = lang === 'hi' ? blog.excerpt_hi : blog.excerpt_en;

    const date = new Date(blog.publishedAt).toLocaleDateString(
        lang === 'hi' ? 'hi-IN' : 'en-US',
        { month: 'short', day: 'numeric', year: 'numeric' }
    );

    return (
        <Link
            href={`/blog/${blog.slug || blog.id}`}
            className="group bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
            <div className="relative h-56 overflow-hidden bg-gray-100">
                <Image
                    src={blog.coverImage}
                    alt={title}
                    fill
                    priority={priority}
                    loading={priority ? 'eager' : 'lazy'}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={75}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIRAwQhAAUSBiIxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAAMAAAAAAAAAAAAAAAAAAQIDITH/2gAMAwEAAhEDEEAfO3Wm3X25/Z7Fa26r5HFLVdKKVdsMBApMdoIz5ycZnJR9R6k3m+rrfbp2yQwdmNK3tyFCnyT2zgfPXg1pWS0z/9k="
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-desert-gold text-white text-xs font-semibold rounded-full uppercase shadow-sm">
                    {blog.category}
                </span>
            </div>
            <div className="p-6">
                <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
                    <span>{date}</span>
                    <span>•</span>
                    <span>{blog.readTime}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-royal-blue transition-colors line-clamp-2">
                    {title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4">{excerpt}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    {blog.author.avatar && (
                        <Image
                            src={blog.author.avatar}
                            alt={blog.author.name}
                            width={36}
                            height={36}
                            className="rounded-full object-cover"
                            loading="lazy"
                            quality={60}
                        />
                    )}
                    <span className="font-medium text-sm">{blog.author.name}</span>
                </div>
            </div>
        </Link>
    );
}
