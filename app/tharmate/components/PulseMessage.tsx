'use client';

/**
 * PulseMessage — V3 Desert Design
 * 
 * Rich pulse message card matching tharmate-v3.html:
 *   - Rounded avatar
 *   - Badge row (insider/local)
 *   - Tag badge
 *   - Content + photo
 *   - Action buttons row
 */

import { useState } from 'react';
import type { PulseMessage as PulseMessageType } from '@/lib/db/queries/tharmate-pulse';
import { sanitize } from '@/lib/sanitize';

const TAG_MAP: Record<string, { cls: string; label: string }> = {
    tip: { cls: 'tm-ptag-tip', label: '💡 Tip' },
    photo: { cls: 'tm-ptag-photo', label: '📸 Photo' },
    question: { cls: 'tm-ptag-question', label: '❓ Question' },
    alert: { cls: 'tm-ptag-alert', label: '🚨 Alert' },
    joinme: { cls: 'tm-ptag-joinme', label: '🤝 Join Me' },
};

const AVATAR_COLORS = ['#C84B1E', '#4A7FA5', '#5C8A62', '#D4960A', '#9B6BB5', '#C04B1C'];

function timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getInitials(name: string | null): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null): string {
    if (!name) return AVATAR_COLORS[0];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface PulseMessageProps {
    pulse: PulseMessageType;
    currentUserId?: string;
    onHelpful: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function PulseMessage({ pulse, currentUserId, onHelpful, onDelete }: PulseMessageProps) {
    const [helpfulCount, setHelpfulCount] = useState(pulse.helpfulCount);
    const [hasVoted, setHasVoted] = useState(false);

    const tagInfo = TAG_MAP[pulse.tag] || TAG_MAP.tip;
    const isOwn = currentUserId === pulse.userId;
    const color = getAvatarColor(pulse.authorName);

    const handleHelpful = () => {
        if (hasVoted) return;
        setHasVoted(true);
        setHelpfulCount(prev => prev + 1);
        onHelpful(pulse.id);
    };

    return (
        <div className="tm-pulse-msg">
            {/* Header */}
            <div className="tm-pulse-msg-head">
                <div
                    className="tm-pulse-msg-avatar"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
                >
                    {pulse.authorImage ? (
                        <img src={pulse.authorImage} alt="" />
                    ) : (
                        <span style={{ color: '#fff' }}>{getInitials(pulse.authorName)}</span>
                    )}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span className="tm-pulse-msg-name">{pulse.authorName || 'Traveler'}</span>
                        {pulse.authorImage && (
                            <span className="tm-pulse-badge tm-pulse-badge-insider" style={{ fontSize: 9 }}>✓ Verified</span>
                        )}
                    </div>
                    <div className="tm-pulse-msg-when">{timeAgo(pulse.createdAt)}</div>
                </div>

                <span className={`tm-pulse-tag ${tagInfo.cls}`}>{tagInfo.label}</span>
            </div>

            {/* Content */}
            <div className="tm-pulse-msg-text">
                {sanitize(pulse.message)}
            </div>

            {/* Photo */}
            {pulse.photoUrl && (
                <div style={{ margin: '0 0 0', overflow: 'hidden' }}>
                    <img
                        src={pulse.photoUrl}
                        alt="Pulse photo"
                        style={{
                            width: '100%',
                            maxHeight: 300,
                            objectFit: 'cover',
                        }}
                        loading="lazy"
                    />
                </div>
            )}

            {/* Location */}
            <div className="tm-pulse-msg-loc">
                📍 {pulse.destination || 'Rajasthan'}
            </div>

            {/* Actions */}
            <div className="tm-pulse-msg-actions">
                <button
                    className={`tm-pulse-action-btn ${hasVoted ? 'liked' : ''}`}
                    onClick={handleHelpful}
                    disabled={hasVoted}
                >
                    ❤️ {helpfulCount > 0 ? helpfulCount : ''}
                </button>

                <button className="tm-pulse-action-btn">
                    💬 0
                </button>

                {pulse.tag === 'question' && (
                    <button className="tm-pulse-action-btn" style={{ borderColor: 'rgba(212,150,10,.3)', color: 'var(--tm-gold2)' }}>
                        ✏️ Answer
                    </button>
                )}

                {pulse.tag === 'joinme' && (
                    <button className="tm-pulse-action-btn" style={{ borderColor: 'rgba(200,75,30,.3)', color: 'var(--tm-terracotta)' }}>
                        🙋 Join!
                    </button>
                )}

                <button className="tm-pulse-action-btn">
                    🔗 Share
                </button>

                {isOwn && (
                    <button
                        className="tm-pulse-action-btn"
                        onClick={() => onDelete(pulse.id)}
                        style={{ marginLeft: 'auto', borderColor: 'rgba(244,67,54,.3)', color: 'var(--tm-red)' }}
                    >
                        🗑 Delete
                    </button>
                )}

                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tm-muted2)' }}>
                    {timeAgo(pulse.createdAt)}
                </span>
            </div>
        </div>
    );
}
