'use client';

/**
 * PlacePulseTab — V4 Location-Based Live Chat
 * 
 * The new Place Pulse is a GLOBAL LIVE CHAT based on anchor points.
 * Users search for a place or use GPS → see all matching chat rooms → join one.
 * Messages auto-expire after 48 hours.
 * 
 * Features:
 *   - Search bar with autocomplete across all anchors
 *   - 📍 "Use My Location" GPS button → auto-detect nearest anchor
 *   - Anchor room cards with live activity indicators
 *   - Click a room → opens AnchorChat (live chat)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AnchorChat from './AnchorChat';
import { ANCHOR_POINTS, getCityAnchors, getAnchorsForCity, type AnchorPoint } from '@/lib/tharmate/anchor-points';
import { findNearestAnchor, haversineDistance } from '@/lib/tharmate/location-normalizer';

interface AnchorRoom {
    id: string;
    label: string;
    emoji: string;
    city: string;
    type: 'city' | 'landmark' | 'area';
    radius: number;
    lat: number;
    lng: number;
    activeMembers: number;
    messageCount: number;
    hasActivity: boolean;
}

interface CityOverview {
    id: string;
    label: string;
    emoji: string;
    city: string;
    anchorCount: number;
    totalActive: number;
    totalMessages: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    city: { label: 'CITY', color: '#C84B1E', bg: 'rgba(200,75,30,.08)' },
    landmark: { label: 'LANDMARK', color: '#D4960A', bg: 'rgba(212,150,10,.08)' },
    area: { label: 'AREA', color: '#5C8A62', bg: 'rgba(92,138,98,.08)' },
};

interface PlacePulseTabProps {
    session: any;
}

export default function PlacePulseTab({ session }: PlacePulseTabProps) {
    const [selectedCity, setSelectedCity] = useState('');
    const [anchors, setAnchors] = useState<AnchorRoom[]>([]);
    const [cityOverview, setCityOverview] = useState<CityOverview[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
    const [gpsLabel, setGpsLabel] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ─── Derive city anchors from anchor-points.ts ──────────────
    const cityAnchors = useMemo(() => getCityAnchors(), []);

    // ─── Search / Autocomplete ──────────────────────────────────
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return ANCHOR_POINTS
            .filter(a =>
                a.label.toLowerCase().includes(q) ||
                a.city.toLowerCase().includes(q) ||
                a.id.toLowerCase().includes(q)
            )
            .slice(0, 10);
    }, [searchQuery]);

    // Group search results by city
    const groupedResults = useMemo(() => {
        const groups: Record<string, AnchorPoint[]> = {};
        for (const a of searchResults) {
            if (!groups[a.city]) groups[a.city] = [];
            groups[a.city].push(a);
        }
        return groups;
    }, [searchResults]);

    // ─── Handle search result click ─────────────────────────────
    const handleSelectAnchor = (anchor: AnchorPoint) => {
        // If it's a city-level anchor, show all rooms for that city
        if (anchor.type === 'city') {
            setSelectedCity(anchor.city);
            setSearchQuery('');
            setSearchFocused(false);
        } else {
            // Landmark or area — go straight to the chat room
            setActiveAnchorId(anchor.id);
            setSearchQuery('');
            setSearchFocused(false);
        }
    };

    const handleSelectCity = (cityId: string) => {
        setSelectedCity(cityId);
        setSearchQuery('');
        setSearchFocused(false);
    };

    // ─── GPS Auto-Detect ────────────────────────────────────────
    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            setGpsLabel('GPS not supported');
            return;
        }

        setGpsStatus('loading');
        setGpsLabel('Detecting location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const match = findNearestAnchor(latitude, longitude);

                if (match) {
                    const dist = Math.round(match.distance * 10) / 10;
                    setGpsStatus('found');
                    setGpsLabel(`${match.anchor.emoji} ${match.anchor.label} (${dist}km away)`);
                    
                    // If it's a city anchor, show rooms for that city
                    if (match.anchor.type === 'city') {
                        setSelectedCity(match.anchor.city);
                    } else {
                        // Landmark — go straight to chat
                        setSelectedCity(match.anchor.city);
                        setTimeout(() => setActiveAnchorId(match.anchor.id), 300);
                    }
                } else {
                    setGpsStatus('error');
                    setGpsLabel(`No places found near you (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`);
                }
            },
            (error) => {
                setGpsStatus('error');
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setGpsLabel('Location permission denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setGpsLabel('Location unavailable');
                        break;
                    default:
                        setGpsLabel('Could not detect location');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ─── Close dropdown on outside click ────────────────────────
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ─── Fetch Anchor Rooms for Selected City ───────────────────
    const fetchAnchors = useCallback(async () => {
        if (!selectedCity) return;
        try {
            const res = await fetch(`/api/tharmate/anchor-rooms?city=${selectedCity}`);
            if (res.ok) {
                const data = await res.json();
                setAnchors(data.anchors || []);
            }
        } catch (err) {
            console.error('Error fetching anchor rooms:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedCity]);

    // ─── Fetch City Overview ────────────────────────────────────
    const fetchOverview = useCallback(async () => {
        try {
            const res = await fetch('/api/tharmate/anchor-rooms');
            if (res.ok) {
                const data = await res.json();
                setCityOverview(data.cities || []);
            }
        } catch { }
    }, []);

    useEffect(() => {
        if (selectedCity) {
            setLoading(true);
            fetchAnchors();
        }
    }, [fetchAnchors, selectedCity]);

    useEffect(() => {
        fetchOverview();
        const interval = setInterval(fetchOverview, 30000);
        return () => clearInterval(interval);
    }, [fetchOverview]);

    useEffect(() => {
        if (!selectedCity) return;
        const interval = setInterval(fetchAnchors, 15000);
        return () => clearInterval(interval);
    }, [fetchAnchors, selectedCity]);

    // ─── Active Chat View ───────────────────────────────────────
    if (activeAnchorId) {
        return (
            <AnchorChat
                anchorId={activeAnchorId}
                session={session}
                onBack={() => { setActiveAnchorId(null); fetchAnchors(); }}
            />
        );
    }

    const getCityActivity = (cityId: string): number => {
        const found = cityOverview.find(c => c.city === cityId);
        return found?.totalActive || 0;
    };

    const currentCityAnchor = cityAnchors.find(c => c.city === selectedCity);
    const currentCityLabel = currentCityAnchor?.label || selectedCity;
    const currentCityEmoji = currentCityAnchor?.emoji || '🏙️';
    const showDropdown = searchFocused && (searchQuery.trim().length > 0 || true);

    return (
        <div>
            {/* ═══ HERO ═══ */}
            <div className="tm-hero" style={{ padding: '24px 30px', marginBottom: 20 }}>
                <svg viewBox="0 0 900 80" preserveAspectRatio="none" fill="rgba(240,213,168,.9)">
                    <path d="M0,50 Q200,10 400,55 Q600,95 900,30 L900,80 L0,80Z" />
                </svg>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="tm-hero-eyebrow">🌍 48-Hour Live Chat · Location Based</div>
                    <div className="tm-hero-heading" style={{ fontSize: 30 }}>
                        Place <em>Pulse</em>
                    </div>
                    <div className="tm-hero-desc" style={{ fontSize: 12 }}>
                        Search a destination or use GPS to find live conversations nearby.
                    </div>
                </div>
            </div>

            {/* ═══ SEARCH + GPS BAR ═══ */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'stretch',
                }}>
                    {/* Search Input */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 16px',
                            borderRadius: 14,
                            border: searchFocused ? '2px solid var(--tm-terracotta)' : '2px solid var(--tm-border)',
                            background: 'var(--tm-card)',
                            boxShadow: searchFocused ? '0 4px 20px rgba(200,75,30,.1)' : '0 2px 8px var(--tm-shadow)',
                            transition: 'all .2s',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tm-muted)" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                placeholder="Search cities, forts, temples, lakes..."
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    background: 'none',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 14,
                                    color: 'var(--tm-ink)',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: 'var(--tm-border)',
                                        color: 'var(--tm-muted)',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* GPS Button */}
                    <button
                        onClick={handleUseLocation}
                        disabled={gpsStatus === 'loading'}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 16px',
                            borderRadius: 14,
                            border: '2px solid var(--tm-border)',
                            background: gpsStatus === 'found'
                                ? 'rgba(34,197,94,.06)'
                                : gpsStatus === 'error'
                                    ? 'rgba(244,67,54,.04)'
                                    : 'var(--tm-card)',
                            cursor: gpsStatus === 'loading' ? 'wait' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 700,
                            color: gpsStatus === 'found' ? '#15803d' : gpsStatus === 'error' ? '#dc2626' : 'var(--tm-terracotta)',
                            transition: 'all .2s',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px var(--tm-shadow)',
                        }}
                    >
                        {gpsStatus === 'loading' ? (
                            <span style={{ animation: 'tm-pulse 1s infinite' }}>📡</span>
                        ) : gpsStatus === 'found' ? '✅' : gpsStatus === 'error' ? '⚠️' : '📍'}
                        <span style={{ display: 'inline' }}>
                            {gpsStatus === 'idle' ? 'My Location' : gpsStatus === 'loading' ? 'Detecting...' : gpsStatus === 'found' ? 'Found!' : 'Retry'}
                        </span>
                    </button>
                </div>

                {/* GPS Status Label */}
                {gpsLabel && gpsStatus !== 'idle' && (
                    <div style={{
                        marginTop: 6,
                        padding: '6px 14px',
                        borderRadius: 10,
                        background: gpsStatus === 'found' ? 'rgba(34,197,94,.06)' : 'rgba(244,67,54,.04)',
                        border: `1px solid ${gpsStatus === 'found' ? 'rgba(34,197,94,.15)' : 'rgba(244,67,54,.1)'}`,
                        fontSize: 12,
                        color: gpsStatus === 'found' ? '#15803d' : '#dc2626',
                        animation: 'tm-fadeUp .2s ease',
                    }}>
                        {gpsLabel}
                    </div>
                )}

                {/* ═══ SEARCH DROPDOWN ═══ */}
                {showDropdown && (
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            background: 'var(--tm-card)',
                            border: '1.5px solid var(--tm-border)',
                            borderRadius: 16,
                            boxShadow: '0 8px 32px rgba(28,16,8,.12)',
                            maxHeight: 380,
                            overflowY: 'auto',
                            zIndex: 100,
                            animation: 'tm-fadeUp .2s ease',
                        }}
                    >
                        {/* If search query active, show filtered results */}
                        {searchQuery.trim() ? (
                            Object.keys(groupedResults).length > 0 ? (
                                Object.entries(groupedResults).map(([city, results]) => (
                                    <div key={city}>
                                        <div style={{
                                            padding: '8px 16px 4px',
                                            fontSize: 10,
                                            fontWeight: 800,
                                            color: 'var(--tm-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                        }}>
                                            {cityAnchors.find(c => c.city === city)?.emoji} {city}
                                        </div>
                                        {results.map(anchor => (
                                            <div
                                                key={anchor.id}
                                                onClick={() => handleSelectAnchor(anchor)}
                                                style={{
                                                    padding: '10px 16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    cursor: 'pointer',
                                                    transition: 'background .15s',
                                                    borderBottom: '1px solid var(--tm-border)',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tm-sand1)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <span style={{ fontSize: 20 }}>{anchor.emoji}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tm-ink)' }}>
                                                        {anchor.label}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'var(--tm-muted)' }}>
                                                        {TYPE_LABELS[anchor.type]?.label} · {anchor.radius}km
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: 10,
                                                    color: 'var(--tm-terracotta)',
                                                    fontWeight: 600,
                                                }}>
                                                    {anchor.type === 'city' ? 'View all →' : 'Join →'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--tm-muted)', fontSize: 13 }}>
                                    No places found for &quot;{searchQuery}&quot;
                                </div>
                            )
                        ) : (
                            /* No search query — show all cities as quick picks */
                            <div>
                                <div style={{
                                    padding: '10px 16px 6px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: 'var(--tm-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                }}>
                                    🏙️ Choose a City
                                </div>
                                {cityAnchors.map(city => {
                                    const activity = getCityActivity(city.city);
                                    const cityAnchorsLocal = getAnchorsForCity(city.city);
                                    return (
                                        <div
                                            key={city.id}
                                            onClick={() => handleSelectCity(city.city)}
                                            style={{
                                                padding: '12px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                cursor: 'pointer',
                                                transition: 'background .15s',
                                                borderBottom: '1px solid var(--tm-border)',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--tm-sand1)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <span style={{ fontSize: 24 }}>{city.emoji}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tm-ink)' }}>
                                                    {city.label}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--tm-muted)' }}>
                                                    {cityAnchorsLocal.length} spots · {city.radius}km zone
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {activity > 0 && (
                                                    <span style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: '#15803d',
                                                        background: 'rgba(34,197,94,.08)',
                                                        padding: '3px 8px',
                                                        borderRadius: 12,
                                                        border: '1px solid rgba(34,197,94,.15)',
                                                    }}>
                                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                                        {activity}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 11, color: 'var(--tm-terracotta)', fontWeight: 600 }}>→</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ SELECTED CITY HEADER ═══ */}
            {selectedCity && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                    padding: '10px 16px',
                    borderRadius: 14,
                    background: 'var(--tm-card)',
                    border: '1.5px solid var(--tm-border)',
                    boxShadow: '0 2px 8px var(--tm-shadow)',
                }}>
                    <span style={{ fontSize: 26 }}>{currentCityEmoji}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tm-ink)', fontFamily: "'Playfair Display', serif" }}>
                            {currentCityLabel}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--tm-muted)' }}>
                            {anchors.length} chat rooms · 48hr conversations
                        </div>
                    </div>
                    <button
                        onClick={() => { setSelectedCity(''); setAnchors([]); setSearchFocused(true); searchRef.current?.focus(); }}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 10,
                            border: '1.5px solid var(--tm-border)',
                            background: 'var(--tm-sand1)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--tm-muted)',
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                    >
                        ✕ Change
                    </button>
                </div>
            )}

            {/* ═══ ANCHOR ROOMS GRID (only when city selected) ═══ */}
            {selectedCity ? (
                <div className="tm-pulse-layout">
                    <div>
                        {/* Loading */}
                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="tm-room-card">
                                        <div className="tm-room-head">
                                            <div className="tm-skeleton" style={{ width: 46, height: 46, borderRadius: 14 }}></div>
                                            <div style={{ flex: 1 }}>
                                                <div className="tm-skeleton" style={{ width: 160, height: 14, marginBottom: 6 }}></div>
                                                <div className="tm-skeleton" style={{ width: 100, height: 10 }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Anchor Room Cards */}
                        {!loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {anchors.length > 0 ? (
                                    anchors.map((anchor, i) => {
                                        const typeInfo = TYPE_LABELS[anchor.type] || TYPE_LABELS.city;
                                        return (
                                            <div
                                                key={anchor.id}
                                                className={`tm-room-card ${anchor.hasActivity ? 'active-room' : ''}`}
                                                style={{
                                                    animation: `tm-fadeUp .35s ease ${i * 0.06}s both`,
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => setActiveAnchorId(anchor.id)}
                                            >
                                                <div className="tm-room-head">
                                                    <div className="tm-room-icon" style={{ background: typeInfo.bg, fontSize: 22 }}>
                                                        {anchor.emoji}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div className="tm-room-name" style={{ fontSize: 14 }}>
                                                            {anchor.label}
                                                        </div>
                                                        <div className="tm-room-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                            <span style={{
                                                                padding: '1px 6px',
                                                                borderRadius: 4,
                                                                fontSize: 8,
                                                                fontWeight: 800,
                                                                letterSpacing: '0.5px',
                                                                color: typeInfo.color,
                                                                background: typeInfo.bg,
                                                                border: `1px solid ${typeInfo.color}22`,
                                                            }}>
                                                                {typeInfo.label}
                                                            </span>
                                                            <span style={{ fontSize: 11, color: 'var(--tm-muted)' }}>
                                                                {anchor.radius}km radius
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                        {anchor.activeMembers > 0 ? (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                padding: '4px 10px',
                                                                borderRadius: 20,
                                                                background: 'rgba(34,197,94,.08)',
                                                                border: '1px solid rgba(34,197,94,.2)',
                                                            }}>
                                                                <span style={{
                                                                    width: 6, height: 6,
                                                                    borderRadius: '50%',
                                                                    background: '#22c55e',
                                                                    display: 'inline-block',
                                                                    boxShadow: '0 0 6px rgba(34,197,94,.5)',
                                                                    animation: 'tm-pulse 2s infinite',
                                                                }} />
                                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                                                                    {anchor.activeMembers} live
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                padding: '4px 10px',
                                                                borderRadius: 20,
                                                                background: 'var(--tm-sand1)',
                                                                border: '1px solid var(--tm-border)',
                                                                fontSize: 11,
                                                                color: 'var(--tm-muted)',
                                                                fontWeight: 600,
                                                            }}>
                                                                💬 Join
                                                            </div>
                                                        )}
                                                        {anchor.messageCount > 0 && (
                                                            <span style={{ fontSize: 9, color: 'var(--tm-muted2)' }}>
                                                                {anchor.messageCount} messages
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="tm-empty-state">
                                        <div className="tm-empty-icon">🏜️</div>
                                        <div className="tm-empty-title">No rooms found</div>
                                        <div className="tm-empty-desc">Rooms will appear here for {currentCityLabel}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ SIDEBAR ═══ */}
                    <div>
                        <div className="tm-pulse-sidebar-card">
                            <div className="tm-pulse-sidebar-head">
                                <div className="tm-pulse-sidebar-title">🌍 How Place Pulse Works</div>
                            </div>
                            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--tm-ink2)', lineHeight: 2 }}>
                                <div>🔍 Search or use GPS to find a place</div>
                                <div>💬 Join the live conversation</div>
                                <div>⏰ Messages expire after 48hrs</div>
                                <div>🌐 Anyone at the location can chat</div>
                            </div>
                        </div>

                        <div className="tm-pulse-sidebar-card">
                            <div className="tm-pulse-sidebar-head">
                                <div className="tm-pulse-sidebar-title">{currentCityEmoji} {currentCityLabel} Spots</div>
                            </div>
                            <div style={{ padding: '4px 0' }}>
                                {anchors.filter(a => a.type === 'landmark').slice(0, 5).map(anchor => (
                                    <div
                                        key={anchor.id}
                                        onClick={() => setActiveAnchorId(anchor.id)}
                                        style={{
                                            padding: '10px 16px',
                                            borderBottom: '1px solid var(--tm-border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            transition: 'background .15s',
                                            fontSize: 13,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--tm-sand1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span style={{ color: 'var(--tm-ink2)' }}>
                                            {anchor.emoji} {anchor.label.split('(')[0].trim()}
                                        </span>
                                        {anchor.activeMembers > 0 && (
                                            <span style={{
                                                fontSize: 9, fontWeight: 700, color: '#15803d',
                                                background: 'rgba(34,197,94,.1)', padding: '2px 6px', borderRadius: 8,
                                            }}>
                                                {anchor.activeMembers} 🟢
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="tm-pulse-sidebar-card">
                            <div className="tm-pulse-sidebar-head">
                                <div className="tm-pulse-sidebar-title">🔐 Safety</div>
                            </div>
                            <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--tm-ink2)', lineHeight: 2 }}>
                                <div>✅ Auto-expire for privacy</div>
                                <div>🛡️ No personal data shared</div>
                                <div>⚠️ Report inappropriate content</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ═══ NO CITY SELECTED — SHOW CITY GRID ═══ */
                <div style={{ marginTop: 8 }}>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--tm-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: 12,
                    }}>
                        🏙️ Popular Destinations
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 12,
                    }}>
                        {cityAnchors.map((city, i) => {
                            const activity = getCityActivity(city.city);
                            const cityAnchorsLocal = getAnchorsForCity(city.city);
                            return (
                                <div
                                    key={city.id}
                                    onClick={() => setSelectedCity(city.city)}
                                    className="tm-room-card"
                                    style={{
                                        cursor: 'pointer',
                                        animation: `tm-fadeUp .35s ease ${i * 0.06}s both`,
                                        marginBottom: 0,
                                    }}
                                >
                                    <div style={{
                                        padding: '20px 18px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        gap: 8,
                                    }}>
                                        <span style={{ fontSize: 36 }}>{city.emoji}</span>
                                        <div>
                                            <div style={{
                                                fontSize: 16,
                                                fontWeight: 700,
                                                color: 'var(--tm-ink)',
                                                fontFamily: "'Playfair Display', serif",
                                            }}>
                                                {city.label}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--tm-muted)', marginTop: 2 }}>
                                                {cityAnchorsLocal.length} spots · {city.radius}km
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {activity > 0 ? (
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: '#15803d',
                                                    background: 'rgba(34,197,94,.08)',
                                                    padding: '3px 10px',
                                                    borderRadius: 12,
                                                    border: '1px solid rgba(34,197,94,.15)',
                                                }}>
                                                    <span style={{
                                                        width: 5, height: 5, borderRadius: '50%',
                                                        background: '#22c55e', display: 'inline-block',
                                                        animation: 'tm-pulse 2s infinite',
                                                    }} />
                                                    {activity} online
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 600, color: 'var(--tm-muted)',
                                                    background: 'var(--tm-sand1)', padding: '3px 10px',
                                                    borderRadius: 12, border: '1px solid var(--tm-border)',
                                                }}>
                                                    Explore →
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Login prompt */}
            {!session?.user && (
                <div style={{
                    marginTop: 24,
                    background: 'var(--tm-card)',
                    border: '1.5px solid var(--tm-border)',
                    borderRadius: 18,
                    padding: 20,
                    textAlign: 'center',
                    boxShadow: '0 2px 12px var(--tm-shadow)',
                }}>
                    <p style={{ fontSize: 13, color: 'var(--tm-muted)', fontStyle: 'italic' }}>
                        Sign in to join live conversations ✨
                    </p>
                </div>
            )}
        </div>
    );
}
