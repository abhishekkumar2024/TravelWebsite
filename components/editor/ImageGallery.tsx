'use client';

import Image from 'next/image';

interface ImageGalleryProps {
    images: string[];
    onRemove: (index: number) => void;
    onInsert: (url: string) => void;
}

export default function ImageGallery({ images, onRemove, onInsert }: ImageGalleryProps) {
    if (images.length === 0) {
        return null;
    }

    return (
        <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Uploaded Images ({images.length})
            </label>
            <div className="flex flex-wrap gap-3">
                {images.map((url, index) => (
                    <div
                        key={index}
                        className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200"
                    >
                        <Image
                            src={url}
                            alt={`Blog image ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button
                                type="button"
                                onClick={() => onInsert(url)}
                                className="p-1 bg-white rounded text-gray-700 hover:bg-gray-100"
                                title="Insert into blog"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="p-1 bg-red-500 rounded text-white hover:bg-red-600"
                                title="Remove"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
