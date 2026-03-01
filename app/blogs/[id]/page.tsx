import { Suspense } from 'react';
import * as cheerio from 'cheerio';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { BlogPost } from '@/lib/data';
import { fetchBlogById, fetchRelatedBlogs } from '@/lib/db/queries';
import { db } from '@/lib/db';
import BlogContent from './BlogContent';
import { extractHeadings, injectHeadingIds } from '@/lib/blog-utils';

function extractAndFixH1s(html: string): { cleanedHtml: string; extraTitle: string } {
    if (!html) return { cleanedHtml: html, extraTitle: '' };

    // Load as fragment to prevent cheerio from adding <html><body> tags
    const $ = cheerio.load(html, null, false);
    let extraTitle = '';
    let isFirst = true;

    $('h1').each((_, element) => {
        const text = $(element).text().trim();

        if (isFirst) {
            extraTitle = text;
            $(element).remove(); // Remove first H1 as it's merged into page title
            isFirst = false;
        } else {
            // Convert extra H1 to H2 for SEO
            $(element).replaceWith(`<h2>${$(element).html()}</h2>`);
        }
    });

    return {
        cleanedHtml: $.html(),
        extraTitle
    };
}

function processContentForSEO(html: string): string {
    if (!html) return html;

    // 1. Handle hashtag blocks
    const hashtagBlockRegex = /(<p[^>]*>)(\s*(?:[^<]*#\w+[^<]*){3,})(<\/p>)/gi;
    let processedHtml = html.replace(hashtagBlockRegex, (match, openTag, content, closeTag) => {
        const words = content.trim().split(/\s+/);
        const hashtagCount = words.filter((w: string) => w.startsWith('#')).length;
        if (hashtagCount >= 3 || hashtagCount / words.length > 0.4) {
            return `${openTag}<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true">${content}</span>${closeTag}`;
        }
        return match;
    });

    // 2. Optimize internal links for SEO
    // This converts absolute internal links to relative paths and removes nofollow/target="_blank"
    processedHtml = processedHtml.replace(/<a\s+([^>]*?)>/gi, (match, attributes) => {
        const hrefMatch = attributes.match(/href="([^"]*?)"/i);
        if (!hrefMatch) return match;

        const href = hrefMatch[1];
        const isInternal = href.startsWith('/') ||
            href.includes('camelthar.com') ||
            href.startsWith('#');

        if (isInternal && !href.startsWith('#')) {
            let newAttributes = attributes;

            // Convert absolute to relative
            if (href.includes('camelthar.com')) {
                try {
                    const url = new URL(href.startsWith('http') ? href : `https://${href}`);
                    if (url.hostname.includes('camelthar.com')) {
                        const relativePath = url.pathname + url.search + url.hash;
                        newAttributes = newAttributes.replace(/href="[^"]*?"/i, `href="${relativePath}"`);
                    }
                } catch (e) {
                    // Fallback if URL parsing fails
                }
            }

            // Remove target="_blank"
            newAttributes = newAttributes.replace(/\s*target="_blank"/gi, '');

            // Remove nofollow from rel
            newAttributes = newAttributes.replace(/rel="([^"]*?)"/gi, (m: string, relValue: string) => {
                const newRelValue = relValue.split(/\s+/)
                    .filter((r: string) => r.toLowerCase() !== 'nofollow')
                    .join(' ');
                return newRelValue ? `rel="${newRelValue}"` : '';
            });

            // Clean up attributes
            newAttributes = newAttributes.replace(/\s+/g, ' ').trim();
            return `<a ${newAttributes}>`;
        }

        return match;
    });

    return processedHtml;
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

// Optimization: Force static generation and allow dynamic params (ISR)
export const dynamic = 'force-static';
export const dynamicParams = true;

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
                name: 'Travel Blogs',
                item: 'https://www.camelthar.com/blogs/'
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: blog.destination.charAt(0).toUpperCase() + blog.destination.slice(1),
                item: `https://www.camelthar.com/destinations/${blog.destination}/`
            }
        ]
    };

    // --- Server-Side Content Processing (SEO Powerhouse) ---
    // This ensures Google sees the final, processed HTML immediately without waiting for JS.
    const rawContentEn = blog.content_en || '';
    const rawContentHi = blog.content_hi || blog.content_en || '';

    // Process English
    const { cleanedHtml: docEn, extraTitle: extraEn } = extractAndFixH1s(rawContentEn);
    const headingsEn = extractHeadings(docEn);
    const htmlEn = processContentForSEO(injectHeadingIds(docEn, headingsEn));

    // Process Hindi
    const { cleanedHtml: docHi, extraTitle: extraHi } = extractAndFixH1s(rawContentHi);
    const headingsHi = extractHeadings(docHi);
    const htmlHi = processContentForSEO(injectHeadingIds(docHi, headingsHi));

    // Create a modified blog object with the merged title for display
    const mergedBlog = {
        ...blog,
        title_en: blog.title_en + (extraEn ? `: ${extraEn}` : ''),
        title_hi: blog.title_hi + (extraHi ? `: ${extraHi}` : ''),
    };

    // --- FAQ Schema: Extract FAQ content from blog for rich results ---
    const faqHeadings = headingsHi ? headingsHi.filter(h => h.text.includes('?') || h.text.endsWith('?')) : [];
    const faqJsonLd = faqHeadings.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqHeadings.map(h => ({
            '@type': 'Question',
            name: h.text,
            acceptedAnswer: {
                '@type': 'Answer',
                text: `Read more about ${h.text} in our comprehensive guide to ${blog.destination}.`
            }
        }))
    } : null;

    return (
        <>
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
                blog={mergedBlog}
                relatedBlogs={relatedBlogs}
                initialContent={{
                    en: { html: htmlEn, headings: headingsEn },
                    hi: { html: htmlHi, headings: headingsHi }
                }}
            />
        </>
    );
}
