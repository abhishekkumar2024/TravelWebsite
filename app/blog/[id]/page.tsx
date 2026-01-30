
import { notFound } from 'next/navigation';
import { demoBlogs, BlogPost } from '@/lib/data';
import { fetchBlogById } from '@/lib/supabaseBlogs';
import BlogContent from '../BlogContent';

// Generate static params for all known demo blogs at build time
export async function generateStaticParams() {
    return demoBlogs.map(blog => ({ id: blog.id }));
}

async function getBlogData(id: string): Promise<BlogPost | null> {
    // 1. Check demo blogs first
    const demoBlog = demoBlogs.find(b => b.id === id);
    if (demoBlog) {
        return demoBlog;
    }

    // 2. Check Supabase
    const supabaseBlog = await fetchBlogById(id);
    if (supabaseBlog) {
        return supabaseBlog;
    }

    return null;
}

interface PageProps {
    params: {
        id: string;
    }
}

export default async function BlogPage({ params }: PageProps) {
    const { id } = params;
    const blog = await getBlogData(id);

    if (!blog) {
        notFound();
    }

    return <BlogContent blog={blog} />;
}
