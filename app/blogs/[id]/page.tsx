
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { BlogPost } from '@/lib/data';
import { fetchBlogById, fetchRelatedBlogs } from '@/lib/db/queries';
import { db } from '@/lib/db';
import BlogContent from './BlogContent';
import { extractHeadings, injectHeadingIds } from '@/lib/blog-utils';

function downgradeHeadings(html: string): string {
    if (!html) return html;
    return html.replace(/<(\/?)h1(\s|>)/gi, '<$1h2$2');
}

function processContentForSEO(html: string): string {
    if (!html) return html;
    const hashtagBlockRegex = /(<p[^>]*>)(\s*(?:[^<]*#\w+[^<]*){3,})(<\/p>)/gi;
    return html.replace(hashtagBlockRegex, (match, openTag, content, closeTag) => {
        const words = content.trim().split(/\s+/);
        const hashtagCount = words.filter((w: string) => w.startsWith('#')).length;
        if (hashtagCount >= 3 || hashtagCount / words.length > 0.4) {
            return `${openTag}<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true">${content}</span>${closeTag}`;
        }
        return match;
    });
}

// Pre-generate all published blog pages at build time for faster indexing
export async function generateStaticParams() {
    const result = await db.query<{ slug: string; id: string }>(
        `SELECT slug, id FROM blogs WHERE status = 'published'`
    );

    const params = result.rows.map((blog) => ({
        id: blog.slug || blog.id,
    }));

    return params;
}

// Enable ISR - cache pages for 60 seconds, then revalidate in background
// This dramatically improves TTFB for repeat visitors
export const revalidate = 60;

// Use Next.js cache for persistent caching across requests
const getBlogData = unstable_cache(
    async (id: string): Promise<BlogPost | null> => {
        // 1. Check Database
        try {
            const blog = await fetchBlogById(id);
            if (blog) {
                return blog;
            }
        } catch (error) {
            console.error('[BlogPage] Error fetching blog from database:', error);
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

    return {
        title: blog.meta_title || blog.title_en,
        description: blog.meta_description || blog.excerpt_en,
        alternates: {
            canonical: pagePath, // Uses metadataBase from layout
        },
        robots: {
            index: true,
            follow: true,
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

    // --- Server-Side Content Processing (SEO Powerhouse) ---
    // This ensures Google sees the final, processed HTML immediately without waiting for JS.
    const rawContentEn = blog.content_en || '';
    const rawContentHi = blog.content_hi || blog.content_en || '';

    // Process English
    const docEn = downgradeHeadings(rawContentEn);
    const headingsEn = extractHeadings(docEn);
    const htmlEn = processContentForSEO(injectHeadingIds(docEn, headingsEn));

    // Process Hindi
    const docHi = downgradeHeadings(rawContentHi);
    const headingsHi = extractHeadings(docHi);
    const htmlHi = processContentForSEO(injectHeadingIds(docHi, headingsHi));

    return (
        <Suspense fallback={
            <div className="pt-32 pb-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal-blue mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading travel story...</p>
            </div>
        }>
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
            <BlogContent
                blog={blog}
                relatedBlogs={relatedBlogs}
                initialContent={{
                    en: { html: htmlEn, headings: headingsEn },
                    hi: { html: htmlHi, headings: headingsHi }
                }}
            />
        </Suspense>
    );
}
