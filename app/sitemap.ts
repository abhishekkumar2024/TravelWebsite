import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabaseClient'
import { demoDestinations } from '@/lib/data'

export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.camelthar.com'
    const siteLaunchDate = new Date('2024-01-01')

    // 1. Fetch only published blog slugs with timestamps and destinations
    const { data: blogs } = await supabase
        .from('blogs')
        .select('slug, id, updated_at, created_at, destination')
        .eq('status', 'published')

    // Calculate global latest update time (for homepage/index pages)
    // This ensures these pages only look "fresh" when actual content is added or updated
    const latestBlogDate = (blogs && blogs.length > 0)
        ? new Date(Math.max(...blogs.map(b => new Date(b.updated_at || b.created_at).getTime())))
        : siteLaunchDate;

    const blogEntries = (blogs || []).map((blog) => ({
        url: `${baseUrl}/blog/${blog.slug || blog.id}/`,
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
        // Fallback to siteLaunchDate instead of new Date() to avoid false freshness
        const lastMod = destinationLastModified[dest.id.toLowerCase()] || siteLaunchDate;

        return {
            url: `${baseUrl}/destinations/${dest.id}/`,
            lastModified: lastMod,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        };
    })

    return [
        // Core pages
        // Homepage freshness = latest content on the site
        { url: `${baseUrl}/`, lastModified: latestBlogDate, changeFrequency: 'daily', priority: 1.0 },
        // Blog listing freshness = latest blog post
        { url: `${baseUrl}/blogs/`, lastModified: latestBlogDate, changeFrequency: 'daily', priority: 0.9 },
        // Destinations listing freshness = latest content (since it aggregates counts/images)
        { url: `${baseUrl}/destinations/`, lastModified: latestBlogDate, changeFrequency: 'weekly', priority: 0.9 },

        // Static pages - use stable dates unless manually updated
        { url: `${baseUrl}/about/`, lastModified: siteLaunchDate, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/contact/`, lastModified: siteLaunchDate, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/essentials/`, lastModified: siteLaunchDate, changeFrequency: 'weekly', priority: 0.6 },
        { url: `${baseUrl}/privacy-policy/`, lastModified: siteLaunchDate, changeFrequency: 'yearly', priority: 0.2 },
        { url: `${baseUrl}/terms-of-service/`, lastModified: siteLaunchDate, changeFrequency: 'yearly', priority: 0.2 },
        // Dynamic pages
        ...destinationEntries,
        ...blogEntries,
    ]
}
