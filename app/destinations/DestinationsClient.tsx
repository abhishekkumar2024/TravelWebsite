'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Destination } from '@/lib/data';


interface DestinationsClientProps {
    destinations: Destination[];
}

export default function DestinationsClient({ destinations }: DestinationsClientProps) {


    return (
        <>
            {/* Page Header */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-royal-blue to-deep-maroon text-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore Rajasthan</h1>

                    <p className="text-lg opacity-90 max-w-2xl mx-auto">
                        Discover the majestic cities of the Land of Kings
                    </p>

                </div>
            </section>

            {/* Destinations Grid */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {destinations.map((dest) => {
                            const name = dest.name_en;
                            const tagline = dest.tagline_en;
                            const description = dest.description_en;


                            return (
                                <Link
                                    href={`/destinations/${dest.id}`}
                                    key={dest.id}
                                    id={dest.id}
                                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group block"
                                >
                                    <div className="relative h-56 overflow-hidden">
                                        <Image
                                            src={dest.coverImage}
                                            alt={name}
                                            fill
                                            className="object-cover"
                                            quality={75}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <h3 className="text-2xl font-bold text-white">{name}</h3>
                                            <p className="text-desert-gold text-sm">{tagline}</p>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-600 text-sm mb-4">{description}</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {dest.attractions.slice(0, 3).map((attraction) => (
                                                <span
                                                    key={attraction}
                                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                                >
                                                    {attraction}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                            <div className="text-sm text-gray-500">
                                                <span className="font-medium">
                                                    Best Time:

                                                </span>{' '}
                                                {dest.bestTime}
                                            </div>
                                            <span
                                                className="text-desert-gold font-semibold text-sm group-hover:underline"
                                            >
                                                {dest.blogCount} blogs →

                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Travel Tips */}
            <section className="py-16 px-4 bg-sand">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">Best Time to Visit</h2>
                    <p className="text-gray-600 mb-8">
                        October to March is the ideal time to explore Rajasthan when the weather is pleasant and perfect for sightseeing.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl">
                            <div className="text-4xl mb-3">🌡️</div>
                            <h3 className="font-bold mb-2">Weather</h3>
                            <p className="text-gray-600 text-sm">15°C - 30°C in winter, comfortable for travel</p>

                        </div>
                        <div className="bg-white p-6 rounded-xl">
                            <div className="text-4xl mb-3">🎪</div>
                            <h3 className="font-bold mb-2">Festivals</h3>
                            <p className="text-gray-600 text-sm">Pushkar Fair, Desert Festival, Holi</p>

                        </div>
                        <div className="bg-white p-6 rounded-xl">
                            <div className="text-4xl mb-3">✈️</div>
                            <h3 className="font-bold mb-2">How to Reach</h3>
                            <p className="text-gray-600 text-sm">Airports in Jaipur, Udaipur, Jodhpur</p>

                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
