import { fetchPublishedBlogs, fetchAvailableDestinations } from '@/lib/supabaseBlogs';
import BlogsClient from './BlogsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Travel Blogs | CamelThar',
    description: 'Read the latest travel stories, guides, and tips from Rajasthan. Explore diverse destinations and cultural insights.',
    alternates: {
        canonical: '/blogs/',
    },
    openGraph: {
        title: 'Travel Blogs - Rajasthan Travel Stories | CamelThar',
        description: 'Discover Rajasthan through authentic travel stories and guides. From Jaipur to Jaisalmer, explore the land of kings.',
        url: '/blogs/',
        siteName: 'CamelThar',
        type: 'website',
        images: [
            {
                url: '/images/rajasthan-desert-hero.webp',
                width: 1200,
                height: 630,
                alt: 'CamelThar Travel Blogs',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Travel Blogs | CamelThar',
        description: 'Read the latest travel stories and guides from across Rajasthan.',
        images: ['/images/rajasthan-desert-hero.webp'],
    },
};

// Revalidate every hour
export const revalidate = 3600;

export default async function BlogsPage() {
    // 1. Fetch data on the server
    const blogs = await fetchPublishedBlogs();
    const destinations = await fetchAvailableDestinations();

    // ItemList structured data — helps Google understand this is a blog index
    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Travel Blogs | CamelThar',
        description: 'Read the latest travel stories, guides, and tips from Rajasthan.',
        url: 'https://www.camelthar.com/blogs/',
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: blogs.length,
            itemListElement: blogs.slice(0, 30).map((blog, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: blog.title_en,
                url: `https://www.camelthar.com/blog/${blog.slug || blog.id}/`,
            })),
        },
    };

    // 2. Pass data to the Client Component
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
            />
            <BlogsClient initialBlogs={blogs} destinations={destinations} />
        </>
    );
}
