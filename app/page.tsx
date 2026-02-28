import { Metadata } from 'next';
import { destinations } from '@/lib/data';
import { fetchBlogCountsByDestination, fetchPublishedBlogs } from '@/lib/db/queries';
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
    const [counts, dbBlogs] = await Promise.all([
        fetchBlogCountsByDestination(),
        fetchPublishedBlogs(3),
    ]);

    // Merge blog counts into destinations
    const destinationsWithCounts = destinations.map(dest => ({
        ...dest,
        blogCount: counts[dest.id.toLowerCase()] || 0,
    }));

    // Use only real database blogs
    const blogs = dbBlogs;

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

    // GEO + AEO: Homepage schema — tells AI "what this site IS" at the top level
    const homepageJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'CamelThar - Travel Stories from the Land of Kings',
        description: 'Your gateway to Rajasthan travel stories, destination guides, and insider tips. Discover Jaipur, Udaipur, Jaisalmer, Jodhpur, and more.',
        url: 'https://www.camelthar.com/',
        inLanguage: 'en-IN',
        isPartOf: {
            '@type': 'WebSite',
            name: 'CamelThar',
            url: 'https://www.camelthar.com'
        },
        about: {
            '@type': 'State',
            name: 'Rajasthan',
            containedInPlace: { '@type': 'Country', name: 'India' }
        },
        // GEO: Offers signal — AI engines understand this site provides travel guides
        mainEntity: {
            '@type': 'TravelAction',
            name: 'Explore Rajasthan',
            description: 'Discover authentic travel stories, destination guides, desert safari tips, and cultural insights from Rajasthan, India.',
            location: {
                '@type': 'State',
                name: 'Rajasthan',
                containedInPlace: { '@type': 'Country', name: 'India' },
            },
        },
        // AEO: Speakable — voice assistants read the hero tagline
        speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', '.hero-subtitle', 'meta[name="description"]']
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
            />
            <HomePageClient destinations={destinationsWithCounts} blogs={blogs} />
        </>
    );
}
