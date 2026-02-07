import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Explore Rajasthan Destinations | CamelThar',
    description: 'Discover the best places to visit in Rajasthan. Explore Jaipur, Udaipur, Jaisalmer, Jodhpur, and more with our comprehensive travel guides.',
    alternates: {
        canonical: '/destinations/',
    },
    openGraph: {
        title: 'Explore Rajasthan - Top Destinations | CamelThar',
        description: 'Plan your perfect trip to Rajasthan. Discover majesty in every corner of the Land of Kings.',
        url: '/destinations/',
        siteName: 'CamelThar',
        type: 'website',
        images: [
            {
                url: '/images/rajasthan-desert-hero.webp',
                width: 1200,
                height: 630,
                alt: 'Explore Rajasthan Destinations',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Rajasthan Travel Destinations | CamelThar',
        description: 'Guides and stories for all major Rajasthan cities.',
        images: ['/images/rajasthan-desert-hero.webp'],
    },
};

export default function DestinationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
