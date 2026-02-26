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
        locale: 'en_IN',
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

    // ItemList schema — helps Google understand this is a destination index
    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Explore Rajasthan Destinations',
        description: 'Discover the majestic cities of Rajasthan — travel guides, blogs, and tips for every destination.',
        url: 'https://www.camelthar.com/destinations/',
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: destinations.length,
            itemListElement: destinations.map((dest, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: dest.name_en,
                url: `https://www.camelthar.com/destinations/${dest.id}/`,
            })),
        },
    };

    // BreadcrumbList schema
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
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Destinations',
                item: 'https://www.camelthar.com/destinations/',
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <DestinationsClient destinations={destinations} />
        </>
    );
}
