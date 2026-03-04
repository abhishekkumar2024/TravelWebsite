'use client';

/**
 * CreatePlanForm — Modal/form for posting a new TharMate travel plan
 */

import { useState } from 'react';
import { useSession } from 'next-auth/react';

const DESTINATIONS = [
    { id: 'jaisalmer', name: 'Jaisalmer', emoji: '🏯' },
    { id: 'jaipur', name: 'Jaipur', emoji: '🎨' },
    { id: 'udaipur', name: 'Udaipur', emoji: '🌊' },
    { id: 'jodhpur', name: 'Jodhpur', emoji: '🔵' },
    { id: 'pushkar', name: 'Pushkar', emoji: '🌸' },
    { id: 'mount-abu', name: 'Mount Abu', emoji: '⛰️' },
    { id: 'bikaner', name: 'Bikaner', emoji: '🌅' },
];

const VIBES = [
    { id: 'photography', label: 'Photography', emoji: '📸' },
    { id: 'adventure', label: 'Adventure', emoji: '🧗' },
    { id: 'food', label: 'Food', emoji: '🍛' },
    { id: 'culture', label: 'Culture', emoji: '🎭' },
    { id: 'sunset', label: 'Sunset', emoji: '🌅' },
    { id: 'history', label: 'History', emoji: '🏛️' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
    { id: 'spiritual', label: 'Spiritual', emoji: '🕉️' },
    { id: 'nature', label: 'Nature', emoji: '🌿' },
    { id: 'heritage', label: 'Heritage', emoji: '🏰' },
    { id: 'desert', label: 'Desert', emoji: '🐪' },
];

interface CreatePlanFormProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreatePlanForm({ open, onClose, onCreated }: CreatePlanFormProps) {
    const { data: session } = useSession();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [destination, setDestination] = useState('');
    const [meetingPoint, setMeetingPoint] = useState('');
    const [planDate, setPlanDate] = useState('');
    const [planTime, setPlanTime] = useState('');
    const [maxCompanions, setMaxCompanions] = useState(3);
    const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

    function toggleVibe(vibeId: string) {
        setSelectedVibes(prev =>
            prev.includes(vibeId)
                ? prev.filter(v => v !== vibeId)
                : prev.length < 3 ? [...prev, vibeId] : prev
        );
    }

    function resetForm() {
        setTitle('');
        setDescription('');
        setDestination('');
        setMeetingPoint('');
        setPlanDate('');
        setPlanTime('');
        setMaxCompanions(3);
        setSelectedVibes([]);
        setError('');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!session?.user?.id) return;

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/tharmate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    destination,
                    meetingPoint: meetingPoint || undefined,
                    planDate,
                    planTime: planTime || undefined,
                    maxCompanions,
                    vibe: selectedVibes,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to create plan');
            } else {
                resetForm();
                onCreated();
                onClose();
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    // Today's date in YYYY-MM-DD for min attribute
    const today = new Date().toISOString().split('T')[0];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-terracotta to-deep-maroon p-6 rounded-t-2xl z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-xs font-mono tracking-widest uppercase">🐪 CamelThar</p>
                            <h2 className="text-white text-xl font-bold mt-1">Post Your Plan</h2>
                            <p className="text-white/80 text-sm mt-1">Find a travel companion</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            What&apos;s the plan? *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Exploring Jaisalmer Fort & Chai"
                            required
                            maxLength={100}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Tell fellow travelers about it *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="I'm going slow, lots of photos, chai breaks. Looking for 1-2 people who vibe with cultural exploration..."
                            required
                            rows={3}
                            maxLength={500}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
                    </div>

                    {/* Destination */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Destination *
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {DESTINATIONS.map((dest) => (
                                <button
                                    type="button"
                                    key={dest.id}
                                    onClick={() => setDestination(dest.id)}
                                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${destination === dest.id
                                            ? 'bg-terracotta/10 border-terracotta text-terracotta shadow-sm'
                                            : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="text-lg">{dest.emoji}</span>
                                    <span>{dest.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={planDate}
                                onChange={(e) => setPlanDate(e.target.value)}
                                min={today}
                                required
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Time
                                <span className="font-normal text-gray-400 ml-1">(optional)</span>
                            </label>
                            <input
                                type="time"
                                value={planTime}
                                onChange={(e) => setPlanTime(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                            />
                        </div>
                    </div>

                    {/* Meeting Point */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Meeting Point
                            <span className="font-normal text-gray-400 ml-1">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={meetingPoint}
                            onChange={(e) => setMeetingPoint(e.target.value)}
                            placeholder="e.g. Jaisalmer Fort Main Gate"
                            maxLength={150}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                        />
                    </div>

                    {/* Max Companions */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Max Companions
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    type="button"
                                    key={n}
                                    onClick={() => setMaxCompanions(n)}
                                    className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${maxCompanions === n
                                            ? 'bg-terracotta text-white border-terracotta shadow-sm'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vibes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Vibe
                            <span className="font-normal text-gray-400 ml-1">(pick up to 3)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {VIBES.map(vibe => (
                                <button
                                    type="button"
                                    key={vibe.id}
                                    onClick={() => toggleVibe(vibe.id)}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedVibes.includes(vibe.id)
                                            ? 'bg-desert-gold/15 border-desert-gold text-desert-gold'
                                            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {vibe.emoji} {vibe.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting || !title || !description || !destination || !planDate}
                        className="w-full py-3 bg-gradient-to-r from-terracotta to-deep-maroon text-white font-bold rounded-xl text-sm tracking-wide uppercase transition-all hover:shadow-lg hover:shadow-terracotta/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Posting...
                            </span>
                        ) : (
                            '🐪 Post Your Plan'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
