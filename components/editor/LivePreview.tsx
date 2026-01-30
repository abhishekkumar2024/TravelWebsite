'use client';

import Image from 'next/image';

interface LivePreviewProps {
    title: string;
    coverImage: string | null;
    content: string;
    category: string;
    authorName: string;
}

export default function LivePreview({
    title,
    coverImage,
    content,
    category,
    authorName,
}: LivePreviewProps) {
    const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-full">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-500">Live Preview</span>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
                {/* Cover Image */}
                <div className="h-48 relative bg-gray-200">
                    {coverImage ? (
                        <Image src={coverImage} alt="Cover" fill className="object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-4 text-white">
                        {category && (
                            <span className="inline-block px-2 py-0.5 bg-desert-gold text-xs font-bold uppercase rounded-full mb-2">
                                {category}
                            </span>
                        )}
                        <h2 className="text-xl font-bold leading-tight">
                            {title || 'Your Blog Title'}
                        </h2>
                        <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                            <span>{today}</span>
                            <span>•</span>
                            <span>5 min read</span>
                        </div>
                    </div>
                </div>

                {/* Author */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                            {authorName ? authorName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <p className="font-medium text-sm text-royal-blue">
                                {authorName || 'Author Name'}
                            </p>
                            <p className="text-xs text-gray-500">Traveler</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {content ? (
                        <div
                            // Match editor sizing: larger, more readable preview text.
                            className="prose prose-lg md:prose-xl max-w-none"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    ) : (
                        <p className="text-gray-400 text-sm italic">
                            Start writing to see the preview...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
