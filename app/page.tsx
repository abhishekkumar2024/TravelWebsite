import { Metadata } from 'next';
import { demoBlogs, demoDestinations } from '@/lib/data';
import { fetchBlogCountsByDestination, fetchPublishedBlogs } from '@/lib/supabaseBlogs';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
    title: 'CamelThar - Travel Stories from the Land of Kings',
    description:
        'CamelThar - Your gateway to Rajasthan travel stories, destination guides, and insider tips. Discover Jaipur, Udaipur, Jaisalmer, Jodhpur, and more.',
    alternates: {
        canonical: '/',
    },
};

// Revalidate homepage every 60 seconds (ISR) — fast for repeat visitors, fresh content
export const revalidate = 60;

export default async function HomePage() {
    // Fetch data on the server — this HTML is what Google sees
    const [counts, supabaseBlogs] = await Promise.all([
        fetchBlogCountsByDestination(),
        fetchPublishedBlogs(3),
    ]);

    // Merge blog counts into destinations
    const destinations = demoDestinations.map(dest => ({
        ...dest,
        blogCount: counts[dest.id.toLowerCase()] || 0,
    }));

    // Determine blogs to show
    let blogs;
    if (supabaseBlogs.length >= 3) {
        blogs = supabaseBlogs;
    } else if (supabaseBlogs.length > 0) {
        blogs = [...supabaseBlogs, ...demoBlogs].slice(0, 3);
    } else {
        blogs = demoBlogs.slice(0, 3);
    }

    // BreadcrumbList schema — root breadcrumb
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://www.camelthar.com/',
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <HomePageClient destinations={destinations} blogs={blogs} />
        </>
    );
}
