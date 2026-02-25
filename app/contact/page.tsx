import { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
    title: 'Contact Us | CamelThar',
    description: 'Get in touch with CamelThar. Have a question about Rajasthan travel? Want to collaborate or share your travel story? We\'d love to hear from you.',
    alternates: {
        canonical: '/contact/',
    },
    openGraph: {
        url: '/contact/',
        title: 'Contact Us - CamelThar',
        description: 'Reach out to CamelThar for Rajasthan travel questions, collaborations, or to share your travel story.',
        siteName: 'CamelThar',
        type: 'website',
    },
};

export default function ContactPage() {
    return <ContactForm />;
}
