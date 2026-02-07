
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { demoDestinations } from '@/lib/data';
import { fetchBlogsByDestination } from '@/lib/supabaseBlogs';
import BlogCard from '@/components/BlogCard';

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

    return (
        <main className="min-h-screen">
            {/* HERo SECTION */}
            <div className="relative h-[60vh] w-full">
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
                        <span className="inline-block px-3 py-1 bg-desert-gold text-xs font-bold uppercase rounded-full mb-3 tracking-wider">
                            DESTINATION GUIDE
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold mb-2">{destination.name_en}</h1>
                        <p className="text-xl opacity-90 font-light max-w-2xl">{destination.tagline_en}</p>
                    </div>
                </div>
            </div>

            {/* QUICK INFO */}
            <section className="bg-sand/30 border-b border-sand">
                <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <span className="block text-xs uppercase text-gray-500 font-bold tracking-wider mb-1">Best Time</span>
                        <span className="font-semibold text-royal-blue text-lg">{destination.bestTime}</span>
                    </div>
                    <div>
                        <span className="block text-xs uppercase text-gray-500 font-bold tracking-wider mb-1">Known For</span>
                        <span className="font-semibold text-royal-blue text-lg">Culture & Heritage</span>
                    </div>
                    <div className="col-span-2">
                        <span className="block text-xs uppercase text-gray-500 font-bold tracking-wider mb-1">Top Attractions</span>
                        <div className="flex flex-wrap gap-2">
                            {destination.attractions.map(attr => (
                                <span key={attr} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-600">
                                    {attr}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* BLOGS LISTING (The Silo Content) */}
            <section className="py-16 px-4 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">
                        Stories from {destination.name_en}
                    </h2>
                    <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                        {blogs.length} Articles
                    </span>
                </div>

                {blogs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogs.map(blog => (
                            <BlogCard key={blog.id} blog={blog} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">No stories written for {destination.name_en} yet.</p>
                        <Link href="/submit" className="mt-4 inline-block text-desert-gold font-bold hover:underline">
                            Be the first to write one →
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
