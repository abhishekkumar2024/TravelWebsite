import { fetchPublishedBlogs } from '@/lib/supabaseBlogs';
import BlogsClient from './BlogsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Travel Blogs | CamelThar',
    description: 'Read the latest travel stories, guides, and tips from Rajasthan. Explore diverse destinations and cultural insights.',
    alternates: {
        canonical: '/blogs',
    },
};

// Revalidate every hour
export const revalidate = 3600;

export default async function BlogsPage() {
    // 1. Fetch data on the server
    const blogs = await fetchPublishedBlogs();

    // 2. Pass data to the Client Component
    return <BlogsClient initialBlogs={blogs} />;
}
