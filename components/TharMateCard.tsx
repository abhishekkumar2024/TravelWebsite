'use client';

/**
 * TharMateCard — A travel companion listing card
 * 
 * Displays plan details, author info, vibe tags, and a join button.
 * Follows the phone mockup design from the vision document.
 */

import { useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import type { TharMatePlan } from '@/lib/db/queries/tharmate';

// Destination emoji map
const DESTINATION_EMOJI: Record<string, string> = {
    jaisalmer: '🏯',
    jaipur: '🎨',
    udaipur: '🌊',
    jodhpur: '🔵',
    pushkar: '🌸',
    'mount-abu': '⛰️',
    bikaner: '🌅',
};

// Vibe emoji map
const VIBE_EMOJI: Record<string, string> = {
    photography: '📸',
    adventure: '🧗',
    food: '🍛',
    culture: '🎭',
    sunset: '🌅',
    history: '🏛️',
    shopping: '🛍️',
    spiritual: '🕉️',
    nightlife: '🌙',
    nature: '🌿',
    heritage: '🏰',
    desert: '🐪',
};

interface TharMateCardProps {
    plan: TharMatePlan;
    onJoinRequest?: (planId: string) => void;
}

export default function TharMateCard({ plan, onJoinRequest }: TharMateCardProps) {
    const { data: session } = useSession();
    const [joining, setJoining] = useState(false);
    const [joinSent, setJoinSent] = useState(false);
    const [error, setError] = useState('');

    const isOwner = session?.user?.id === plan.userId;
    const isFull = plan.companionCount >= plan.maxCompanions;
    const spotsLeft = plan.maxCompanions - plan.companionCount;

    // Format date
    const planDate = new Date(plan.planDate);
    const isToday = planDate.toDateString() === new Date().toDateString();
    const isTomorrow = (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return planDate.toDateString() === tomorrow.toDateString();
    })();

    const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : planDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

    const timeLabel = plan.planTime
        ? new Date(`2000-01-01T${plan.planTime}`).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        : null;

    const destEmoji = DESTINATION_EMOJI[plan.destination] || '📍';
    const destName = plan.destination.charAt(0).toUpperCase() + plan.destination.slice(1).replace('-', ' ');

    async function handleJoin() {
        if (!session?.user?.id) {
            setError('Please login to join');
            return;
        }
        setJoining(true);
        setError('');

        try {
            const res = await fetch('/api/tharmate/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to send request');
            } else {
                setJoinSent(true);
                onJoinRequest?.(plan.id);
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setJoining(false);
        }
    }

    return (
        <div className={`relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${plan.isSpark ? 'border-amber-300 shadow-lg shadow-amber-100' : 'border-gray-100 shadow-sm'
            }`}>
            {/* Spark Badge */}
            {plan.isSpark && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700 tracking-wider uppercase">
                        ⚡ Spark — Leaving soon
                    </span>
                </div>
            )}

            <div className="p-5">
                {/* Author Row */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-terracotta to-deep-maroon flex-shrink-0 flex items-center justify-center">
                        {plan.authorImage ? (
                            <Image
                                src={plan.authorImage}
                                alt={plan.authorName || 'Traveler'}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <span className="text-white text-sm font-bold">
                                {(plan.authorName || '?')[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                            {plan.authorName || 'Anonymous Traveler'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono tracking-wide">
                            {plan.companionCount > 0
                                ? `${plan.companionCount} companion${plan.companionCount > 1 ? 's' : ''} joined`
                                : 'No companions yet'}
                        </p>
                    </div>
                </div>

                {/* Plan Title & Description */}
                <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-royal-blue transition-colors">
                    {plan.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
                    {plan.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {/* Destination tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-terracotta/10 text-terracotta text-xs font-mono rounded-md tracking-wide">
                        {destEmoji} {destName}
                    </span>

                    {/* Time tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-md tracking-wide">
                        ⏰ {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
                    </span>

                    {/* Vibe tags */}
                    {plan.vibe.slice(0, 2).map((v) => (
                        <span
                            key={v}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-desert-gold/10 text-desert-gold text-xs font-mono rounded-md tracking-wide"
                        >
                            {VIBE_EMOJI[v] || '✨'} {v}
                        </span>
                    ))}
                </div>

                {/* Meeting Point */}
                {plan.meetingPoint && (
                    <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {plan.meetingPoint}
                    </p>
                )}

                {/* Spots Left Indicator */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: plan.maxCompanions }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i < plan.companionCount
                                        ? 'bg-green-100 text-green-600 border border-green-200'
                                        : 'bg-gray-50 text-gray-300 border border-dashed border-gray-200'
                                    }`}
                            >
                                {i < plan.companionCount ? '✓' : '+'}
                            </div>
                        ))}
                    </div>
                    <span className={`text-xs font-mono font-semibold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                        {isFull ? 'FULL' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                    </span>
                </div>

                {/* Action Button */}
                {error && (
                    <p className="text-xs text-red-500 mb-2">{error}</p>
                )}

                {isOwner ? (
                    <div className="text-center py-2 text-xs text-gray-400 font-mono tracking-wider uppercase">
                        Your Plan
                        {plan.requestCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 bg-terracotta text-white rounded-full text-[10px] font-bold">
                                {plan.requestCount} pending
                            </span>
                        )}
                    </div>
                ) : joinSent ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Request Sent!
                    </div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining || isFull || !session}
                        className={`w-full py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase transition-all duration-200 ${isFull
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : !session
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-terracotta to-deep-maroon text-white hover:shadow-lg hover:shadow-terracotta/25 active:scale-[0.98]'
                            }`}
                    >
                        {joining ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Sending...
                            </span>
                        ) : isFull ? (
                            'Plan Full'
                        ) : !session ? (
                            'Login to Join'
                        ) : (
                            'Request to Join →'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
