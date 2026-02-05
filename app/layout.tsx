import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SessionTimeout from '@/components/SessionTimeout';


export const metadata: Metadata = {
    title: {
        default: 'CamelThar - Travel Stories from the Land of Kings',
        template: '%s | CamelThar',
    },
    metadataBase: new URL('https://www.camelthar.com'),
    alternates: {
        canonical: './',
    },
    description:
        'CamelThar - Your gateway to Rajasthan travel stories, destination guides, and insider tips. Discover Jaipur, Udaipur, Jaisalmer, Jodhpur, and more.',
    keywords: [
        'CamelThar',
        'Rajasthan travel',
        'Thar Desert',
        'India tourism',
        'Jaipur',
        'Udaipur',
        'Jaisalmer',
        'travel blog',
        'राजस्थान यात्रा',
        'desert safari',
    ],
    authors: [{ name: 'CamelThar' }],
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: './',
        siteName: 'CamelThar',
        title: 'CamelThar - Travel Stories from the Land of Kings',
        description:
            'Explore Rajasthan through travel stories, destination guides, and insider tips.',
        images: [
            {
                url: '/camelthar_logo.png',
                width: 512,
                height: 512,
                alt: 'CamelThar Logo',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CamelThar - Travel Stories from the Land of Kings',
        description:
            'Explore Rajasthan through travel stories, destination guides, and insider tips.',
        images: ['/camelthar_logo.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: '/logo-round.png?v=4',
        shortcut: '/logo-round.png?v=4',
        apple: '/logo-round.png?v=4',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                {/* Preconnect to external domains for faster loading */}
                <link rel="preconnect" href="https://res.cloudinary.com" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://res.cloudinary.com" />

                <meta name="referrer" content="strict-origin-when-cross-origin" />
                <link
                    rel="preload"
                    as="image"
                    href="/images/rajasthan-desert-hero-mobile.webp"
                    media="(max-width: 768px)"
                />
                <link
                    rel="preload"
                    as="image"
                    href="/images/rajasthan-desert-hero.webp"
                    media="(min-width: 769px)"
                />
            </head>
            <body className="bg-gray-50">
                <LanguageProvider>
                    <SessionTimeout />
                    <Navbar />
                    <main>{children}</main>
                    <Footer />
                </LanguageProvider>
            </body>
        </html>
    );
}
