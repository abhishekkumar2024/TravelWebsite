import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAuthorBySlug } from '@/lib/db/queries';
import { fetchBlogsByAuthorSlug } from '@/lib/db/queries';
import { Metadata } from 'next';
import { Author } from '@/lib/db/queries';

export const revalidate = 60; // ISR every 60 seconds

interface PageProps {
    params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const author = await getAuthorBySlug(params.slug);
    if (!author) return {};

    return {
        title: `${author.name} - Author Profile | CamelThar`,
        description: author.bio || `Read travel stories by ${author.name} on CamelThar.`,
        alternates: {
            canonical: `/author/${params.slug}/`,
        },
        openGraph: {
            images: author.avatar_url ? [author.avatar_url] : [],
        }
    };
}

export default async function AuthorProfilePage({ params }: PageProps) {
    const author = await getAuthorBySlug(params.slug);
    if (!author) return notFound();

    const blogs = await fetchBlogsByAuthorSlug(params.slug);

    // Person schema — E-E-A-T signals for Google
    const personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
            '@type': 'Person',
            name: author.name,
            description: author.bio || `Travel storyteller on CamelThar.`,
            url: `https://www.camelthar.com/author/${params.slug}/`,
            ...(author.avatar_url ? { image: author.avatar_url } : {}),
            ...(author.website ? { sameAs: [author.website, author.twitter, author.instagram, author.linkedin, author.youtube].filter(Boolean) } : {}),
        },
    };

    // BreadcrumbList schema
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
                name: author.name,
                item: `https://www.camelthar.com/author/${params.slug}/`,
            },
        ],
    };

    const socialLinks = [
        {
            url: author.website, label: 'Website', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            )
        },
        {
            url: author.twitter, label: 'Twitter', icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            )
        },
        {
            url: author.instagram, label: 'Instagram', icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.468 2.53c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
            )
        },
        {
            url: author.linkedin, label: 'LinkedIn', icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
            )
        },
        {
            url: author.youtube, label: 'YouTube', icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
            )
        },
    ].filter(s => s.url);

    const initials = author.name ? author.name.charAt(0).toUpperCase() : 'A';

    return (
        <div className="min-h-screen bg-gray-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            {/* Hero Banner */}
            <div className="relative pt-20">
                {/* Gradient background */}
                <div className="h-48 sm:h-56 bg-gradient-to-br from-[#1a365d] via-[#2a4a7f] to-[#1e3a5f] relative overflow-hidden">
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 left-8 w-32 h-32 border border-white/30 rounded-full" />
                        <div className="absolute top-12 right-16 w-20 h-20 border border-white/20 rounded-full" />
                        <div className="absolute bottom-0 left-1/3 w-48 h-48 border border-white/10 rounded-full -translate-y-1/2" />
                    </div>
                    {/* Subtle desert wave at the bottom */}
                    <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" style={{ height: '30px' }}>
                        <path d="M0 60L48 55C96 50 192 40 288 35S480 25 576 27.5S768 35 864 37.5S1056 35 1152 32.5S1344 25 1392 22.5L1440 20V60H0Z" fill="#f9fafb" />
                    </svg>
                </div>

                {/* Profile Card - overlaps banner */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 relative z-10">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Avatar */}
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl flex-shrink-0 ring-4 ring-blue-50">
                                {author.avatar_url ? (
                                    <Image
                                        src={author.avatar_url}
                                        alt={author.name}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-4xl font-bold text-royal-blue">
                                        {initials}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center sm:text-left">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                                    {author.name}
                                </h1>
                                <p className="text-sm text-gray-400 mb-3">@{params.slug}</p>

                                {author.bio && (
                                    <p className="text-gray-600 leading-relaxed mb-4 max-w-2xl">
                                        {author.bio}
                                    </p>
                                )}

                                {/* Social Links as icon buttons */}
                                {socialLinks.length > 0 && (
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                        {socialLinks.map((link) => (
                                            <a
                                                key={link.label}
                                                href={link.url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={link.label}
                                                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 flex items-center justify-center text-gray-400 hover:text-royal-blue transition-all duration-200 hover:scale-105"
                                            >
                                                {link.icon}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex sm:flex-col items-center gap-6 sm:gap-4 sm:border-l sm:pl-8 sm:ml-4 border-gray-100">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{blogs.length}</div>
                                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Posts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {blogs.reduce((sum, b) => sum + (b.views || 0), 0).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Views</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Blog Grid */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Latest Posts
                    </h2>
                    <span className="text-sm text-gray-400 font-medium">
                        {blogs.length} {blogs.length === 1 ? 'article' : 'articles'}
                    </span>
                </div>

                {blogs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <p className="text-gray-400 text-lg">No posts published yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {blogs.map((blog) => (
                            <Link
                                key={blog.id}
                                href={`/blogs/${blog.slug || blog.id}/`}
                                className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-100"
                            >
                                <div className="relative h-48 w-full overflow-hidden">
                                    <Image
                                        src={blog.coverImage || '/images/jaipur-hawa-mahal.webp'}
                                        alt={blog.title_en}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-desert-gold mb-2">
                                        <span>{blog.destination}</span>
                                        <span className="text-gray-300">•</span>
                                        <span>{blog.category}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-royal-blue transition-colors line-clamp-2">
                                        {blog.title_en}
                                    </h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                                        {blog.excerpt_en}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span className="font-medium">{blog.readTime}</span>
                                        <span>
                                            {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            }) : ''}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
