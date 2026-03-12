'use client';

/**
 * PulseScoreCard — V3 Desert Design
 * 
 * City stats widget matching tharmate-v3.html sidebar:
 *   - 2x2 stat grid (weather, crowd, roads, prices)
 *   - Vibe score + star rating
 *   - Rate button
 */

import type { PulseScore } from '@/lib/db/queries/tharmate-pulse';

function getVibeLabel(total: number): { label: string; stars: number } {
    if (total >= 20) return { label: '🔥 On Fire', stars: 5 };
    if (total >= 10) return { label: '⚡ Buzzing', stars: 4 };
    if (total >= 5) return { label: '🌤 Active', stars: 3 };
    if (total >= 1) return { label: '🌙 Quiet', stars: 2 };
    return { label: '🏜️ Silent', stars: 1 };
}

interface PulseScoreCardProps {
    score: PulseScore | null;
    destination: string;
}

export default function PulseScoreCard({ score, destination }: PulseScoreCardProps) {
    const total = score?.totalPosts || 0;
    const vibe = getVibeLabel(total);
    const vibeScore = Math.min(5, (total / 4)).toFixed(1);

    return (
        <div>
            {/* Stat Grid */}
            <div className="tm-stat-grid">
                <div className="tm-stat-block">
                    <div className="tm-stat-label">🌤️ Weather</div>
                    <div className="tm-stat-value">38°C Hot</div>
                </div>
                <div className="tm-stat-block">
                    <div className="tm-stat-label">👥 Crowd</div>
                    <div className="tm-stat-value">{total >= 10 ? 'High' : total >= 5 ? 'Medium' : 'Low'}</div>
                </div>
                <div className="tm-stat-block">
                    <div className="tm-stat-label">📝 Pulses</div>
                    <div className="tm-stat-value">{total} posts</div>
                </div>
                <div className="tm-stat-block">
                    <div className="tm-stat-label">💬 Activity</div>
                    <div className="tm-stat-value">{vibe.label}</div>
                </div>
            </div>

            {/* Vibe Score */}
            <div className="tm-vibe-row">
                <div>
                    <div style={{ fontSize: 10, color: 'var(--tm-muted)', marginBottom: 3 }}>Vibe Score</div>
                    <div>
                        {'⭐'.repeat(vibe.stars)}
                        <span style={{ opacity: 0.3 }}>{'⭐'.repeat(5 - vibe.stars)}</span>
                    </div>
                </div>
                <div className="tm-vibe-score">{vibeScore}</div>
                <button className="tm-rate-btn">Rate ↑</button>
            </div>
        </div>
    );
}
