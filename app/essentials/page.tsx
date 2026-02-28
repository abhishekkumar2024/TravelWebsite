import { Metadata } from 'next';
import EssentialsContent from './EssentialsContent';
import { fetchProducts } from '@/lib/db/queries';

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
        siteName: 'CamelThar',
        type: 'website',
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

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://www.camelthar.com/'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Essentials',
                item: 'https://www.camelthar.com/essentials/'
            }
        ]
    };

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Rajasthan Trip Essentials',
        description: 'Curated gear and packing list for travelers visiting Rajasthan, India.',
        itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@type': 'Product',
                name: product.name,
                description: product.description,
                image: product.imageUrl,
                url: product.affiliateLink || 'https://www.camelthar.com/essentials/',
                offers: {
                    '@type': 'Offer',
                    price: product.price ? product.price.replace(/[^0-9.]/g, '') : '0',
                    priceCurrency: 'INR',
                    availability: 'https://schema.org/InStock'
                }
            }
        }))
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
            />
            <EssentialsContent products={products} />
        </>
    );
}

