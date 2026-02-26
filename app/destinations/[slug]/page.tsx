
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { demoDestinations } from '@/lib/data';
import { fetchBlogsByDestination } from '@/lib/supabaseBlogs';
import BackToTop from '@/components/BackToTop';
import { DestinationBlogGrid } from '@/components/DestinationBlogGrid';

// 1. Generate Static Paths for SEO (SSG)
export async function generateStaticParams() {
    return demoDestinations.map((dest) => ({
        slug: dest.id,
    }));
}

type Props = {
    params: { slug: string };
};

// 2. Dynamic SEO Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const destination = demoDestinations.find((d) => d.id === params.slug);
    if (!destination) return { title: 'Destination Not Found' };

    const pagePath = `/destinations/${params.slug}/`;

    return {
        title: `${destination.name_en} Travel Guide - Best Places & Blogs | CamelThar`,
        description: destination.description_en,
        alternates: {
            canonical: pagePath,
        },
        openGraph: {
            title: `${destination.name_en} Travel Guide – CamelThar`,
            description: destination.description_en,
            url: pagePath,
            siteName: 'CamelThar',
            locale: 'en_IN',
            type: 'website',
            images: [
                {
                    url: destination.coverImage,
                    width: 1200,
                    height: 630,
                    alt: `${destination.name_en} Travel Guide`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${destination.name_en} Travel Guide – CamelThar`,
            description: destination.description_en,
            images: [destination.coverImage],
            site: '@CamelThar',
        },
    };
}

// 3. The Details Page
export default async function DestinationDetailsPage({ params }: Props) {
    const destination = demoDestinations.find((d) => d.id === params.slug);

    if (!destination) {
        notFound();
    }

    // Fetch blogs dynamically for this destination
    const blogs = await fetchBlogsByDestination(params.slug);

    // Tourist Destination structured data for rich search results — Enhanced for SEO + AEO + GEO
    const touristDestinationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TouristDestination',
        name: destination.name_en,
        description: destination.description_en,
        image: destination.coverImage.startsWith('http')
            ? destination.coverImage
            : `https://www.camelthar.com${destination.coverImage}`,
        url: `https://www.camelthar.com/destinations/${params.slug}/`,
        containedInPlace: {
            '@type': 'State',
            name: 'Rajasthan',
            containedInPlace: {
                '@type': 'Country',
                name: 'India',
            },
        },
        touristType: ['Cultural Tourist', 'Heritage Tourist', 'Adventure Tourist'],
        includesAttraction: destination.attractions.map((attr) => ({
            '@type': 'TouristAttraction',
            name: attr,
            isAccessibleForFree: false,
        })),
        publicAccess: true,
        // GEO: Language and content context for AI
        inLanguage: 'en-IN',
        // GEO: Connect to parent website for topical authority
        isPartOf: {
            '@type': 'WebSite',
            name: 'CamelThar',
            url: 'https://www.camelthar.com'
        },
        // AEO: Speakable — tells voice assistants which text to read aloud
        speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', 'meta[name="description"]']
        },
    };

    // Breadcrumb structured data
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://www.camelthar.com/',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Destinations',
                item: 'https://www.camelthar.com/destinations/',
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: destination.name_en,
                item: `https://www.camelthar.com/destinations/${params.slug}/`,
            },
        ],
    };

    return (
        <main className="min-h-screen pt-28">
            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(touristDestinationJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            {/* Top Breadcrumbs */}
            <div className="max-w-7xl mx-auto px-4 mb-6">
                <nav className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap pb-2 md:pb-0 no-scrollbar">
                    <Link href="/" className="hover:text-royal-blue transition-colors flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Home
                    </Link>
                    <span className="text-gray-300">/</span>
                    <Link href="/destinations/" className="hover:text-royal-blue transition-colors">Destinations</Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-royal-blue font-bold capitalize">{destination.name_en}</span>
                </nav>
            </div>

            {/* HERo SECTION */}
            <div className="relative h-[50vh] md:h-[60vh] w-full max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl">
                <Image
                    src={destination.coverImage}
                    alt={destination.name_en}
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white">
                    <div className="max-w-7xl mx-auto">
                        <span className="inline-block px-4 py-1 bg-desert-gold text-white text-[10px] md:text-xs font-bold uppercase rounded-full mb-4 shadow-lg tracking-wider">
                            DESTINATION GUIDE
                        </span>
                        <h1 className="text-4xl md:text-7xl font-bold mb-3 font-outfit drop-shadow-md">{destination.name_en}</h1>
                        <p className="text-lg md:text-2xl opacity-90 font-light max-w-2xl drop-shadow-sm">{destination.tagline_en}</p>

                        {destination.imageCredits && (
                            <div className="absolute bottom-4 right-6 text-[10px] md:text-xs text-white/40 hover:text-white/80 transition-colors z-10">
                                Image Source: <a href={destination.imageCredits.url} target="_blank" rel="nofollow noopener noreferrer" className="underline">{destination.imageCredits.name}</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QUICK INFO */}
            <section className="bg-sand/30 border-b border-sand mt-12 py-10">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sand">
                        <span className="block text-[10px] uppercase text-desert-gold font-bold tracking-widest mb-2">Best Time</span>
                        <span className="font-bold text-royal-blue text-xl">{destination.bestTime}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-sand">
                        <span className="block text-[10px] uppercase text-desert-gold font-bold tracking-widest mb-2">Region</span>
                        <span className="font-bold text-royal-blue text-xl">Rajasthan</span>
                    </div>
                    <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-sand">
                        <span className="block text-[10px] uppercase text-desert-gold font-bold tracking-widest mb-2">Top Attractions</span>
                        <div className="flex flex-wrap gap-2">
                            {destination.attractions.map(attr => (
                                <span key={attr} className="px-3 py-1 bg-sand/50 rounded-full text-xs font-bold text-royal-blue">
                                    {attr}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* BLOGS LISTING (The Silo Content) */}
            <section className="py-20 px-4 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-royal-blue font-outfit">
                            Recent Stories from {destination.name_en}
                        </h2>
                        <p className="text-gray-500 mt-2">Authentic travel experiences shared by our community.</p>
                    </div>
                    <span className="self-start md:self-auto text-sm bg-desert-gold/10 text-desert-gold font-bold px-4 py-2 rounded-full border border-desert-gold/20">
                        {blogs.length} Articles Found
                    </span>
                </div>

                {blogs.length > 0 ? (
                    <DestinationBlogGrid blogs={blogs} />
                ) : (
                    <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-sand/50">
                        <div className="w-20 h-20 bg-sand/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✍️</div>
                        <p className="text-gray-500 text-xl font-medium">No stories written for {destination.name_en} yet.</p>
                        <p className="text-gray-400 mt-2 mb-8">Be the first to share your journey with the world.</p>
                        <Link href="/submit" className="inline-block px-8 py-4 bg-royal-blue text-white font-bold rounded-full hover:bg-deep-maroon shadow-lg transition-all transform hover:-translate-y-1">
                            Share Your Story
                        </Link>
                    </div>
                )}
            </section>

            {/* Bottom Navigation */}
            <div className="max-w-7xl mx-auto px-4 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-12 border-t border-sand">
                    <Link
                        href="/destinations/"
                        className="inline-flex items-center gap-2 text-royal-blue font-bold hover:text-desert-gold transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
                        </svg>
                        Back to All Destinations
                    </Link>

                    <nav className="flex items-center gap-2 text-xs text-gray-400 font-medium italic">
                        <Link href="/" className="hover:text-royal-blue">Home</Link>
                        <span>/</span>
                        <Link href="/destinations/" className="hover:text-royal-blue">Destinations</Link>
                        <span>/</span>
                        <span className="capitalize">{destination.name_en}</span>
                    </nav>
                </div>
            </div>

            {/* Back to Top */}
            <BackToTop />
        </main>
    );
}
