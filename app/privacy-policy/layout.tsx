import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | CamelThar',
    description: 'Learn how CamelThar collects, uses, and protects your data.',
    alternates: {
        canonical: '/privacy-policy/',
    },
    openGraph: {
        url: '/privacy-policy/',
        title: 'Privacy Policy | CamelThar',
        description: 'Learn how CamelThar collects, uses, and protects your data.',
        siteName: 'CamelThar',
        type: 'website',
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

export default function PrivacyPolicyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
