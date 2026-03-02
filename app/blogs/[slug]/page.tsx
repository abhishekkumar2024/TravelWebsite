import { Suspense, cache } from 'react';
import * as cheerio from 'cheerio';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { BlogPost } from '@/lib/data';
import { fetchBlogById, fetchRelatedBlogs } from '@/lib/db/queries';
import { db } from '@/lib/db';
import BlogContent from './BlogContent';
import { extractHeadings, injectHeadingIds } from '@/lib/blog-utils';

// Request-level memoization - ensures DB is only hit once per request
// (Once for generateMetadata and once for the Page component)
const getBlogData = cache(async (id: string) => {
    return fetchBlogById(id);
});

const getRelatedBlogsData = cache(async (destination: string, currentId: string) => {
    return fetchRelatedBlogs(destination, currentId);
});

/**
 * Strips ALL <h1> tags from blog content and converts them to <h2>.
 * The hero section already renders the sole <h1> (the blog title).
 * Having any additional <h1> in the content body would violate the
 * "one H1 per page" SEO rule and confuse Google's topic understanding.
 */
function extractAndFixH1s(html: string): { cleanedHtml: string } {
    if (!html) return { cleanedHtml: html };

    // Load into a wrapper to handle root-level H1s correctly
    const $ = cheerio.load(`<div id="__wrapper">${html}</div>`, null, false);

    // Convert EVERY h1 in content to h2 — the hero <h1> is the page's sole H1
    $('#__wrapper h1').each((_, element) => {
        $(element).replaceWith(`<h2>${$(element).html()}</h2>`);
    });

    return {
        cleanedHtml: $('#__wrapper').html() || '',
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
    try {
        const result = await db.query<{ slug: string; id: string }>(
            `SELECT slug, id FROM blogs WHERE status = 'published' AND deleted_at IS NULL`
        );

        if (!result.rows.length) {
            console.warn('[BlogPage] No blogs found — check DB connection');
        }

        return result.rows.map((blog) => ({
            slug: blog.slug || blog.id,
        }));
    } catch (error) {
        console.error('[BlogPage] generateStaticParams DB error:', error);
        throw error;
    }
}

// Enable ISR - 1 hour revalidation
export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
    params: {
        slug: string;
    }
}

// Generate SEO metadata - Directly from DB (Best for SEO)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const blog = await getBlogData(params.slug);

        if (!blog) {
            return {
                title: 'Travel Blog | CamelThar',
            };
        }

        // Use meta_title if set by admin, otherwise fall back to blog title.
        // Do NOT append content H1 text — that causes keyword stuffing & over-long titles.
        const pageTitle = blog.meta_title || blog.title_en;

        const pageSlug = blog.slug || blog.id;
        const pagePath = `/blogs/${pageSlug}/`;

        return {
            title: pageTitle,
            description: blog.meta_description || blog.excerpt_en,
            alternates: {
                canonical: pagePath,
            },
            openGraph: {
                title: pageTitle,
                description: blog.meta_description || blog.excerpt_en,
                url: pagePath,
                siteName: 'CamelThar',
                locale: 'en_IN',
                type: 'article',
                publishedTime: blog.publishedAt,
                images: [{ url: blog.coverImage, width: 1200, height: 630, alt: pageTitle }],
            },
            twitter: {
                card: 'summary_large_image',
                title: pageTitle,
                description: blog.meta_description || blog.excerpt_en,
                images: [blog.coverImage],
            },
        };
    } catch (err) {
        return { title: 'Travel Blog | CamelThar' };
    }
}

export default async function BlogPage({ params }: PageProps) {
    const { slug } = params;

    // Fetch blog data - Direct DB query (Server-Side)
    const blog = await getBlogData(slug);

    if (!blog) {
        notFound();
    }

    // Fetch related blogs - Direct DB query
    const relatedBlogs = await getRelatedBlogsData(blog.destination, blog.id);

    // Calculate word count
    const plainText = (blog.content_en || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    // structured data for rich snippets — Enhanced for SEO + AEO + GEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.meta_title || blog.title_en,
        description: blog.meta_description || blog.excerpt_en,
        image: blog.coverImage.startsWith('http') ? blog.coverImage : `https://www.camelthar.com${blog.coverImage}`,
        datePublished: blog.publishedAt ? new Date(blog.publishedAt).toISOString() : new Date().toISOString(),
        dateModified: blog.updated_at ? new Date(blog.updated_at).toISOString() : new Date().toISOString(),
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
        inLanguage: 'en-IN',
        wordCount: wordCount,
        articleSection: blog.category || 'Travel',
        ...(blog.destination ? {
            about: {
                '@type': 'TouristDestination',
                name: blog.destination.split(',')[0].trim().charAt(0).toUpperCase() + blog.destination.split(',')[0].trim().slice(1),
                containedInPlace: {
                    '@type': 'State',
                    name: 'Rajasthan',
                    containedInPlace: { '@type': 'Country', name: 'India' }
                }
            }
        } : {}),
    };

    const destName = blog.destination?.split(',')[0].trim() || 'rajasthan';
    const destLabel = destName.charAt(0).toUpperCase() + destName.slice(1);
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.camelthar.com/' },
            { '@type': 'ListItem', position: 2, name: 'Travel Blogs', item: 'https://www.camelthar.com/blogs/' },
            {
                '@type': 'ListItem',
                position: 3,
                name: destLabel,
                item: `https://www.camelthar.com/destinations/${destName}/`
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: blog.meta_title || blog.title_en,
                item: `https://www.camelthar.com/blogs/${blog.slug || blog.id}/`
            }
        ]
    };

    // --- Server-Side Content Processing ---
    const rawContentEn = blog.content_en || '';
    const rawContentHi = blog.content_hi || blog.content_en || '';

    // Process English — all H1s in content are converted to H2
    const { cleanedHtml: docEn } = extractAndFixH1s(rawContentEn);
    const headingsEn = extractHeadings(docEn);
    const htmlEn = processContentForSEO(injectHeadingIds(docEn, headingsEn));

    // Process Hindi — same H1 → H2 conversion
    const { cleanedHtml: docHi } = extractAndFixH1s(rawContentHi);
    const headingsHi = extractHeadings(docHi);
    const htmlHi = processContentForSEO(injectHeadingIds(docHi, headingsHi));

    // Pass blog as-is — title_en is used directly as the hero <h1>,
    // no extra H1 text is appended (prevents duplicate/stuffed titles)
    const mergedBlog = { ...blog };

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

