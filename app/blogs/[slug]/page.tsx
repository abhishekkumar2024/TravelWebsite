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

/**
 * Extracts FAQ Q&A pairs from blog content for FAQPage schema.
 * Looks for h3 elements (questions) followed by p elements (answers)
 * inside sections that contain "faq" in a preceding heading.
 */
function extractFAQSchema(html: string): Array<{ question: string; answer: string }> | null {
    if (!html) return null;
    try {
        const $ = cheerio.load(`<div id="__wrapper">${html}</div>`, null, false);
        const faqs: Array<{ question: string; answer: string }> = [];

        // Find FAQ sections by looking for headings containing "faq" or "frequently asked"
        $('#__wrapper h2, #__wrapper h3').each((_, heading) => {
            const headingText = $(heading).text().toLowerCase();
            if (!headingText.includes('faq') && !headingText.includes('frequently asked') && !headingText.includes('question')) {
                return;
            }

            // Collect h3 elements following this heading until next h2
            let sibling = $(heading).next();
            while (sibling.length) {
                const tag = sibling.prop('tagName')?.toLowerCase();
                if (tag === 'h2') break;

                if (tag === 'h3') {
                    const question = sibling.text().trim().replace(/^\d+\.\s*/, '');
                    const answerEl = sibling.next();
                    const answer = answerEl.text().trim();

                    if (question && answer && answer.length > 10) {
                        faqs.push({ question, answer: answer.slice(0, 500) });
                    }
                }
                sibling = sibling.next();
            }
        });

        return faqs.length >= 2 ? faqs : null;
    } catch {
        return null;
    }
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

        // 3. For EXTERNAL links: remove target="_blank" from image credit/attribution links.
        // These are short attribution anchors (e.g. "Image source", "Photo by", "via Unsplash")
        // that don't need to force-open a new tab. Keeps rel="noopener noreferrer nofollow" intact.
        const isImageCredit = /\b(image\s*source|photo\s*by|photo\s*credit|source|via\s+\w|credit|photographer)\b/i.test(attributes);
        if (isImageCredit) {
            let newAttributes = attributes.replace(/\s*target="_blank"/gi, '').replace(/\s+/g, ' ').trim();
            return `<a ${newAttributes}>`;
        }

        return match;
    });

    // 4. Add loading="lazy" + decoding="async" to all content images for performance.
    //    This prevents off-screen images from blocking the initial page render.
    processedHtml = processedHtml.replace(
        /<img\s([^>]*?)\/?>/gi,
        (match, attrs: string) => {
            let newAttrs = attrs;
            // Add loading="lazy" if not already present
            if (!/loading=/i.test(newAttrs)) {
                newAttrs += ' loading="lazy"';
            }
            // Add decoding="async" if not already present
            if (!/decoding=/i.test(newAttrs)) {
                newAttrs += ' decoding="async"';
            }
            return `<img ${newAttrs.trim()}>`;
        }
    );

    // 5. Wrap <img> in semantic <figure> + <figcaption> for SEO
    //    Uses the title attribute as visible caption, falls back to alt.
    //    Also absorbs any immediately following "Image source" <p> into the figcaption.
    processedHtml = processedHtml.replace(
        /(<img\s[^>]*?>)(\s*<p[^>]*>\s*<a[^>]*>\s*(?:Image\s*source|Photo\s*(?:by|credit)|Source|Credit)[^<]*<\/a>\s*<\/p>)?/gi,
        (match, imgTag: string, creditP?: string) => {
            // Extract title and alt from the img tag
            const titleMatch = imgTag.match(/title="([^"]*)"/i);
            const altMatch = imgTag.match(/alt="([^"]*)"/i);

            const captionText = titleMatch?.[1]?.trim() || altMatch?.[1]?.trim() || '';

            // Don't wrap if there's no meaningful caption
            if (!captionText && !creditP) return match;

            // Build figcaption content
            let figcaptionInner = '';
            if (captionText) {
                figcaptionInner += `<span>${captionText}</span>`;
            }
            if (creditP) {
                // Extract just the <a> tag from the credit paragraph
                const creditLink = creditP.match(/<a[^>]*>[^<]*<\/a>/i)?.[0] || '';
                if (creditLink) {
                    figcaptionInner += (figcaptionInner ? ' — ' : '') + creditLink;
                }
            }

            return `<figure>${imgTag}<figcaption>${figcaptionInner}</figcaption></figure>`;
        }
    );

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

// Enable ISR - safety net for on-demand revalidation (configurable via env)
export const revalidate = parseInt(process.env.REVALIDATE_SECONDS || '60', 10);
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

    // Extract FAQ pairs for FAQPage schema (rich snippets)
    const faqPairs = extractFAQSchema(blog.content_en || '');

    // Build ImageObject array for structured data
    // Cover image + all content images with proper schema
    const coverImgUrl = blog.coverImage.startsWith('http') ? blog.coverImage : `https://www.camelthar.com${blog.coverImage}`;
    const imageObjects: Array<{ '@type': string; url: string; caption?: string }> = [
        { '@type': 'ImageObject', url: coverImgUrl, caption: blog.meta_title || blog.title_en },
    ];
    // Add content images (from blog.images array) as ImageObject entries
    if (blog.images && blog.images.length > 0) {
        for (const imgUrl of blog.images.slice(0, 10)) { // Cap at 10 to keep schema lean
            if (imgUrl && !imgUrl.includes('/video/')) { // Skip videos
                imageObjects.push({
                    '@type': 'ImageObject',
                    url: imgUrl.startsWith('http') ? imgUrl : `https://www.camelthar.com${imgUrl}`,
                });
            }
        }
    }

    // structured data for rich snippets — Enhanced for SEO + AEO + GEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.meta_title || blog.title_en,
        description: blog.meta_description || blog.excerpt_en,
        image: imageObjects.length === 1 ? imageObjects[0] : imageObjects,
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

    // FAQPage schema — only injected when the content has real Q&A pairs.
    // Enables Google rich FAQ snippets without manual maintenance.
    const faqJsonLd = faqPairs ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqPairs.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: answer,
            },
        })),
    } : null;

    // --- Server-Side Content Processing (English only) ---
    const rawContentEn = blog.content_en || '';

    // Process English — all H1s in content are converted to H2
    const { cleanedHtml: docEn } = extractAndFixH1s(rawContentEn);
    const headingsEn = extractHeadings(docEn);
    const htmlEn = processContentForSEO(injectHeadingIds(docEn, headingsEn));

    // Strip raw content fields from the prop sent to the client.
    // They are already processed into htmlEn and sent as initialContent.
    const { content_en: _ce, content_hi: _ch, ...blogForClient } = { ...blog };

    return (
        <>
            {/* LCP preload: tell the browser about the hero image early */}
            <link
                rel="preload"
                as="image"
                href={blog.coverImage}
                fetchPriority="high"
            />
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
                blog={blogForClient as typeof blog}
                relatedBlogs={relatedBlogs}
                initialContent={{
                    en: { html: htmlEn, headings: headingsEn },
                }}
            />

        </>
    );
}

