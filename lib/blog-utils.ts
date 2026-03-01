
/**
 * Blog Content Utilities for Server/Client use
 * 
 * These functions handle HTML processing, heading extraction, and SEO normalization.
 * Moved here to support both SSR (page.tsx) and Client (TableOfContents.tsx) 
 * without 'use client' bailout issues.
 */

export interface TocHeading {
    id: string;
    text: string;
    level: number;
}

/**
 * Slugify heading text into a URL-safe anchor ID.
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .replace(/^-+|-+$/g, '');
}

/**
 * Decode common HTML entities safely without DOM access.
 */
function decodeEntities(text: string): string {
    return text
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;/gi, "'")
        .replace(/&#x27;/gi, "'");
}

/**
 * Extract headings from HTML string.
 * Uses Regex to be compatible with both Server (Node) and Client (Browser).
 */
export function extractHeadings(html: string): TocHeading[] {
    const headings: TocHeading[] = [];
    const usedIds = new Set<string>();

    const regex = /<h([123])[^>]*>(.*?)<\/h[123]>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const level = parseInt(match[1], 10);
        const text = match[2].replace(/<[^>]*>/g, '').trim();
        if (!text) continue;

        const tocLevel = level === 1 ? 2 : level;
        let id = slugify(text);

        // Handle duplicate IDs
        if (usedIds.has(id)) {
            let counter = 2;
            while (usedIds.has(`${id}-${counter}`)) counter++;
            id = `${id}-${counter}`;
        }
        usedIds.add(id);
        headings.push({ id, text, level: tocLevel });
    }

    return headings;
}

/**
 * Inject anchor IDs into heading tags in the HTML content.
 */
export function injectHeadingIds(html: string, headings: TocHeading[]): string {
    let headingIndex = 0;
    return html.replace(/<h([123])([^>]*)>(.*?)<\/h[123]>/gi, (fullMatch, level, attrs, content) => {
        if (headingIndex >= headings.length) return fullMatch;

        const heading = headings[headingIndex];
        const plainText = decodeEntities(content.replace(/<[^>]*>/g, '')).trim();

        if (plainText === heading.text) {
            headingIndex++;
            if (/id=["'][^"']*["']/i.test(attrs)) {
                attrs = attrs.replace(/id=["'][^"']*["']/i, `id="${heading.id}"`);
            } else {
                attrs = ` id="${heading.id}"${attrs}`;
            }
            return `<h${level}${attrs}>${content}</h${level}>`;
        }
        return fullMatch;
    });
}
