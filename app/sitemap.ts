import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { demoDestinations } from '@/lib/data'

export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.camelthar.com'
    const siteLaunchDate = new Date('2024-01-01')

    // 1. Fetch only published blog slugs with timestamps and destinations
    let blogs: any[] = [];
    try {
        const result = await db.query(
            `SELECT slug, id, updated_at, created_at, destination FROM blogs WHERE status = 'published'`
        );
        blogs = result.rows;
    } catch (error) {
        console.error('[sitemap] Error fetching blogs:', error);
    }

    // Calculate global latest update time (for homepage/index pages)
    const latestBlogDate = (blogs && blogs.length > 0)
        ? new Date(Math.max(...blogs.map(b => new Date(b.updated_at || b.created_at).getTime())))
        : siteLaunchDate;

    const blogEntries = (blogs || []).map((blog) => ({
        url: `${baseUrl}/blogs/${blog.slug || blog.id}/`,
        lastModified: new Date(blog.updated_at || blog.created_at || siteLaunchDate),
        changeFrequency: 'daily' as const,
        priority: 0.9,
    }))

    // Calculate latest update time for each destination
    const destinationLastModified: Record<string, Date> = {};

    (blogs || []).forEach(blog => {
        if (!blog.destination) return;

        // Handle comma-separated destinations
        const dests = blog.destination.split(',').map((d: string) => d.trim().toLowerCase());
        const blogDate = new Date(blog.updated_at || blog.created_at || siteLaunchDate);

        dests.forEach((destId: string) => {
            if (!destinationLastModified[destId] || blogDate > destinationLastModified[destId]) {
                destinationLastModified[destId] = blogDate;
            }
        });
    });

    // 2. Add individual destination guides
    const destinationEntries = demoDestinations.map((dest) => {
        const lastMod = destinationLastModified[dest.id.toLowerCase()] || siteLaunchDate;

        return {
            url: `${baseUrl}/destinations/${dest.id}/`,
            lastModified: lastMod,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        };
    })

    // 3. Fetch published author slugs
    let authors: any[] = [];
    try {
        const result = await db.query(
            `SELECT slug, updated_at FROM authors WHERE slug IS NOT NULL`
        );
        authors = result.rows;
    } catch (error) {
        console.error('[sitemap] Error fetching authors:', error);
    }

    const authorEntries = (authors || [])
        .filter(a => a.slug)
        .map((author) => ({
            url: `${baseUrl}/author/${author.slug}/`,
            lastModified: author.updated_at ? new Date(author.updated_at) : siteLaunchDate,
            changeFrequency: 'monthly' as const,
            priority: 0.4,
        }))

    return [
        // Core pages
        { url: `${baseUrl}/`, lastModified: latestBlogDate, changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/blogs/`, lastModified: latestBlogDate, changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/destinations/`, lastModified: latestBlogDate, changeFrequency: 'weekly', priority: 0.9 },

        // Static pages
        { url: `${baseUrl}/about/`, lastModified: siteLaunchDate, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/contact/`, lastModified: siteLaunchDate, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/essentials/`, lastModified: siteLaunchDate, changeFrequency: 'weekly', priority: 0.6 },
        { url: `${baseUrl}/privacy-policy/`, lastModified: siteLaunchDate, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${baseUrl}/terms-of-service/`, lastModified: siteLaunchDate, changeFrequency: 'yearly', priority: 0.2 },
        // Dynamic pages
        ...destinationEntries,
        ...blogEntries,
        ...authorEntries,
    ]
}
