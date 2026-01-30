'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { demoBlogs, BlogPost } from '@/lib/data';
import { dataCache, CACHE_KEYS, CACHE_DURATION } from '@/lib/cache';
import { fetchBlogById } from '@/lib/supabaseBlogs';
import BlogContent from './BlogContent';

export default function ClientBlogPage() {
    const params = useParams();
    const id = params?.id as string;
    const [blog, setBlog] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchBlog = async () => {
            // 1. Check demo blogs first (instant)
            const localBlog = demoBlogs.find(b => b.id === id);
            if (localBlog) {
                setBlog(localBlog);
                setLoading(false);
                return;
            }

            // 2. Check cache
            const cacheKey = `blog_${id}`;
            const cachedBlog = dataCache.get<BlogPost>(cacheKey);
            if (cachedBlog) {
                setBlog(cachedBlog);
                setLoading(false);
                return;
            }

            // 3. Check Supabase
            try {
                const supabaseBlog = await fetchBlogById(id);
                if (supabaseBlog) {
                    setBlog(supabaseBlog);
                    dataCache.set(cacheKey, supabaseBlog, CACHE_DURATION.MEDIUM);
                } else {
                    setBlog(null);
                }
            } catch (error) {
                console.error('Error fetching blog from Supabase:', error);
                setBlog(null);
            }
            setLoading(false);
        };

        fetchBlog();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 flex justify-center">
                <div className="w-full max-w-4xl">
                    <div className="h-96 bg-gray-200 rounded-2xl animate-pulse mb-8"></div>
                    <div className="space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 text-center">
                <div className="max-w-md mx-auto">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Blog Not Found</h1>
                    <p className="text-gray-500 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
                    <a
                        href="/blogs"
                        className="inline-block px-6 py-3 bg-desert-gold text-white font-semibold rounded-lg hover:bg-[#c49740] transition-all"
                    >
                        Browse All Blogs
                    </a>
                </div>
            </div>
        );
    }

    return <BlogContent blog={blog} />;
}
