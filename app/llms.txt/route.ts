import { db } from '@/lib/db';
import { destinations } from '@/lib/data';

/**
 * Dynamic llms.txt — GEO optimization
 * 
 * Serves a machine-readable summary of the site for LLM crawlers.
 * Unlike the static version, this automatically includes the latest blog posts.
 * 
 * Spec: https://llmstxt.org/
 * Available at: https://www.camelthar.com/llms.txt
 */

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
    // Fetch latest published blogs
    let blogs: any[] = [];
    try {
        const result = await db.query(
            `SELECT slug, id, title_en, destination, category
             FROM blogs
             WHERE status = 'published'
             ORDER BY created_at DESC
             LIMIT 30`
        );
        blogs = result.rows;
    } catch (error) {
        console.error('[llms.txt] Error fetching blogs:', error);
    }

    const blogLinks = (blogs || [])
        .map(b => `- [${b.title_en}](https://www.camelthar.com/blogs/${b.slug || b.id}/): ${b.category || 'Travel'} — ${b.destination || 'Rajasthan'}`)
        .join('\n');

    const destinationLinks = destinations
        .map(d => `- [${d.name_en} (${d.tagline_en})](https://www.camelthar.com/destinations/${d.id}/): ${d.attractions.join(', ')}`)
        .join('\n');

    const content = `# CamelThar - Rajasthan Travel Guide

> CamelThar is a travel blog and destination guide focused on Rajasthan, India. It features authentic travel stories, city guides, desert safari tips, and cultural insights from the Land of Kings.

## About
CamelThar provides comprehensive travel content about Rajasthan's most popular destinations. The site features user-submitted travel stories, professional destination guides, and practical travel tips. Content is available in English and Hindi.

## Website
- URL: https://www.camelthar.com
- Language: English (primary), Hindi
- Content Type: Travel Blog, Destination Guides, Travel Tips
- Region Focus: Rajasthan, India

## Destinations Covered
${destinationLinks}

## Latest Blog Posts
${blogLinks}

## Content Sections
- [All Travel Blogs](https://www.camelthar.com/blogs/): Latest travel stories and guides from real travelers
- [Destinations](https://www.camelthar.com/destinations/): Comprehensive guides for each Rajasthan city
- [Travel Essentials](https://www.camelthar.com/essentials/): Packing tips, best travel times, safety advice
- [About Us](https://www.camelthar.com/about/): Our mission and story
- [Contact](https://www.camelthar.com/contact/): Get in touch

## Key Topics
- Best time to visit Rajasthan (October to March)
- Desert safari experiences in Jaisalmer and Bikaner
- Heritage walks and fort tours across Rajasthan
- Rajasthani culture, food, and traditions
- Solo travel and family trip planning for Rajasthan
- Budget and luxury travel options in Rajasthan

## Frequently Asked Questions
- **What is the best time to visit Rajasthan?** The best time is October to March when the weather is pleasant for sightseeing and desert activities.
- **How many days are needed for a Rajasthan trip?** 7-10 days for major cities; 14+ days for deeper rural exploration.
- **Is Rajasthan safe for solo female travelers?** Yes, Rajasthan is generally safe. People are hospitable. Follow standard travel precautions.
- **What to pack for a desert safari?** Cotton clothes for day, warm layers for night. Sunscreen, sunglasses, hat, and walking shoes are essential.

## Technical
- Built with: Next.js (React)
- Hosted on: Vercel
- Content Source: Neon PostgreSQL
- Images: Cloudinary CDN
- Sitemap: https://www.camelthar.com/sitemap.xml
- RSS Feed: https://www.camelthar.com/feed.xml
`;

    return new Response(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
    });
}
