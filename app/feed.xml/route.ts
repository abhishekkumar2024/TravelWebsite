import { supabase } from '@/lib/supabaseClient';

/**
 * RSS/Atom Feed for CamelThar
 * 
 * Why this matters for SEO + AEO + GEO:
 * - Google Discover uses RSS to find and feature new content
 * - Perplexity, ChatGPT, and other AI engines monitor RSS for fresh content
 * - News aggregators and blog directories index RSS feeds
 * - Enables automatic content syndication to reach wider audiences
 * 
 * Available at: https://www.camelthar.com/feed.xml
 */

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
    const baseUrl = 'https://www.camelthar.com';

    // Fetch latest published blogs
    const { data: blogs } = await supabase
        .from('blogs')
        .select('slug, id, title_en, excerpt_en, cover_image, created_at, updated_at, destination, category, authors(name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);

    const feedItems = (blogs || []).map((blog) => {
        const slug = blog.slug || blog.id;
        const pubDate = new Date(blog.created_at || Date.now()).toUTCString();
        const updateDate = new Date(blog.updated_at || blog.created_at || Date.now()).toISOString();
        const authorName = (blog.authors as any)?.name || 'CamelThar Team';
        const coverImage = blog.cover_image?.startsWith('http')
            ? blog.cover_image
            : `${baseUrl}${blog.cover_image || '/camelthar_logo.webp'}`;

        return `    <item>
      <title><![CDATA[${blog.title_en || 'Untitled'}]]></title>
      <link>${baseUrl}/blogs/${slug}/</link>
      <guid isPermaLink="true">${baseUrl}/blogs/${slug}/</guid>
      <description><![CDATA[${blog.excerpt_en || ''}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${authorName}</author>
      <category>${blog.category || 'Travel'}</category>
      <category>${blog.destination || 'Rajasthan'}</category>
      <enclosure url="${coverImage}" type="image/webp" />
    </item>`;
    }).join('\n');

    // Calculate last build date from most recent blog
    const lastBuildDate = blogs && blogs.length > 0
        ? new Date(blogs[0].created_at || Date.now()).toUTCString()
        : new Date().toUTCString();

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
>
  <channel>
    <title>CamelThar - Rajasthan Travel Stories</title>
    <link>${baseUrl}</link>
    <description>Authentic travel stories, destination guides, and insider tips from Rajasthan, India. Discover Jaipur, Udaipur, Jaisalmer, Jodhpur, and more.</description>
    <language>en-in</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <managingEditor>contact@camelthar.com (CamelThar)</managingEditor>
    <webMaster>contact@camelthar.com (CamelThar)</webMaster>
    <copyright>© ${new Date().getFullYear()} CamelThar. All rights reserved.</copyright>
    <image>
      <url>${baseUrl}/camelthar_logo.webp</url>
      <title>CamelThar</title>
      <link>${baseUrl}</link>
      <width>512</width>
      <height>512</height>
    </image>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${feedItems}
  </channel>
</rss>`;

    return new Response(feed, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
    });
}
