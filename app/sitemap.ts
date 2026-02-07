import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabaseClient'

export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://www.camelthar.com'

    // Fetch only published blog slugs
    const { data: blogs } = await supabase
        .from('blogs')
        .select('slug, id, updated_at')
        .eq('status', 'published')

    const blogEntries = (blogs || []).map((blog) => ({
        url: `${baseUrl}/blog/${blog.slug || blog.id}/`,
        lastModified: new Date(blog.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    return [
        { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
        { url: `${baseUrl}/destinations/`, lastModified: new Date(), priority: 0.9 },
        ...blogEntries,
    ]
}
