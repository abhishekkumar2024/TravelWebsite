'use client';

import BlogCard from '@/components/BlogCard';
import { BlogInteractionsProvider } from '@/components/BlogInteractionsProvider';
import type { BlogPost } from '@/lib/data';

interface DestinationBlogGridProps {
    blogs: BlogPost[];
}

export function DestinationBlogGrid({ blogs }: DestinationBlogGridProps) {
    return (
        <BlogInteractionsProvider blogIds={blogs.map(b => b.id)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {blogs.map(blog => (
                    <BlogCard key={blog.id} blog={blog} />
                ))}
            </div>
        </BlogInteractionsProvider>
    );
}
