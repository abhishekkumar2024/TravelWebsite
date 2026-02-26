'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from './LanguageProvider';
import type { Destination } from '@/lib/data';

interface DestinationCardProps {
    destination: Destination;
}

export default function DestinationCard({ destination }: DestinationCardProps) {
    const { lang, t, mounted } = useLanguage();

    // Use English for SSR, then switch to lang-based on client
    const name = mounted && lang === 'hi' ? destination.name_hi : destination.name_en;
    const tagline = mounted && lang === 'hi' ? destination.tagline_hi : destination.tagline_en;

    return (
        <Link
            href={`/destinations/${destination.id}/`}
            className="group relative rounded-2xl overflow-hidden h-80 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
        >
            <Image
                src={destination.coverImage}
                alt={name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-2xl font-bold text-white mb-1">{name}</h3>
                <p className="text-desert-gold text-sm mb-3">{tagline}</p>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                    </svg>
                    <span>
                        {destination.blogCount} {t('blogs', 'ब्लॉग')}
                    </span>
                </div>
            </div>
        </Link>
    );
}
