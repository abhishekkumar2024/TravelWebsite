import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Page Not Found | CamelThar',
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-sand/20 px-4">
            <div className="text-center max-w-lg mx-auto bg-white p-10 rounded-3xl shadow-xl border border-sand">
                <div className="text-8xl mb-4">🐪</div>
                <h2 className="text-4xl font-bold text-royal-blue mb-4 font-outfit">temporary error</h2>
                <p className="text-gray-600 mb-8 text-lg">
                    Oops! Looks like you've wandered too far into the desert. The page you are looking for doesn't exist.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-6 py-3 bg-royal-blue text-white font-medium rounded-full hover:bg-deep-maroon transition-colors shadow-lg"
                    >
                        Return Home
                    </Link>
                    <Link
                        href="/destinations/"
                        className="px-6 py-3 bg-desert-gold/10 text-desert-gold font-medium rounded-full hover:bg-desert-gold/20 transition-colors border border-desert-gold/20"
                    >
                        Explore Destinations
                    </Link>
                </div>
            </div>
        </div>
    );
}
