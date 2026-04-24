'use client';

/**
 * CreatePlanForm — Premium Desert Plan Creator
 * 
 * Features:
 *   - Dynamic destination search (autocomplete from anchor points)
 *   - Vibe selection (up to 5)
 *   - Budget range selector
 *   - Language preference
 *   - Travel style
 *   - Properly encoded emoji characters
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { ANCHOR_POINTS, getCityAnchors, type AnchorPoint } from '@/lib/tharmate/anchor-points';

// ─── Vibe options (properly encoded) ────────────────────────────

const VIBES = [
    { id: 'photography', label: 'Photography', emoji: '\u{1F4F8}' },
    { id: 'adventure', label: 'Adventure', emoji: '\u{1F9D7}' },
    { id: 'food', label: 'Food', emoji: '\u{1F35B}' },
    { id: 'culture', label: 'Culture', emoji: '\u{1F3AD}' },
    { id: 'sunset', label: 'Sunset', emoji: '\u{1F305}' },
    { id: 'history', label: 'History', emoji: '\u{1F3DB}' },
    { id: 'shopping', label: 'Shopping', emoji: '\u{1F6CD}' },
    { id: 'spiritual', label: 'Spiritual', emoji: '\u{1F549}' },
    { id: 'nature', label: 'Nature', emoji: '\u{1F33F}' },
    { id: 'heritage', label: 'Heritage', emoji: '\u{1F3F0}' },
    { id: 'desert', label: 'Desert', emoji: '\u{1F3DC}' },
    { id: 'nightlife', label: 'Nightlife', emoji: '\u{1F303}' },
    { id: 'wellness', label: 'Wellness', emoji: '\u{1F9D8}' },
    { id: 'camping', label: 'Camping', emoji: '\u{26FA}' },
    { id: 'wildlife', label: 'Wildlife', emoji: '\u{1F418}' },
];

const BUDGET_OPTIONS = [
    { id: 'budget', label: 'Budget', desc: 'Under \u20B9500/day', emoji: '\u{1F4B0}' },
    { id: 'mid', label: 'Mid-range', desc: '\u20B9500-2000/day', emoji: '\u{1F4B3}' },
    { id: 'premium', label: 'Premium', desc: '\u20B92000+/day', emoji: '\u{1F48E}' },
    { id: 'flexible', label: 'Flexible', desc: 'No preference', emoji: '\u{1F91D}' },
];

const TRAVEL_STYLES = [
    { id: 'solo', label: 'Solo-friendly', emoji: '\u{1F9CD}' },
    { id: 'couple', label: 'Couple-friendly', emoji: '\u{1F491}' },
    { id: 'group', label: 'Group trip', emoji: '\u{1F46B}' },
    { id: 'family', label: 'Family', emoji: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}' },
];

const LANGUAGES = [
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'both', label: 'Both' },
    { id: 'any', label: 'Any' },
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

    // Core fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [destination, setDestination] = useState('');
    const [destinationLabel, setDestinationLabel] = useState('');
    const [meetingPoint, setMeetingPoint] = useState('');
    const [planDate, setPlanDate] = useState('');
    const [planTime, setPlanTime] = useState('');
    const [maxCompanions, setMaxCompanions] = useState(3);
    const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

    // New fields
    const [budget, setBudget] = useState('flexible');
    const [travelStyle, setTravelStyle] = useState('group');
    const [language, setLanguage] = useState('any');
    const [lookingFor, setLookingFor] = useState('');

    // Destination search
    const [destSearch, setDestSearch] = useState('');
    const [destDropdownOpen, setDestDropdownOpen] = useState(false);
    const destInputRef = useRef<HTMLInputElement>(null);
    const destDropdownRef = useRef<HTMLDivElement>(null);

    // ─── Destination search results ─────────────────────────────
    const destResults = useMemo(() => {
        if (!destSearch.trim()) {
            // Show city-level anchors when no search query
            return getCityAnchors();
        }
        const q = destSearch.toLowerCase().trim();
        return ANCHOR_POINTS.filter(a =>
            a.label.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [destSearch]);

    // ─── Close dropdown on outside click ────────────────────────
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (destDropdownRef.current && !destDropdownRef.current.contains(e.target as Node) &&
                destInputRef.current && !destInputRef.current.contains(e.target as Node)) {
                setDestDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function selectDestination(anchor: AnchorPoint) {
        setDestination(anchor.city);
        setDestinationLabel(`${anchor.emoji} ${anchor.label}`);
        setDestSearch('');
        setDestDropdownOpen(false);
    }

    function toggleVibe(vibeId: string) {
        setSelectedVibes(prev =>
            prev.includes(vibeId)
                ? prev.filter(v => v !== vibeId)
                : prev.length < 5 ? [...prev, vibeId] : prev
        );
    }

    function resetForm() {
        setTitle('');
        setDescription('');
        setDestination('');
        setDestinationLabel('');
        setDestSearch('');
        setMeetingPoint('');
        setPlanDate('');
        setPlanTime('');
        setMaxCompanions(3);
        setSelectedVibes([]);
        setBudget('flexible');
        setTravelStyle('group');
        setLanguage('any');
        setLookingFor('');
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
                    budget,
                    travelStyle,
                    language,
                    lookingFor: lookingFor || undefined,
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

    const today = new Date().toISOString().split('T')[0];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" style={{ scrollbarWidth: 'thin' }}>
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-[#C84B1E] to-[#E85D1B] p-6 rounded-t-2xl z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-[10px] font-mono tracking-[3px] uppercase">{'\u{1F42A}'} CamelThar</p>
                            <h2 className="text-white text-xl font-bold mt-1">Post Your Plan</h2>
                            <p className="text-white/80 text-sm mt-1">Find your TharMate</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors text-lg"
                        >
                            {'\u2715'}
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            What&apos;s the plan? <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Exploring Jaisalmer Fort & Chai"
                            required
                            maxLength={100}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            Tell fellow travelers about it <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="I'm going slow, lots of photos, chai breaks..."
                            required
                            rows={3}
                            maxLength={500}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
                    </div>

                    {/* Destination — Dynamic Search */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            Destination <span className="text-red-400">*</span>
                        </label>

                        {/* Selected destination chip */}
                        {destination ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                                <span className="text-sm font-semibold text-gray-800 flex-1">{destinationLabel}</span>
                                <button
                                    type="button"
                                    onClick={() => { setDestination(''); setDestinationLabel(''); setDestDropdownOpen(true); }}
                                    className="text-xs text-orange-500 font-semibold hover:text-orange-700"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-orange-300 focus-within:border-orange-400 transition-all">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <input
                                        ref={destInputRef}
                                        type="text"
                                        value={destSearch}
                                        onChange={e => { setDestSearch(e.target.value); setDestDropdownOpen(true); }}
                                        onFocus={() => setDestDropdownOpen(true)}
                                        placeholder="Search cities, forts, landmarks..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
                                    />
                                </div>

                                {/* Dropdown */}
                                {destDropdownOpen && (
                                    <div
                                        ref={destDropdownRef}
                                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-[220px] overflow-y-auto z-50"
                                        style={{ scrollbarWidth: 'thin' }}
                                    >
                                        {!destSearch.trim() && (
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                Popular Cities
                                            </div>
                                        )}
                                        {destResults.length > 0 ? (
                                            destResults.map(anchor => (
                                                <div
                                                    key={anchor.id}
                                                    onClick={() => selectDestination(anchor)}
                                                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-orange-50 transition-colors"
                                                >
                                                    <span className="text-lg">{anchor.emoji}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-gray-800 truncate">{anchor.label}</div>
                                                        <div className="text-[10px] text-gray-400">{anchor.type.toUpperCase()} {'\u00B7'} {anchor.radius}km</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                                                No places found for &ldquo;{destSearch}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date & Time Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                                Date <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={planDate}
                                onChange={(e) => setPlanDate(e.target.value)}
                                min={today}
                                required
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                                Time <span className="font-normal text-gray-400 ml-1">(optional)</span>
                            </label>
                            <input
                                type="time"
                                value={planTime}
                                onChange={(e) => setPlanTime(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                            />
                        </div>
                    </div>

                    {/* Meeting Point */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            Meeting Point <span className="font-normal text-gray-400 ml-1">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={meetingPoint}
                            onChange={(e) => setMeetingPoint(e.target.value)}
                            placeholder="e.g. Jaisalmer Fort Main Gate"
                            maxLength={150}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                        />
                    </div>

                    {/* Max Companions */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Max Companions</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(n => (
                                <button
                                    type="button"
                                    key={n}
                                    onClick={() => setMaxCompanions(n)}
                                    className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${maxCompanions === n
                                        ? 'bg-[#E85D1B] text-white border-[#E85D1B] shadow-sm shadow-orange-500/20'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Budget</label>
                        <div className="grid grid-cols-4 gap-2">
                            {BUDGET_OPTIONS.map(opt => (
                                <button
                                    type="button"
                                    key={opt.id}
                                    onClick={() => setBudget(opt.id)}
                                    className={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl border text-center transition-all ${budget === opt.id
                                        ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="text-base">{opt.emoji}</span>
                                    <span className="text-[11px] font-bold">{opt.label}</span>
                                    <span className="text-[9px] text-gray-400">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Travel Style */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Travel Style</label>
                        <div className="flex flex-wrap gap-2">
                            {TRAVEL_STYLES.map(style => (
                                <button
                                    type="button"
                                    key={style.id}
                                    onClick={() => setTravelStyle(style.id)}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${travelStyle === style.id
                                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {style.emoji} {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Preferred Language</label>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map(lang => (
                                <button
                                    type="button"
                                    key={lang.id}
                                    onClick={() => setLanguage(lang.id)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${language === lang.id
                                        ? 'bg-sky-50 border-sky-300 text-sky-700'
                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vibes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            Vibe <span className="font-normal text-gray-400 ml-1">(pick up to 5)</span>
                            {selectedVibes.length > 0 && (
                                <span className="ml-2 text-xs font-bold text-orange-500">{selectedVibes.length}/5</span>
                            )}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {VIBES.map(vibe => (
                                <button
                                    type="button"
                                    key={vibe.id}
                                    onClick={() => toggleVibe(vibe.id)}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedVibes.includes(vibe.id)
                                        ? 'bg-[#F0A500]/15 border-[#F0A500]/40 text-[#9A6B00] shadow-sm'
                                        : selectedVibes.length >= 5
                                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                        }`}
                                    disabled={!selectedVibes.includes(vibe.id) && selectedVibes.length >= 5}
                                >
                                    {vibe.emoji} {vibe.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Looking For — What kind of companion */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            Looking for <span className="font-normal text-gray-400 ml-1">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={lookingFor}
                            onChange={e => setLookingFor(e.target.value)}
                            placeholder="e.g. Someone who loves photography and knows the area"
                            maxLength={200}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting || !title || !description || !destination || !planDate}
                        className="w-full py-3.5 bg-gradient-to-r from-[#C84B1E] to-[#E85D1B] text-white font-bold rounded-xl text-sm tracking-wide uppercase transition-all hover:shadow-lg hover:shadow-[#E85D1B]/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
                            <>{'\u{1F42A}'} Post Your Plan</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
