import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | CamelThar',
    description: 'Read the terms and conditions for using CamelThar services.',
    alternates: {
        canonical: '/terms-of-service/',
    },
    openGraph: {
        url: '/terms-of-service/',
        title: 'Terms of Service | CamelThar',
        description: 'Read the terms and conditions for using CamelThar services.',
        images: [
            {
                url: '/camelthar_logo.png',
                width: 512,
                height: 512,
                alt: 'CamelThar Logo',
            },
        ],
    },
};

export default function TermsOfServiceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
