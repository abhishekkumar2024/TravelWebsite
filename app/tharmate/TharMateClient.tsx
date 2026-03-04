'use client';

/**
 * TharMateClient — Client-side interactivity for TharMate listing
 * 
 * Handles:
 * - Destination filter tabs
 * - Live plan feed with refresh
 * - Create plan modal
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import TharMateCard from '@/components/TharMateCard';
import CreatePlanForm from '@/components/CreatePlanForm';
import type { TharMatePlan } from '@/lib/db/queries/tharmate';

const DESTINATIONS = [
    { id: '', name: 'All Cities', emoji: '🌍' },
    { id: 'jaisalmer', name: 'Jaisalmer', emoji: '🏯' },
    { id: 'jaipur', name: 'Jaipur', emoji: '🎨' },
    { id: 'udaipur', name: 'Udaipur', emoji: '🌊' },
    { id: 'jodhpur', name: 'Jodhpur', emoji: '🔵' },
    { id: 'pushkar', name: 'Pushkar', emoji: '🌸' },
    { id: 'mount-abu', name: 'Mount Abu', emoji: '⛰️' },
    { id: 'bikaner', name: 'Bikaner', emoji: '🌅' },
];

export default function TharMateClient() {
    const { data: session } = useSession();
    const [plans, setPlans] = useState<TharMatePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeFilter) params.set('destination', activeFilter);
            params.set('limit', '20');

            const res = await fetch(`/api/tharmate?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setPlans(data.plans || []);
        } catch (err) {
            console.error('Error loading plans:', err);
            setPlans([]);
        } finally {
            setLoading(false);
        }
    }, [activeFilter]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchPlans, 30000);
        return () => clearInterval(interval);
    }, [fetchPlans]);

    const sparkPlans = plans.filter(p => p.isSpark);
    const regularPlans = plans.filter(p => !p.isSpark);

    return (
        <>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1208] via-[#2C1F0E] to-[#1A1208] text-white">
                {/* Stars background */}
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage: `
                            radial-gradient(1px 1px at 10% 15%, rgba(240,180,41,0.8) 0%, transparent 100%),
                            radial-gradient(1.5px 1.5px at 40% 20%, rgba(240,180,41,0.9) 0%, transparent 100%),
                            radial-gradient(1px 1px at 70% 12%, rgba(255,255,255,0.6) 0%, transparent 100%),
                            radial-gradient(1px 1px at 85% 8%, rgba(240,180,41,0.7) 0%, transparent 100%),
                            radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.4) 0%, transparent 100%),
                            radial-gradient(1.5px 1.5px at 60% 25%, rgba(240,180,41,0.5) 0%, transparent 100%)
                        `,
                    }}
                />
                {/* Sand gradient at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-terracotta/20 via-transparent to-transparent" />

                <div className="relative max-w-5xl mx-auto px-4 pt-32 pb-16 text-center">
                    <p className="text-xs font-mono tracking-[4px] text-desert-gold uppercase mb-4 animate-fade-in">
                        🤝 CamelThar · Travel Together
                    </p>
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
                        <span className="block">Find a</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-desert-gold to-terracotta italic font-serif">
                            TharMate
                        </span>
                    </h1>
                    <p className="text-lg text-[#C4A96A] font-light max-w-md mx-auto leading-relaxed mb-8">
                        Solo traveler? Post your plan. Others going the same place join you. No group tours. Just real connections.
                    </p>

                    {session?.user ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-terracotta to-deep-maroon text-white font-bold rounded-xl text-sm tracking-wider uppercase shadow-lg shadow-terracotta/30 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Post Your Plan
                        </button>
                    ) : (
                        <p className="text-sm text-[#8B7355]">
                            Login to post your travel plan
                        </p>
                    )}
                </div>
            </section>

            {/* Filter & Content */}
            <section className="max-w-6xl mx-auto px-4 py-10">
                {/* Destination Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide -mx-4 px-4">
                    {DESTINATIONS.map((dest) => (
                        <button
                            key={dest.id}
                            onClick={() => setActiveFilter(dest.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === dest.id
                                    ? 'bg-terracotta text-white shadow-md shadow-terracotta/20'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <span>{dest.emoji}</span>
                            {dest.name}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 p-5 h-72">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                                    <div className="flex-1">
                                        <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                                        <div className="h-2 w-16 bg-gray-100 rounded" />
                                    </div>
                                </div>
                                <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
                                <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                                <div className="h-3 w-2/3 bg-gray-100 rounded mb-4" />
                                <div className="flex gap-2">
                                    <div className="h-6 w-20 bg-gray-100 rounded" />
                                    <div className="h-6 w-24 bg-gray-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content */}
                {!loading && (
                    <>
                        {/* Spark Plans (Leaving Soon) */}
                        {sparkPlans.length > 0 && (
                            <div className="mb-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                    </span>
                                    <h2 className="text-sm font-mono font-bold text-amber-700 tracking-wider uppercase">
                                        ⚡ Sparks — Leaving Soon
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {sparkPlans.map(plan => (
                                        <TharMateCard key={plan.id} plan={plan} onJoinRequest={fetchPlans} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regular Plans */}
                        {regularPlans.length > 0 ? (
                            <div>
                                <h2 className="text-sm font-mono font-bold text-gray-500 tracking-wider uppercase mb-4">
                                    {activeFilter
                                        ? `Plans in ${DESTINATIONS.find(d => d.id === activeFilter)?.name || activeFilter}`
                                        : 'All Upcoming Plans'
                                    }
                                    <span className="ml-2 text-gray-400 font-normal">
                                        ({regularPlans.length})
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {regularPlans.map(plan => (
                                        <TharMateCard key={plan.id} plan={plan} onJoinRequest={fetchPlans} />
                                    ))}
                                </div>
                            </div>
                        ) : sparkPlans.length === 0 ? (
                            /* Empty State */
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🐪</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    No plans yet for {activeFilter ? DESTINATIONS.find(d => d.id === activeFilter)?.name : 'any city'}
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                    Be the first to post a travel plan and find your TharMate!
                                    Share where you&apos;re going and who you&apos;d love to explore with.
                                </p>
                                {session?.user && (
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-terracotta to-deep-maroon text-white font-bold rounded-xl text-sm tracking-wide uppercase shadow-md hover:shadow-lg transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Post the First Plan
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </>
                )}
            </section>

            {/* How It Works */}
            <section className="bg-gray-50 py-16">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-center text-2xl font-bold text-gray-800 mb-10">
                        How TharMate Works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📝</span>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Post Your Plan</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Share where you&apos;re going, when, and what vibe you&apos;re looking for. Fort tour? Desert sunset? Chai exploration?
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-desert-gold/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🤝</span>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Find Your Match</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Browse plans or get join requests. See traveler profiles and vibes before connecting.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-royal-blue/10 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🌅</span>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">Explore Together</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Meet up and create memories. Two strangers becoming travel stories — that&apos;s the TharMate magic.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Create Plan Modal */}
            <CreatePlanForm
                open={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                onCreated={fetchPlans}
            />
        </>
    );
}
