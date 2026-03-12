'use client';

/**
 * CompanionCard — V3 Premium Desert Card Design
 * 
 * Matching tharmate-v3.html with:
 *   - Gradient banner with badge row
 *   - Rounded avatar with verified badge
 *   - Playfair Display name + subtitle info
 *   - Colored info chips (dest, date, vibe)
 *   - Activity tags
 *   - Italic bio block
 *   - Stats row (trips, mates, rating)
 *   - Footer with Spark/Message/View buttons
 */

import { useState } from 'react';
import type { TharMatePlan } from '@/lib/db/queries/tharmate';

const VIBE_CHIP_MAP: Record<string, string> = {
    adventure: 'tm-chip-vibe',
    photography: 'tm-chip-vibe',
    culture: 'tm-chip-vibe',
    budget: 'tm-chip-budget',
    luxury: 'tm-chip-budget',
    food: 'tm-chip-vibe',
    nature: 'tm-chip-vibe',
    nightlife: 'tm-chip-vibe',
};

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #C84B1E, #8a3212)',
    'linear-gradient(135deg, #4A7FA5, #2a5a80)',
    'linear-gradient(135deg, #5C8A62, #3a6a42)',
    'linear-gradient(135deg, #D4960A, #a07006)',
    'linear-gradient(135deg, #9B6BB5, #6a3a8a)',
    'linear-gradient(135deg, #C04B1C, #8a2808)',
];

function getInitials(name: string | null): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getAvatarGradient(name: string | null): string {
    if (!name) return AVATAR_GRADIENTS[0];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
}

function formatTime(timeStr: string | null): string {
    if (!timeStr) return '';
    try {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayH = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayH}:${m} ${ampm}`;
    } catch { return timeStr; }
}

interface CompanionCardProps {
    plan: TharMatePlan;
    index: number;
    currentUserId?: string;
    onSparkSent: () => void;
}

export default function CompanionCard({ plan, index, currentUserId, onSparkSent }: CompanionCardProps) {
    const [sparkStatus, setSparkStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [sparkError, setSparkError] = useState('');

    const initials = getInitials(plan.authorName);
    const avatarGradient = getAvatarGradient(plan.authorName);
    const isOwnPlan = currentUserId === plan.userId;
    const vibeTag = plan.vibe?.[0];

    const handleSendSpark = async () => {
        if (!currentUserId || isOwnPlan) return;
        setSparkStatus('sending');
        setSparkError('');
        try {
            const res = await fetch('/api/tharmate/spark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 409) { setSparkStatus('sent'); }
                else { setSparkError(data.error || 'Failed'); setSparkStatus('error'); }
                return;
            }
            setSparkStatus('sent');
            onSparkSent();
        } catch {
            setSparkError('Network error');
            setSparkStatus('error');
        }
    };

    const dateStr = formatDate(plan.planDate);
    const timeStr = formatTime(plan.planTime);

    return (
        <div
            className="tm-companion-card"
            style={{ animation: `tm-fadeUp .4s cubic-bezier(.22,1,.36,1) ${index * 0.07}s both` }}
        >
            {/* ── Banner ── */}
            <div className="tm-card-banner">
                <div className="tm-card-banner-bg" style={{ background: avatarGradient }}></div>
                <div className="tm-card-banner-pattern"></div>

                {/* Badge Row */}
                <div className="tm-card-badge-row">
                    {plan.isSpark && (
                        <span className="tm-card-badge tm-badge-spark">⚡ Spark</span>
                    )}
                    {plan.authorImage && (
                        <span className="tm-card-badge tm-badge-resp">✓ Verified</span>
                    )}
                </div>

                {/* Avatar */}
                <div className="tm-card-avatar-wrap">
                    <div className="tm-card-avatar" style={{ background: avatarGradient }}>
                        {plan.authorImage ? (
                            <img src={plan.authorImage} alt="" />
                        ) : (
                            initials
                        )}
                        {plan.authorImage && (
                            <div className="tm-verified-badge">✓</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="tm-card-body">
                <div className="tm-card-name">{plan.authorName || 'Traveler'}</div>
                <div className="tm-card-subtitle">
                    <span>📍 {plan.destination}</span>
                    <span>·</span>
                    <span>📅 {dateStr}</span>
                    {timeStr && <><span>·</span><span>🕐 {timeStr}</span></>}
                </div>

                {/* Title */}
                {plan.title && (
                    <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--tm-ink)',
                        marginTop: 10,
                    }}>
                        {plan.title}
                    </div>
                )}

                {/* Info Chips */}
                <div className="tm-card-chips">
                    <span className="tm-chip tm-chip-dest">📍 {plan.destination}</span>
                    <span className="tm-chip tm-chip-date">📅 {dateStr}</span>
                    {vibeTag && (
                        <span className="tm-chip tm-chip-vibe">🎯 {vibeTag}</span>
                    )}
                </div>

                {/* Vibe/Activity tags */}
                {plan.vibe && plan.vibe.length > 0 && (
                    <div className="tm-card-acts">
                        {plan.vibe.map(v => (
                            <span key={v} className="tm-card-act">{v}</span>
                        ))}
                    </div>
                )}

                {/* Bio */}
                {plan.description && (
                    <div className="tm-card-bio">
                        &ldquo;{plan.description.length > 120 ? plan.description.substring(0, 120) + '…' : plan.description}&rdquo;
                    </div>
                )}

                {/* Stats Row */}
                <div className="tm-card-stats">
                    <div className="tm-card-stat">
                        <div className="tm-card-stat-num">{plan.companionCount || 0}</div>
                        <div className="tm-card-stat-label">Joined</div>
                    </div>
                    <div className="tm-card-stat">
                        <div className="tm-card-stat-num">{plan.maxCompanions || 4}</div>
                        <div className="tm-card-stat-label">Max</div>
                    </div>
                    <div className="tm-card-stat">
                        <div className="tm-card-stat-num">{plan.requestCount || 0}</div>
                        <div className="tm-card-stat-label">Requests</div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="tm-card-footer">
                {isOwnPlan ? (
                    <button className="tm-btn-spark sent" style={{ gridColumn: '1 / -1' }}>
                        ✅ Your Plan · {plan.requestCount || 0} requests
                    </button>
                ) : (
                    <>
                        <button
                            className={`tm-btn-spark ${sparkStatus === 'sent' ? 'sent' : ''}`}
                            onClick={handleSendSpark}
                            disabled={sparkStatus === 'sending' || sparkStatus === 'sent' || !currentUserId}
                        >
                            {sparkStatus === 'sent' ? '✅ Sparked!' :
                                sparkStatus === 'sending' ? '⏳ Sending...' :
                                    !currentUserId ? '🔒 Sign in' :
                                        '✨ Spark'}
                        </button>
                        <button className="tm-btn-msg" title="Message">💬</button>
                        <button className="tm-btn-view" title="View Full Profile">👁</button>
                    </>
                )}
            </div>

            {sparkError && (
                <div style={{ padding: '0 18px 12px', fontSize: 11, color: 'var(--tm-red)', fontWeight: 500 }}>
                    {sparkError}
                </div>
            )}
        </div>
    );
}
