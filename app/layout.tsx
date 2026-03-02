import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { outfit, notoSansDevanagari } from '@/lib/fonts';
import { LanguageProvider } from '@/components/LanguageProvider';
import { LoginModalProvider } from '@/components/LoginModalContext';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SessionTimeout from '@/components/SessionTimeout';
import AuthProvider from '@/components/AuthProvider';


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

    authors: [{ name: 'CamelThar' }],
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: '/',
        siteName: 'CamelThar',
        title: 'CamelThar - Travel Stories from the Land of Kings',
        description:
            'Explore Rajasthan through travel stories, destination guides, and insider tips. Discover the magic of Jaipur, Udaipur, and beyond.',
        images: [
            {
                url: '/camelthar_logo.webp',
                width: 512,
                height: 512,
                alt: 'CamelThar Logo',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@CamelThar',
        creator: '@CamelThar',
        title: 'CamelThar - Travel Stories from the Land of Kings',
        description:
            'Explore Rajasthan through travel stories, destination guides, and insider tips.',
        images: ['/camelthar_logo.webp'],
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
    // Preconnect hints via Next.js metadata (avoids manual <head> duplication)
    other: {
        'p:domain_verify': '8babaaa14408702493a829fbe247adda',
        // GEO: AI content classification hints for generative engines
        'ai.content.type': 'travel blog',
        'ai.content.region': 'Rajasthan, India',
        'ai.content.topics': 'travel, tourism, destinations, culture, heritage, desert safari',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${outfit.variable} ${notoSansDevanagari.variable}`}>
            <head>
                {/*
                 * Preconnect hints: establish early connections to 3rd-party origins.
                 * Kept here (not in metadata) because Next.js metadata API
                 * doesn't support <link rel="preconnect"> natively.
                 * These are safe — only 2 tags, no duplication risk.
                 */}
                <link rel="preconnect" href="https://res.cloudinary.com" />
                <link rel="dns-prefetch" href="https://res.cloudinary.com" />

                <meta name="referrer" content="strict-origin-when-cross-origin" />

                {/* RSS Feed autodiscovery — allows browsers, feed readers, and AI engines to find the feed */}
                <link
                    rel="alternate"
                    type="application/rss+xml"
                    title="CamelThar - Rajasthan Travel Stories"
                    href="https://www.camelthar.com/feed.xml"
                />
            </head>
            <body className="bg-gray-50 font-sans">
                <AuthProvider>
                    <LanguageProvider>
                        <LoginModalProvider>
                            <SessionTimeout />
                            <Navbar />
                            <main>{children}</main>
                            <Footer />
                        </LoginModalProvider>
                    </LanguageProvider>
                </AuthProvider>

                {/* GA4 — afterInteractive scripts belong inside the React tree (body), not <head> */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-BG1VBT8E8B"
                    strategy="afterInteractive"
                />
                <Script id="ga4" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-BG1VBT8E8B');
                    `}
                </Script>

                <Script
                    src="https://emrldco.com/NTAwNjIy.js?t=500622"
                    strategy="afterInteractive"
                    data-noptimize="1"
                    data-cfasync="false"
                    data-wpfc-render="false"
                />

                {/* Organization structured data — runs on every page for brand visibility */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Organization',
                            name: 'CamelThar',
                            url: 'https://www.camelthar.com',
                            logo: 'https://www.camelthar.com/camelthar_logo.webp',
                            description: 'Your gateway to Rajasthan travel stories, destination guides, and insider tips.',
                            foundingDate: '2024',
                            knowsAbout: [
                                'Rajasthan tourism', 'Thar Desert travel', 'India heritage tourism',
                                'Jaipur travel guide', 'Udaipur travel guide', 'Jaisalmer travel guide',
                                'Jodhpur travel guide', 'Desert safari India', 'Rajasthan culture and heritage',
                            ],
                            areaServed: {
                                '@type': 'State',
                                name: 'Rajasthan',
                                containedInPlace: { '@type': 'Country', name: 'India' },
                            },
                            sameAs: ['https://x.com/camelthar', 'https://www.instagram.com/cameltharinfo/'],
                            contactPoint: {
                                '@type': 'ContactPoint',
                                contactType: 'customer service',
                                url: 'https://www.camelthar.com/contact/',
                            },
                        }),
                    }}
                />

                {/* WebSite structured data — sitelinks search box + AEO Speakable */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebSite',
                            name: 'CamelThar',
                            url: 'https://www.camelthar.com',
                            description: 'Rajasthan travel stories, destination guides, desert safari tips, and cultural insights.',
                            inLanguage: 'en-IN',
                            potentialAction: {
                                '@type': 'SearchAction',
                                target: {
                                    '@type': 'EntryPoint',
                                    urlTemplate: 'https://www.camelthar.com/blogs/?search={search_term_string}',
                                },
                                'query-input': 'required name=search_term_string',
                            },
                        }),
                    }}
                />
            </body>
        </html>
    );
}
