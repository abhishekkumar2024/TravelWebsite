
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
            locale: 'en_IN',
            type: 'article',
            publishedTime: blog.publishedAt || blog.created_at,
            modifiedTime: blog.updated_at || blog.created_at,
            authors: blog.author?.name ? [blog.author.name] : ['CamelThar Team'],

            tags: [blog.category, blog.destination].filter(Boolean),
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

    // Calculate word count for GEO richness signal
    const plainText = (blog.content_en || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    // Extract first 2 sentences for Speakable (AEO — voice assistants)
    const firstSentences = plainText.split(/[.!?]\s/).slice(0, 2).join('. ').trim();

    // structured data for rich snippets — Enhanced for SEO + AEO + GEO
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
        // --- GEO: Helps AI engines understand content depth & topic ---
        inLanguage: 'en-IN',
        wordCount: wordCount,
        articleSection: blog.category || 'Travel',
        ...(blog.destination ? {
            about: {
                '@type': 'TouristDestination',
                name: blog.destination.charAt(0).toUpperCase() + blog.destination.slice(1),
                containedInPlace: {
                    '@type': 'State',
                    name: 'Rajasthan',
                    containedInPlace: { '@type': 'Country', name: 'India' }
                }
            },
            mentions: {
                '@type': 'Place',
                name: blog.destination.charAt(0).toUpperCase() + blog.destination.slice(1) + ', Rajasthan',
                containedInPlace: { '@type': 'Country', name: 'India' }
            },
        } : {}),
        // --- GEO: Connect article to website for topical authority ---
        isPartOf: {
            '@type': 'WebSite',
            name: 'CamelThar',
            url: 'https://www.camelthar.com'
        },
        // --- AEO: Speakable — tells voice assistants which text to read aloud ---
        speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['article h1', 'article p:nth-of-type(1)']
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
                name: 'Blogs',
                item: 'https://www.camelthar.com/blogs/'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: blog.destination.charAt(0).toUpperCase() + blog.destination.slice(1),
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

    // --- FAQ Schema: Extract FAQ content from blog for rich results ---
    // Looks for patterns like <h2>FAQ</h2> or <h3>Question?</h3><p>Answer</p>
    const faqItems: { question: string; answer: string }[] = [];
    const contentHtml = blog.content_en || '';
    // Match Q&A patterns: headings (h2/h3/h4) ending with ? followed by paragraph(s)
    const faqRegex = /<h[2-4][^>]*>([^<]*\?[^<]*)<\/h[2-4]>\s*<p[^>]*>(.*?)<\/p>/gi;
    let faqMatch;
    while ((faqMatch = faqRegex.exec(contentHtml)) !== null) {
        const question = faqMatch[1].replace(/&amp;/g, '&').replace(/&#\d+;/g, '').trim();
        const answer = faqMatch[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
        if (question && answer) {
            faqItems.push({ question, answer });
        }
    }

    const faqJsonLd = faqItems.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    } : null;

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
            {faqJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
            )}
            <BlogContent blog={blog} relatedBlogs={relatedBlogs} />
        </Suspense>
    );
}
