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
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    // 2. Add individual destination guides
    const destinationEntries = demoDestinations.map((dest) => ({
        url: `${baseUrl}/destinations/${dest.id}/`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }))

    return [
        { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
        { url: `${baseUrl}/blogs/`, lastModified: new Date(), priority: 0.9 },
        { url: `${baseUrl}/destinations/`, lastModified: new Date(), priority: 0.9 },
        ...destinationEntries,
        ...blogEntries,
    ]
}
