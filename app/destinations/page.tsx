import { Metadata } from 'next';
import { demoDestinations } from '@/lib/data';
import { fetchBlogCountsByDestination } from '@/lib/supabaseBlogs';
import DestinationsClient from './DestinationsClient';

export const metadata: Metadata = {
    title: 'Explore Rajasthan Destinations | CamelThar',
    description:
        'Discover the majestic cities of Rajasthan — Jaipur, Udaipur, Jaisalmer, Jodhpur, Pushkar, and Mount Abu. Travel guides, blogs, and tips for every destination.',
    alternates: {
        canonical: '/destinations/',
    },
    openGraph: {
        title: 'Explore Rajasthan Destinations | CamelThar',
        description:
            'Discover the majestic cities of Rajasthan. Travel guides, blogs, and tips for Jaipur, Udaipur, Jaisalmer, and more.',
        url: '/destinations/',
        siteName: 'CamelThar',
        type: 'website',
        images: [
            {
                url: '/images/rajasthan-desert-hero.webp',
                width: 1200,
                height: 630,
                alt: 'Rajasthan Destinations',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Explore Rajasthan Destinations | CamelThar',
        description: 'Discover the majestic cities of Rajasthan.',
        images: ['/images/rajasthan-desert-hero.webp'],
    },
};

// Revalidate every hour
export const revalidate = 3600;

export default async function DestinationsPage() {
    // Fetch on the server so all destination data is in the initial HTML
    const counts = await fetchBlogCountsByDestination();
    const destinations = demoDestinations.map(dest => ({
        ...dest,
        blogCount: counts[dest.id.toLowerCase()] || 0,
    }));

    return <DestinationsClient destinations={destinations} />;
}
