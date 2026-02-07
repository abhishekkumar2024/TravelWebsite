import { Metadata } from 'next';
import EssentialsContent from './EssentialsContent';
import { fetchProducts } from '@/lib/supabaseProducts';

export const metadata: Metadata = {
    title: 'Trip Essentials | CamelThar',
    description: 'The ultimate checklist and gear guide for your Rajasthan adventure.',
    alternates: {
        canonical: '/essentials/',
    },
    openGraph: {
        url: '/essentials/',
        title: 'Trip Essentials - Gear Up for Rajasthan | CamelThar',
        description: 'Find everything you need for your trip to the Land of Kings.',
        images: [
            {
                url: '/images/rajasthan-desert-hero.webp',
                width: 1200,
                height: 630,
                alt: 'Trip Essentials',
            },
        ],
    },
};

export const revalidate = 3600; // Revalidate every hour

export default async function TripEssentialsPage() {
    const products = await fetchProducts();
    return <EssentialsContent products={products} />;
}
