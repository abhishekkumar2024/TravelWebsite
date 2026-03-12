'use client';

/**
 * FindCompanionTab — V3 Premium Desert Design
 * 
 * Matching tharmate-v3.html with:
 *   - Dark desert hero with sand dune SVG + particles
 *   - Dynamic search-based destination filter
 *   - Rich companion cards with banner/avatar/stats
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CompanionCard from './CompanionCard';
import CreatePlanForm from './CreatePlanForm';
import type { TharMatePlan } from '@/lib/db/queries/tharmate';
import { ANCHOR_POINTS, getCityAnchors, type AnchorPoint } from '@/lib/tharmate/anchor-points';
import { haversineDistance } from '@/lib/tharmate/location-normalizer';

interface FindCompanionTabProps {
    session: any;
    activeCity: string;
    setActiveCity: (city: string) => void;
}

export default function FindCompanionTab({ session, activeCity, setActiveCity }: FindCompanionTabProps) {
    const [plans, setPlans] = useState<TharMatePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const heroRef = useRef<HTMLDivElement>(null);

    // Search filter state
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const [activeCityLabel, setActiveCityLabel] = useState('');
    const filterInputRef = useRef<HTMLInputElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // GPS / Near You state
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'found' | 'denied' | 'error'>('idle');
    const [nearbyAnchors, setNearbyAnchors] = useState<{ anchor: AnchorPoint; distance: number }[]>([]);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

    const cityAnchors = useMemo(() => getCityAnchors(), []);

    const filterResults = useMemo(() => {
        if (!filterSearch.trim()) return cityAnchors;
        const q = filterSearch.toLowerCase().trim();
        return ANCHOR_POINTS.filter(a =>
            a.label.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [filterSearch, cityAnchors]);

    // ─── GPS Auto-detect on mount ───────────────────────────────
    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            return;
        }

        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setUserCoords({ lat, lng });

                // Calculate distance to every anchor and find top 5 nearest
                const withDistance = ANCHOR_POINTS.map(anchor => ({
                    anchor,
                    distance: haversineDistance(lat, lng, anchor.lat, anchor.lng),
                }));

                // Sort by distance, take only anchors within 200km
                const nearby = withDistance
                    .filter(item => item.distance <= 200)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 6);

                setNearbyAnchors(nearby);
                setGpsStatus(nearby.length > 0 ? 'found' : 'error');

                // Auto-select the nearest city if user hasn't chosen one
                if (nearby.length > 0 && !activeCity) {
                    const nearestCity = nearby.find(item => item.anchor.type === 'city');
                    if (nearestCity) {
                        setActiveCity(nearestCity.anchor.city);
                        setActiveCityLabel(`${nearestCity.anchor.emoji} ${nearestCity.anchor.label}`);
                    }
                }
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setGpsStatus('denied');
                } else {
                    setGpsStatus('error');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function retryGps() {
        if (!navigator.geolocation) return;
        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setUserCoords({ lat, lng });
                const withDistance = ANCHOR_POINTS.map(anchor => ({
                    anchor,
                    distance: haversineDistance(lat, lng, anchor.lat, anchor.lng),
                }));
                const nearby = withDistance
                    .filter(item => item.distance <= 200)
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 6);
                setNearbyAnchors(nearby);
                setGpsStatus(nearby.length > 0 ? 'found' : 'error');
            },
            () => setGpsStatus('error'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node) &&
                filterInputRef.current && !filterInputRef.current.contains(e.target as Node)) {
                setFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function selectFilterCity(anchor: AnchorPoint) {
        setActiveCity(anchor.city);
        setActiveCityLabel(`${anchor.emoji} ${anchor.label}`);
        setFilterSearch('');
        setFilterDropdownOpen(false);
    }

    function clearFilter() {
        setActiveCity('');
        setActiveCityLabel('');
        setFilterSearch('');
    }

    function formatDistance(km: number): string {
        if (km < 1) return `${Math.round(km * 1000)}m`;
        if (km < 10) return `${km.toFixed(1)}km`;
        return `${Math.round(km)}km`;
    }

    // Generate particles
    useEffect(() => {
        if (!heroRef.current) return;
        const container = heroRef.current;
        // Clear existing particles
        container.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const p = document.createElement('div');
            p.className = 'tm-particle';
            const s = Math.random() * 4 + 2;
            p.style.cssText = `width:${s}px;height:${s}px;top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-duration:${4 + Math.random() * 5}s;animation-delay:-${Math.random() * 5}s;`;
            container.appendChild(p);
        }
    }, []);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeCity) params.set('destination', activeCity);
            params.set('limit', '20');
            const res = await fetch(`/api/tharmate?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setPlans(data.plans || []);
        } catch {
            setPlans([]);
        } finally {
            setLoading(false);
        }
    }, [activeCity]);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const sparkPlans = plans.filter(p => p.isSpark);
    const regularPlans = plans.filter(p => !p.isSpark);

    return (
        <div>
            {/* ═══ HERO ═══ */}
            <div className="tm-hero">
                <div className="tm-hero-particles" ref={heroRef}></div>
                <svg viewBox="0 0 900 100" preserveAspectRatio="none" fill="rgba(240,213,168,.9)">
                    <path d="M0,70 Q120,20 250,60 Q380,95 500,40 Q620,0 750,50 Q840,80 900,30 L900,100 L0,100Z" />
                </svg>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="tm-hero-eyebrow">🐪 CamelThar · Travel Together</div>
                    <div className="tm-hero-heading">
                        Find Your<br />
                        <em>Desert Companion</em>
                    </div>
                    <div className="tm-hero-desc">
                        Solo traveler? Post your plan. Connect with real travelers going to the same place. No group tours — just genuine human connections across Rajasthan.
                    </div>
                    <div className="tm-hero-stats">
                        <div>
                            <div className="tm-hero-stat-num">2,847</div>
                            <div className="tm-hero-stat-label">Connections Made</div>
                        </div>
                        <div>
                            <div className="tm-hero-stat-num">{plans.length || 127}</div>
                            <div className="tm-hero-stat-label">Active Plans</div>
                        </div>
                        <div>
                            <div className="tm-hero-stat-num">8</div>
                            <div className="tm-hero-stat-label">Cities</div>
                        </div>
                    </div>
                    {session?.user ? (
                        <button className="tm-hero-btn" onClick={() => setShowCreateForm(true)}>
                            📝 Post My Travel Plan
                        </button>
                    ) : (
                        <button className="tm-hero-btn" onClick={() => { }} style={{ opacity: 0.7 }}>
                            🔑 Sign in to Post
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ NEAR YOU — GPS Suggestions ═══ */}
            {(gpsStatus === 'loading' || gpsStatus === 'found' || gpsStatus === 'denied' || gpsStatus === 'error') && (
                <div style={{
                    marginBottom: 16,
                    padding: '14px 18px',
                    borderRadius: 16,
                    background: 'var(--tm-card)',
                    border: '1.5px solid var(--tm-border)',
                    boxShadow: '0 2px 12px var(--tm-shadow)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: nearbyAnchors.length > 0 ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {gpsStatus === 'loading' ? (
                                <span style={{ animation: 'tm-pulse 1s infinite', fontSize: 16 }}>{`\u{1F4E1}`}</span>
                            ) : gpsStatus === 'found' ? (
                                <span style={{ fontSize: 16 }}>{`\u{1F4CD}`}</span>
                            ) : (
                                <span style={{ fontSize: 16 }}>{`\u{26A0}\u{FE0F}`}</span>
                            )}
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tm-ink)' }}>
                                    {gpsStatus === 'loading' ? 'Detecting your location...' :
                                     gpsStatus === 'found' ? 'Near You' :
                                     gpsStatus === 'denied' ? 'Location access denied' :
                                     'Could not detect location'}
                                </div>
                                {gpsStatus === 'found' && userCoords && (
                                    <div style={{ fontSize: 10, color: 'var(--tm-muted)', marginTop: 1 }}>
                                        Based on your live location
                                    </div>
                                )}
                            </div>
                        </div>
                        {(gpsStatus === 'denied' || gpsStatus === 'error') && (
                            <button
                                onClick={retryGps}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 10,
                                    border: '1.5px solid var(--tm-border)',
                                    background: 'var(--tm-sand1)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: 'var(--tm-terracotta)',
                                    cursor: 'pointer',
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                {`\u{1F504}`} Retry
                            </button>
                        )}
                    </div>

                    {/* Loading shimmer */}
                    {gpsStatus === 'loading' && (
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="tm-skeleton" style={{ width: 140, height: 72, borderRadius: 14, flexShrink: 0 }}></div>
                            ))}
                        </div>
                    )}

                    {/* Nearby anchor cards */}
                    {gpsStatus === 'found' && nearbyAnchors.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: 10,
                            overflowX: 'auto',
                            paddingBottom: 4,
                            scrollbarWidth: 'none',
                        }}>
                            {nearbyAnchors.map(({ anchor, distance }) => {
                                const isSelected = activeCity === anchor.city;
                                return (
                                    <div
                                        key={anchor.id}
                                        onClick={() => {
                                            setActiveCity(anchor.city);
                                            setActiveCityLabel(`${anchor.emoji} ${anchor.label}`);
                                        }}
                                        style={{
                                            flexShrink: 0,
                                            width: 150,
                                            padding: '12px 14px',
                                            borderRadius: 14,
                                            border: isSelected ? '2px solid var(--tm-terracotta)' : '1.5px solid var(--tm-border)',
                                            background: isSelected ? 'rgba(200,75,30,.06)' : 'var(--tm-sand1)',
                                            cursor: 'pointer',
                                            transition: 'all .2s',
                                            position: 'relative',
                                        }}
                                    >
                                        {/* Distance badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 8,
                                            fontSize: 9,
                                            fontWeight: 800,
                                            color: distance <= 5 ? '#15803d' : distance <= 20 ? '#d97706' : 'var(--tm-muted)',
                                            background: distance <= 5 ? 'rgba(34,197,94,.08)' : distance <= 20 ? 'rgba(217,119,6,.06)' : 'var(--tm-card)',
                                            padding: '2px 6px',
                                            borderRadius: 8,
                                            border: `1px solid ${distance <= 5 ? 'rgba(34,197,94,.15)' : distance <= 20 ? 'rgba(217,119,6,.1)' : 'var(--tm-border)'}`,
                                        }}>
                                            {formatDistance(distance)}
                                        </div>
                                        <div style={{ fontSize: 22, marginBottom: 4 }}>{anchor.emoji}</div>
                                        <div style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: 'var(--tm-ink)',
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {anchor.label.split('(')[0].trim()}
                                        </div>
                                        <div style={{ fontSize: 9, color: 'var(--tm-muted)', marginTop: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                                            {anchor.type}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ FILTER ROW — Dynamic Search ═══ */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, position: 'relative' }}>
                <span className="tm-filter-label">Filter:</span>

                {/* "All" Button */}
                <button
                    className={`tm-filter-pill ${!activeCity ? 'active' : ''}`}
                    onClick={clearFilter}
                    style={{ flexShrink: 0 }}
                >
                    {`\u{1F30D}`} All
                </button>

                {/* Selected city chip OR search input */}
                {activeCity ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: 'rgba(200,75,30,.08)',
                        border: '1.5px solid rgba(200,75,30,.2)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--tm-terracotta)',
                    }}>
                        <span>{activeCityLabel || activeCity}</span>
                        <button
                            onClick={clearFilter}
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(200,75,30,.12)',
                                color: 'var(--tm-terracotta)',
                                fontSize: 11,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                            }}
                        >
                            {'\u2715'}
                        </button>
                    </div>
                ) : (
                    <div style={{ flex: 1, position: 'relative', maxWidth: 320 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: filterDropdownOpen ? '1.5px solid var(--tm-terracotta)' : '1.5px solid var(--tm-border)',
                            background: 'var(--tm-card)',
                            transition: 'all .2s',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tm-muted)" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                ref={filterInputRef}
                                type="text"
                                value={filterSearch}
                                onChange={e => { setFilterSearch(e.target.value); setFilterDropdownOpen(true); }}
                                onFocus={() => setFilterDropdownOpen(true)}
                                placeholder="Search destinations..."
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    background: 'none',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    color: 'var(--tm-ink)',
                                }}
                            />
                        </div>

                        {/* Dropdown */}
                        {filterDropdownOpen && (
                            <div
                                ref={filterDropdownRef}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: 4,
                                    background: 'var(--tm-card)',
                                    border: '1.5px solid var(--tm-border)',
                                    borderRadius: 14,
                                    boxShadow: '0 8px 28px rgba(28,16,8,.12)',
                                    maxHeight: 260,
                                    overflowY: 'auto',
                                    zIndex: 100,
                                    animation: 'tm-fadeUp .2s ease',
                                }}
                            >
                                {filterResults.map(anchor => (
                                    <div
                                        key={anchor.id}
                                        onClick={() => selectFilterCity(anchor)}
                                        style={{
                                            padding: '10px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            cursor: 'pointer',
                                            transition: 'background .15s',
                                            borderBottom: '1px solid var(--tm-border)',
                                            fontSize: 13,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--tm-sand1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span style={{ fontSize: 18 }}>{anchor.emoji}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--tm-ink)' }}>{anchor.label}</div>
                                            <div style={{ fontSize: 10, color: 'var(--tm-muted)' }}>
                                                {anchor.type.toUpperCase()} {'\u00B7'} {anchor.radius}km
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filterResults.length === 0 && (
                                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--tm-muted)', fontSize: 13 }}>
                                        No places found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ LOADING SKELETON ═══ */}
            {loading && (
                <div className="tm-card-grid">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="tm-companion-card" style={{ animation: `tm-fadeSlideUp 0.3s ease-out ${i * 0.1}s both` }}>
                            <div className="tm-card-banner" style={{ background: 'var(--tm-sand1)' }}></div>
                            <div className="tm-card-body" style={{ paddingTop: 34 }}>
                                <div className="tm-skeleton" style={{ width: 120, height: 16, marginBottom: 8 }}></div>
                                <div className="tm-skeleton" style={{ width: 180, height: 12, marginBottom: 16 }}></div>
                                <div style={{ display: 'flex', gap: 5 }}>
                                    <div className="tm-skeleton" style={{ width: 70, height: 24, borderRadius: 20 }}></div>
                                    <div className="tm-skeleton" style={{ width: 80, height: 24, borderRadius: 20 }}></div>
                                    <div className="tm-skeleton" style={{ width: 60, height: 24, borderRadius: 20 }}></div>
                                </div>
                                <div className="tm-skeleton" style={{ width: '100%', height: 60, marginTop: 12, borderRadius: 10 }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ PLANS ═══ */}
            {!loading && (
                <>
                    {/* Sparks — Leaving Soon */}
                    {sparkPlans.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
                                    <span style={{ position: 'absolute', animation: 'tm-beat 1.5s infinite', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--tm-gold)', opacity: 0.6 }}></span>
                                    <span style={{ position: 'relative', borderRadius: '50%', width: 8, height: 8, background: 'var(--tm-gold)' }}></span>
                                </span>
                                <div className="tm-section-label" style={{ margin: 0, letterSpacing: 2 }}>
                                    ⚡ Leaving Soon
                                </div>
                            </div>
                            <div className="tm-card-grid">
                                {sparkPlans.map((plan, i) => (
                                    <CompanionCard key={plan.id} plan={plan} index={i} currentUserId={session?.user?.id} onSparkSent={fetchPlans} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regular Plans */}
                    {regularPlans.length > 0 ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div className="tm-section-label" style={{ margin: 0 }}>
                                    {activeCity
                                        ? (activeCityLabel || activeCity)
                                        : 'All Plans'}
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--tm-muted)', fontWeight: 600 }}>
                                    {regularPlans.length} plans
                                </span>
                            </div>
                            <div className="tm-card-grid">
                                {regularPlans.map((plan, i) => (
                                    <CompanionCard key={plan.id} plan={plan} index={i} currentUserId={session?.user?.id} onSparkSent={fetchPlans} />
                                ))}
                            </div>
                        </div>
                    ) : sparkPlans.length === 0 ? (
                        <div className="tm-empty-state">
                            <div className="tm-empty-icon">🐪</div>
                            <div className="tm-empty-title">No plans yet</div>
                            <div className="tm-empty-desc">
                                {activeCity
                                    ? `Be the first to post a plan for ${activeCityLabel || activeCity}`
                                    : 'Be the first to post a travel plan!'}
                            </div>
                            {session?.user && (
                                <button
                                    className="tm-hero-btn"
                                    onClick={() => setShowCreateForm(true)}
                                    style={{ marginTop: 20 }}
                                >
                                    + Post First Plan
                                </button>
                            )}
                        </div>
                    ) : null}
                </>
            )}

            {/* Post Plan CTA */}
            {session?.user && plans.length > 0 && (
                <div style={{
                    marginTop: 28,
                    background: 'var(--tm-card)',
                    border: '1.5px solid var(--tm-border)',
                    borderRadius: 20,
                    padding: '24px 20px',
                    textAlign: 'center',
                    boxShadow: '0 3px 18px var(--tm-shadow)',
                }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🗺️</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: 'var(--tm-ink)', marginBottom: 4 }}>
                        Got a plan?
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tm-muted)', marginBottom: 14 }}>
                        Share your travel plan and find companions
                    </div>
                    <button className="tm-hero-btn" onClick={() => setShowCreateForm(true)} style={{ marginTop: 0 }}>
                        + Post My Plan
                    </button>
                </div>
            )}

            {!session?.user && (
                <div style={{
                    marginTop: 24,
                    background: 'var(--tm-card)',
                    border: '1.5px solid var(--tm-border)',
                    borderRadius: 18,
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px var(--tm-shadow)',
                }}>
                    <p style={{ fontSize: 13, color: 'var(--tm-muted)', fontStyle: 'italic' }}>
                        Sign in to post your travel plan ✨
                    </p>
                </div>
            )}

            <CreatePlanForm open={showCreateForm} onClose={() => setShowCreateForm(false)} onCreated={fetchPlans} />
        </div>
    );
}
