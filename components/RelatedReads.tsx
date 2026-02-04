'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

// Simplified interface that matches what we fetch
interface RelatedBlog {
    slug: string;
    title_en: string;
    title_hi: string;
    cover_image?: string;
}

interface RelatedReadsProps {
    blogs: RelatedBlog[];
}

export default function RelatedReads({ blogs }: RelatedReadsProps) {
    const { lang, t, mounted } = useLanguage();

    // Don't render if no blogs found
    if (!blogs || blogs.length === 0) {
        return null;
    }

    return (
        <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-royal-blue mb-6 flex items-center gap-2">
                <svg
                    className="w-6 h-6 text-desert-gold"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                </svg>
                {t('You Can Also Read', 'आप ये भी पढ़ सकते हैं')}
            </h3>

            <div className="space-y-3">
                {blogs.map((blog) => {
                    const title = mounted && lang === 'hi' ? blog.title_hi : blog.title_en;

                    return (
                        <Link
                            key={blog.slug}
                            href={`/blog/${blog.slug}`}
                            className="group block"
                        >
                            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-desert-gold hover:shadow-md transition-all duration-300">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-desert-gold to-[#B8922F] rounded-lg flex items-center justify-center text-white">
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-semibold text-gray-800 group-hover:text-desert-gold transition-colors line-clamp-2">
                                        {title}
                                    </h4>
                                </div>
                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg
                                        className="w-5 h-5 text-desert-gold"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
