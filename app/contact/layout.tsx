import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | CamelThar',
    description: "Have questions about Rajasthan? Want to share your travel story? Get in touch with the CamelThar team. We'd love to hear from you.",
    alternates: {
        canonical: '/contact/',
    },
    openGraph: {
        title: 'Contact CamelThar - Get in Touch',
        description: 'Connect with us for collaborations, travel tips, or to share your Rajasthan experiences.',
        url: '/contact/',
        siteName: 'CamelThar',
        type: 'website',
        images: [
            {
                url: '/images/rajasthan-desert-hero.webp',
                width: 1200,
                height: 630,
                alt: 'Contact CamelThar',
            },
        ],
    },
    twitter: {
        card: 'summary',
        title: 'Contact CamelThar',
        description: "Reach out to us for anything related to Rajasthan travel.",
    },
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
