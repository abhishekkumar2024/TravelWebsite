import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabaseClient'
import { demoDestinations } from '@/lib/data'

export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.camelthar.com'

    // 1. Fetch only published blog slugs
    const { data: blogs } = await supabase
        .from('blogs')
        .select('slug, id, updated_at')
        .eq('status', 'published')

    const blogEntries = (blogs || []).map((blog) => ({
        url: `${baseUrl}/blog/${blog.slug || blog.id}/`,
        lastModified: new Date(blog.updated_at || Date.now()),
        changeFrequency: 'daily' as const,
        priority: 0.9,
    }))

    // 2. Add individual destination guides
    const destinationEntries = demoDestinations.map((dest) => ({
        url: `${baseUrl}/destinations/${dest.id}/`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    return [
        // Core pages
        { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/blogs/`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/destinations/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/about/`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/contact/`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/essentials/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
        { url: `${baseUrl}/privacy-policy/`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
        { url: `${baseUrl}/terms-of-service/`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
        // Dynamic pages
        ...destinationEntries,
        ...blogEntries,
    ]
}
