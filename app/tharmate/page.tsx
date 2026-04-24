/**
 * TharMate — Find a Travel Companion
 * 
 * The core feature of CamelThar — connecting solo travelers
 * exploring Rajasthan with like-minded companions.
 */

import type { Metadata } from 'next';
import TharMateClient from './TharMateClient';

export const metadata: Metadata = {
    title: 'TharMate — Find Travel Companions in Rajasthan | CamelThar',
    description: 'Going solo to Jaisalmer, Jaipur, or Udaipur? Post your travel plan and find a TharMate — a real travel companion who vibes with you. Browse plans, filter by city, and connect with fellow travelers. No group tours, just genuine connections in the Thar Desert.',
    keywords: [
        'travel companion Rajasthan',
        'solo travel India',
        'travel buddy Rajasthan',
        'Jaisalmer travel partner',
        'Jaipur travel companion',
        'Udaipur solo traveler',
        'find travel partner India',
        'TharMate',
        'CamelThar',
        'Rajasthan solo trip',
        'travel companion finder',
        'desert safari companion',
    ],
    alternates: {
        canonical: 'https://www.camelthar.com/tharmate/',
    },
    openGraph: {
        title: 'TharMate — Find Travel Companions in Rajasthan',
        description: 'Solo traveler? Post your plan and find a TharMate. Browse active travel plans across Jaisalmer, Jaipur, Udaipur, Jodhpur & more. Real connections, not group tours.',
        type: 'website',
        url: 'https://www.camelthar.com/tharmate/',
        siteName: 'CamelThar',
        images: [
            {
                url: '/camelthar_logo.webp',
                width: 512,
                height: 512,
                alt: 'TharMate — Find Travel Companions | CamelThar',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'TharMate — Find Travel Companions in Rajasthan',
        description: 'Going solo? Post your travel plan and find a TharMate to explore Rajasthan together.',
    },
    robots: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large' as any,
        'max-video-preview': -1,
    },
};

// JSON-LD Structured Data for search engines and AI bots
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TharMate — Travel Companion Finder',
    url: 'https://www.camelthar.com/tharmate/',
    description: 'Find travel companions for Rajasthan. Post your plan, browse active plans, and connect with solo travelers exploring Jaisalmer, Jaipur, Udaipur, Jodhpur, and more.',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        description: 'Free to use — post plans and find companions',
    },
    provider: {
        '@type': 'Organization',
        name: 'CamelThar',
        url: 'https://www.camelthar.com',
    },
    areaServed: {
        '@type': 'State',
        name: 'Rajasthan',
        containedInPlace: {
            '@type': 'Country',
            name: 'India',
        },
    },
    featureList: [
        'Post travel plans with date, time, and destination',
        'Browse active plans from solo travelers',
        'Filter by city: Jaisalmer, Jaipur, Udaipur, Jodhpur, Pushkar, Mount Abu, Bikaner',
        'Vibe-based matching: photography, food, adventure, culture, sunset',
        'Join requests with companion limit',
        'Spark alerts for plans departing soon',
    ],
};

// FAQ structured data for rich snippets
const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I find a travel companion for Rajasthan?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Use TharMate on CamelThar — post your travel plan (destination, date, vibe) and other solo travelers heading to the same place can request to join you. Browse existing plans or create your own for cities like Jaisalmer, Jaipur, Udaipur, and Jodhpur.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is TharMate free to use?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, TharMate is completely free. You can post plans, browse plans, and connect with travel companions at no cost.',
            },
        },
        {
            '@type': 'Question',
            name: 'What cities can I find travel companions for?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'TharMate supports all major Rajasthan destinations including Jaisalmer, Jaipur, Udaipur, Jodhpur, Pushkar, Mount Abu, and Bikaner. Filter plans by city to find companions going where you are.',
            },
        },
        {
            '@type': 'Question',
            name: 'How does TharMate matching work?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Travelers post plans with their destination, date, time, meeting point, and travel vibe (photography, food, adventure, culture, etc.). Others browse these plans and send join requests. The plan creator accepts or declines based on compatibility.',
            },
        },
    ],
};

export default function TharMatePage() {
    return (
        <main className="min-h-screen" style={{ background: '#FDF6EC' }}>
            {/* JSON-LD for search engines & AI */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />

            <TharMateClient />
        </main>
    );
}
