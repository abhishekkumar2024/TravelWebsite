
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { demoBlogs, BlogPost } from '@/lib/data';
import { fetchBlogById, fetchRelatedBlogs } from '@/lib/supabaseBlogs';
import { supabase } from '@/lib/supabaseClient';
import BlogContent from './BlogContent';

// Pre-generate all published blog pages at build time for faster indexing
export async function generateStaticParams() {
    const { data: blogs } = await supabase
        .from('blogs')
        .select('slug, id')
        .eq('status', 'published');

    const params = (blogs || []).map((blog) => ({
        id: blog.slug || blog.id,
    }));

    // Also include demo blog IDs
    const demoParams = demoBlogs.map((blog) => ({
        id: blog.id,
    }));

    return [...params, ...demoParams];
}

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

    const pageSlug = blog.slug || blog.id;
    const pagePath = `/blogs/${pageSlug}/`;

    // distinct demo blogs from real blogs
    const isDemoBlog = demoBlogs.some((demo) => demo.id === blog.id);

    return {
        title: blog.meta_title || blog.title_en,
        description: blog.meta_description || blog.excerpt_en,
        alternates: {
            canonical: pagePath, // Uses metadataBase from layout
        },
        robots: {
            index: !isDemoBlog,
            follow: !isDemoBlog,
        },
        openGraph: {
            title: blog.meta_title || blog.title_en,
            description: blog.meta_description || blog.excerpt_en,
            url: pagePath,
            siteName: 'CamelThar',
            locale: 'en_US',
            type: 'article',
            publishedTime: blog.publishedAt || blog.created_at,
            modifiedTime: blog.updated_at || blog.created_at,
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
            creator: '@CamelThar',
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



    // structured data for rich snippets
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.meta_title || blog.title_en,
        description: blog.meta_description || blog.excerpt_en,
        image: blog.coverImage.startsWith('http') ? blog.coverImage : `https://www.camelthar.com${blog.coverImage}`,
        datePublished: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : new Date(blog.created_at || Date.now()).toISOString(),
        dateModified: blog.updated_at ? new Date(blog.updated_at).toISOString() : new Date(blog.publishedAt || Date.now()).toISOString(),
        author: {
            '@type': 'Person',
            name: blog.author?.name || 'CamelThar Explorer',
            ...(blog.author?.slug ? { url: `https://www.camelthar.com/author/${blog.author.slug}` } : {}),
        },
        publisher: {
            '@type': 'Organization',
            name: 'CamelThar',
            logo: {
                '@type': 'ImageObject',
                url: 'https://www.camelthar.com/camelthar_logo.webp'
            }
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://www.camelthar.com/blogs/${blog.slug || blog.id}/`
        },

    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://www.camelthar.com/'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Destinations',
                item: 'https://www.camelthar.com/destinations/'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: blog.destination,
                item: `https://www.camelthar.com/destinations/${blog.destination}/`
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: blog.title_en,
                item: `https://www.camelthar.com/blogs/${blog.slug || blog.id}/`
            }
        ]
    };

    return (
        <Suspense fallback={<div className="pt-32 pb-20 text-center text-gray-500">Loading blog...</div>}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <BlogContent blog={blog} relatedBlogs={relatedBlogs} />
        </Suspense>
    );
}
