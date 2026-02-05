
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { demoBlogs, BlogPost } from '@/lib/data';
import { fetchBlogById, fetchRelatedBlogs } from '@/lib/supabaseBlogs';
import BlogContent from './BlogContent';

// Enable ISR - cache pages for 60 seconds, then revalidate in background
// This dramatically improves TTFB for repeat visitors
export const revalidate = 60;

// Use Next.js cache for persistent caching across requests
const getBlogData = unstable_cache(
    async (id: string): Promise<BlogPost | null> => {
        // 1. Check demo blogs first (instant)
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
    },
    ['blog-data'], // cache key prefix
    { revalidate: 60, tags: ['blogs'] } // cache for 60 seconds
);

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
            canonical: pageUrl,
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

// Cached related blogs fetch
const getRelatedBlogs = unstable_cache(
    async (destination: string, currentId: string) => {
        return fetchRelatedBlogs(destination, currentId);
    },
    ['related-blogs'],
    { revalidate: 60, tags: ['blogs'] }
);

export default async function BlogPage({ params }: PageProps) {
    const { id } = params;

    // Fetch blog data (cached)
    const blog = await getBlogData(id);

    if (!blog) {
        notFound();
    }

    // Fetch related blogs (cached, for SEO)
    const relatedBlogs = await getRelatedBlogs(blog.destination, blog.id);

    return (
        <Suspense fallback={<div className="pt-32 pb-20 text-center text-gray-500">Loading blog...</div>}>
            <BlogContent blog={blog} relatedBlogs={relatedBlogs} />
        </Suspense>
    );
}
