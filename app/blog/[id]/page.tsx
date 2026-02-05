
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { cache } from 'react';
import { demoBlogs, BlogPost } from '@/lib/data';
import { fetchBlogById, fetchRelatedBlogs } from '@/lib/supabaseBlogs';
import BlogContent from './BlogContent';

// Force dynamic rendering - don't cache, always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use React cache to deduplicate requests during rendering
const getBlogData = cache(async (id: string): Promise<BlogPost | null> => {
    // 1. Check demo blogs first
    const demoBlog = demoBlogs.find(b => b.id === id);
    if (demoBlog) {
        return demoBlog;
    }

    // 2. Check Supabase
    try {
        const supabaseBlog = await fetchBlogById(id);
        if (supabaseBlog) {
            return supabaseBlog;
        }
    } catch (error) {
        console.error('[BlogPage] Error fetching blog from Supabase:', error);
    }

    return null;
});

interface PageProps {
    params: {
        id: string;
    }
}

// Generate SEO metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const blog = await getBlogData(params.id);

    if (!blog) {
        return {
            title: 'Blog Not Found',
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const pageUrl = `https://www.camelthar.com/blog/${blog.slug || blog.id}`;

    // distinct demo blogs from real blogs
    const isDemoBlog = demoBlogs.some((demo) => demo.id === blog.id);

    return {
        title: blog.meta_title || blog.title_en,
        description: blog.meta_description || blog.excerpt_en,
        keywords: blog.focus_keyword,
        alternates: {
            canonical: blog.canonical_url || pageUrl,
        },
        robots: {
            index: !isDemoBlog,
            follow: !isDemoBlog,
        },
        openGraph: {
            title: blog.meta_title || blog.title_en,
            description: blog.meta_description || blog.excerpt_en,
            url: pageUrl,
            siteName: 'CamelThar',
            locale: 'en_US',
            type: 'article',
            publishedTime: blog.created_at,
            authors: blog.author?.name ? [blog.author.name] : ['CamelThar Team'],
            images: [
                {
                    url: blog.coverImage,
                    width: 1200,
                    height: 630,
                    alt: blog.title_en,
                }
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: blog.meta_title || blog.title_en,
            description: blog.meta_description || blog.excerpt_en,
            images: [blog.coverImage],
            creator: '@CamelThar', // Replace with actual handle if available
        },
    };
}

export default async function BlogPage({ params }: PageProps) {
    const { id } = params;

    // This call is deduplicated thanks to `cache`
    const blog = await getBlogData(id);

    if (!blog) {
        notFound();
    }

    // Fetch related blogs for "You Can Also Read" section (Server-Side for SEO)
    const relatedBlogs = await fetchRelatedBlogs(blog.destination, blog.id);

    return (
        <Suspense fallback={<div className="pt-32 pb-20 text-center text-gray-500">Loading blog...</div>}>
            <BlogContent blog={blog} relatedBlogs={relatedBlogs} />
        </Suspense>
    );
}
