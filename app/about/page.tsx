
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us | CamelThar',
    description: 'Learn about CamelThar, our mission to showcase the beauty of Rajasthan, and the team behind the stories.',
    alternates: {
        canonical: '/about/',
    },
    openGraph: {
        title: 'About CamelThar - Our Mission & Story',
        description: 'Discover the heart behind CamelThar and our passion for Rajasthan travel.',
        url: '/about/',
        siteName: 'CamelThar',
        type: 'website',
        images: [
            {
                url: '/images/rajasthan-desert-hero.webp',
                width: 1200,
                height: 630,
                alt: 'About CamelThar',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About CamelThar',
        description: 'The story behind the Land of Kings travel site.',
        images: ['/images/rajasthan-desert-hero.webp'],
    },
};

export default function AboutPage() {
    return (
        <div className="pt-24 pb-20">
            {/* Hero Section */}
            <div className="relative h-[400px] mb-16">
                <Image
                    src="/images/rajasthan-desert-hero.webp"
                    alt="CamelThar Desert"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white px-4">
                        <h1 className="text-4xl md:text-6xl font-bold mb-4 font-outfit">About CamelThar</h1>
                        <p className="text-xl md:text-2xl max-w-2xl mx-auto opacity-90">
                            Celebrating the Land of Kings, one story at a time.
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto px-4">
                {/* Mission Section */}
                <section className="mb-20 text-center">
                    <h2 className="text-3xl font-bold text-royal-blue mb-6">Our Mission</h2>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        At <span className="text-desert-gold font-bold">CamelThar</span>, we believe that Rajasthan is more than just a destination—it's an emotion. From the golden sands of Jaisalmer to the lakes of Udaipur, our mission is to bring you the most authentic, hidden, and majestic stories from India's most colorful state. We aim to connect travelers with the rich heritage, culture, and warmth of Rajasthan.
                    </p>
                </section>

                {/* Values Grid */}
                <section className="grid md:grid-cols-3 gap-8 mb-20">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 bg-desert-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            🏰
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Heritage</h3>
                        <p className="text-gray-600">Preserving and sharing the ancient tales of forts and palaces.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 bg-desert-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            🐪
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Adventure</h3>
                        <p className="text-gray-600">Guiding you to the best desert safaris and offbeat paths.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 bg-desert-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                            🤝
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Community</h3>
                        <p className="text-gray-600">Building a community of travelers who love and respect the land.</p>
                    </div>
                </section>

                {/* Story/Team Section */}
                <section className="flex flex-col md:flex-row items-center gap-12 bg-royal-blue text-white rounded-3xl p-8 md:p-12 shadow-xl overflow-hidden relative">
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #D4A853 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    <div className="md:w-1/2 relative z-10">
                        <h2 className="text-3xl font-bold mb-4 text-desert-gold">Why We Started</h2>
                        <p className="text-gray-200 mb-6 leading-relaxed">
                            CamelThar began as a small diary of a traveler who fell in love with uniformity of the Thar Desert. Today, it has grown into a platform where travelers from around the world share their experiences. We want to make sure your trip to Rajasthan is nothing short of magical.
                        </p>
                        <Link href="/contact" className="inline-block bg-desert-gold text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-royal-blue transition-all">
                            Contact Us
                        </Link>
                    </div>
                    <div className="md:w-1/2 relative h-64 w-full rounded-xl overflow-hidden border-4 border-white/20 shadow-lg">
                        <Image
                            src="/images/jaipur-hawa-mahal.webp"
                            alt="Hawa Mahal"
                            fill
                            className="object-cover"
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
