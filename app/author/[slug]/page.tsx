import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAuthorBySlug } from '@/lib/supabaseAuthors';
import { fetchBlogsByAuthorSlug } from '@/lib/supabaseBlogs';
import { Metadata } from 'next';
import { Author } from '@/lib/supabaseAuthors';

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
        openGraph: {
            images: author.avatar_url ? [author.avatar_url] : [],
        }
    };
}

export default async function AuthorProfilePage({ params }: PageProps) {
    const author = await getAuthorBySlug(params.slug);
    if (!author) return notFound();

    const blogs = await fetchBlogsByAuthorSlug(params.slug);

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-12 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                            {author.avatar_url ? (
                                <Image
                                    src={author.avatar_url}
                                    alt={author.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-royal-blue">
                                    {author.name.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{author.name}</h1>
                            {author.bio && (
                                <p className="text-gray-600 text-lg mb-4 max-w-2xl">
                                    {author.bio}
                                </p>
                            )}

                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                {author.website && (
                                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-royal-blue hover:underline">
                                        Website
                                    </a>
                                )}
                                {author.twitter && (
                                    <a href={author.twitter} target="_blank" rel="noopener noreferrer" className="text-royal-blue hover:underline">
                                        Twitter
                                    </a>
                                )}
                                {author.instagram && (
                                    <a href={author.instagram} target="_blank" rel="noopener noreferrer" className="text-royal-blue hover:underline">
                                        Instagram
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Blog Grid */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-gray-900 border-b pb-4">
                        Latests Posts by {author.name}
                    </h2>

                    {blogs.length === 0 ? (
                        <p className="text-gray-500 italic">No posts published yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {blogs.map((blog) => (
                                <Link
                                    key={blog.id}
                                    href={`/blog/${blog.slug || blog.id}`}
                                    className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100"
                                >
                                    <div className="relative h-48 w-full">
                                        <Image
                                            src={blog.coverImage || '/images/jaipur-hawa-mahal.webp'}
                                            alt={blog.title_en}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-desert-gold mb-2">
                                            <span>{blog.destination}</span>
                                            <span>•</span>
                                            <span>{blog.category}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-royal-blue transition-colors">
                                            {blog.title_en}
                                        </h3>
                                        <p className="text-gray-600 text-sm line-clamp-2">
                                            {blog.excerpt_en}
                                        </p>
                                        <div className="mt-4 text-xs text-gray-400 font-medium">
                                            Read in {blog.readTime}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
