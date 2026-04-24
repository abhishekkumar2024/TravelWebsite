'use client';

/**
 * DesertRoomsTab — V3 Premium Desert Design
 * 
 * Matching tharmate-v3.html with:
 *   - Dark hero header
 *   - Two-column layout (rooms + sidebar)
 *   - Create room dashed button
 *   - Rich room cards with timer, members, badges
 *   - Sidebar with memory capsules + safety info
 */

import { useState, useEffect, useCallback } from 'react';
import ChatRoom from './ChatRoom';
import MemoryCapsule from './MemoryCapsule';

interface DesertRoom {
    id: string;
    creatorId: string;
    destination: string;
    title: string;
    description: string | null;
    maxMembers: number;
    currentMembers: number;
    duration: string;
    expiresAt: string;
    isActive: boolean;
    createdAt: string;
    creatorName: string | null;
    creatorImage: string | null;
    creator_name?: string | null;
    creator_image?: string | null;
}

const DESTINATIONS = [
    { id: '', label: 'All', emoji: '🌍' },
    { id: 'jaisalmer', label: 'Jaisalmer', emoji: '🏯' },
    { id: 'jaipur', label: 'Jaipur', emoji: '🎨' },
    { id: 'udaipur', label: 'Udaipur', emoji: '🌊' },
    { id: 'jodhpur', label: 'Jodhpur', emoji: '🔵' },
    { id: 'pushkar', label: 'Pushkar', emoji: '🌸' },
];

const DURATIONS = [
    { id: '1h', label: '1 Hour', desc: 'Quick chat', icon: '⚡' },
    { id: '3h', label: '3 Hours', desc: 'Evening campfire', icon: '🏕️' },
    { id: '6h', label: '6 Hours', desc: 'Half-day hangout', icon: '🐪' },
    { id: '24h', label: '24 Hours', desc: 'Full-day tribe', icon: '🌅' },
];

const AVATAR_COLORS = ['#C84B1E', '#4A7FA5', '#5C8A62', '#D4960A', '#9B6BB5', '#C04B1C'];

function getTimeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getInitials(name: string | null | undefined): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
    if (!name) return AVATAR_COLORS[0];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface DesertRoomsTabProps {
    session: any;
}

export default function DesertRoomsTab({ session }: DesertRoomsTabProps) {
    const [selectedDest, setSelectedDest] = useState('');
    const [rooms, setRooms] = useState<DesertRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [capsuleRoomId, setCapsuleRoomId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create form state
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formDest, setFormDest] = useState('jaisalmer');
    const [formDuration, setFormDuration] = useState('3h');
    const [formMaxMembers, setFormMaxMembers] = useState(10);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Timer for countdown refresh
    const [, setTick] = useState(0);

    const fetchRooms = useCallback(async () => {
        try {
            const params = selectedDest ? `?destination=${selectedDest}` : '';
            const res = await fetch(`/api/tharmate/rooms${params}`);
            if (res.ok) {
                const data = await res.json();
                const mapped = (data.rooms || []).map((r: any) => ({
                    ...r,
                    creatorName: r.creatorName || r.creator_name,
                    creatorImage: r.creatorImage || r.creator_image,
                }));
                setRooms(mapped);
            }
        } catch (err) {
            console.error('Error fetching rooms:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedDest]);

    useEffect(() => {
        setLoading(true);
        fetchRooms();
        const interval = setInterval(fetchRooms, 15000);
        return () => clearInterval(interval);
    }, [fetchRooms]);

    // Countdown timer tick
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async () => {
        if (!session?.user?.id || !formTitle.trim()) return;
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/tharmate/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: formDest,
                    title: formTitle.trim(),
                    description: formDesc.trim() || undefined,
                    maxMembers: formMaxMembers,
                    duration: formDuration,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setCreateError(data.error || 'Failed to create room'); return; }
            setActiveRoomId(data.id);
            setShowCreateModal(false);
            setFormTitle('');
            setFormDesc('');
            fetchRooms();
        } catch {
            setCreateError('Network error');
        } finally {
            setCreating(false);
        }
    };

    const handleJoin = async (roomId: string) => {
        if (!session?.user?.id) return;
        try {
            await fetch('/api/tharmate/rooms', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'join', roomId }),
            });
        } catch { }
        setActiveRoomId(roomId);
    };

    // Active Chat View
    if (activeRoomId) {
        return (
            <div>
                <ChatRoom
                    roomId={activeRoomId}
                    session={session}
                    onBack={() => { setActiveRoomId(null); fetchRooms(); }}
                />
            </div>
        );
    }

    // Memory Capsule View
    if (capsuleRoomId) {
        return (
            <div>
                <MemoryCapsule
                    roomId={capsuleRoomId}
                    onBack={() => setCapsuleRoomId(null)}
                />
            </div>
        );
    }

    return (
        <div>
            {/* ═══ CREATE ROOM MODAL ═══ */}
            {showCreateModal && (
                <div className="tm-overlay show" onClick={(e) => { if ((e.target as HTMLElement).classList.contains('tm-overlay')) setShowCreateModal(false); }}>
                    <div className="tm-modal" style={{ maxWidth: 480 }}>
                        <div className="tm-modal-head" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div className="tm-modal-title">Create a Desert Room 🏕️</div>
                            <div style={{ fontSize: 13, color: 'var(--tm-muted)', marginTop: 4 }}>Set up a private space to plan your trip together</div>
                        </div>
                        <div className="tm-modal-body">
                            <div className="tm-form-group">
                                <label className="tm-form-label">Room Name</label>
                                <input
                                    className="tm-form-input"
                                    placeholder="e.g. Jaisalmer Fort Trek Crew"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    maxLength={80}
                                />
                            </div>
                            <div className="tm-form-group">
                                <label className="tm-form-label">Room Type</label>
                                <div className="tm-option-grid">
                                    {DURATIONS.slice(0, 3).map(d => (
                                        <div
                                            key={d.id}
                                            className={`tm-option ${formDuration === d.id ? 'selected' : ''}`}
                                            onClick={() => setFormDuration(d.id)}
                                        >
                                            <div className="tm-option-icon">{d.icon}</div>
                                            <div className="tm-option-name">{d.label.split(' ')[0]}</div>
                                            <div className="tm-option-desc">{d.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="tm-form-group">
                                <label className="tm-form-label">Destination</label>
                                <select
                                    className="tm-form-select"
                                    value={formDest}
                                    onChange={(e) => setFormDest(e.target.value)}
                                >
                                    {DESTINATIONS.filter(d => d.id).map(d => (
                                        <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="tm-form-group">
                                <label className="tm-form-label">Add a note</label>
                                <input
                                    className="tm-form-input"
                                    placeholder="What's the plan for this room?"
                                    value={formDesc}
                                    onChange={(e) => setFormDesc(e.target.value)}
                                    maxLength={200}
                                />
                            </div>
                            {createError && (
                                <p style={{ fontSize: 11, color: 'var(--tm-red)', marginTop: 8 }}>{createError}</p>
                            )}
                        </div>
                        <div className="tm-modal-footer">
                            <button className="tm-modal-cancel-btn" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>
                                Cancel
                            </button>
                            <button
                                className="tm-modal-submit-btn"
                                onClick={handleCreate}
                                disabled={creating || !formTitle.trim() || formTitle.trim().length < 3}
                                style={{ opacity: creating || !formTitle.trim() ? 0.5 : 1 }}
                            >
                                {creating ? 'Creating...' : '🏕️ Create Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ROOMS LAYOUT ═══ */}
            <div className="tm-rooms-layout">
                <div>
                    {/* Hero */}
                    <div className="tm-hero" style={{ padding: '24px 30px', marginBottom: 22 }}>
                        <svg viewBox="0 0 900 80" preserveAspectRatio="none" fill="rgba(240,213,168,.9)">
                            <path d="M0,60 Q300,10 500,55 Q700,90 900,30 L900,80 L0,80Z" />
                        </svg>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div className="tm-hero-eyebrow">🏕️ Private · Ephemeral · Magical</div>
                            <div className="tm-hero-heading" style={{ fontSize: 30 }}>
                                Desert <em>Rooms</em>
                            </div>
                            <div className="tm-hero-desc" style={{ fontSize: 12 }}>
                                Private chat rooms that vanish like a desert sunset. Create multiple rooms for different travel plans.
                            </div>
                        </div>
                    </div>

                    {/* Create Room Button */}
                    {session?.user && (
                        <button className="tm-create-room-btn" onClick={() => setShowCreateModal(true)}>
                            <div className="tm-create-room-icon">+</div>
                            <div>
                                <div className="tm-create-room-title">Create New Desert Room</div>
                                <div className="tm-create-room-sub">Private, quick connect, or day-long — you choose</div>
                            </div>
                            <span style={{ fontSize: 20, color: 'var(--tm-muted2)', marginLeft: 'auto' }}>→</span>
                        </button>
                    )}

                    {/* Filter */}
                    <div className="tm-filter-row" style={{ marginBottom: 16 }}>
                        {DESTINATIONS.map(dest => (
                            <button
                                key={dest.id}
                                className={`tm-filter-pill ${selectedDest === dest.id ? 'active' : ''}`}
                                onClick={() => { setSelectedDest(dest.id); setLoading(true); }}
                                style={{ padding: '5px 12px', fontSize: 11 }}
                            >
                                {dest.emoji} {dest.label}
                            </button>
                        ))}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div>
                            {[1, 2].map(i => (
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

                    {/* Room List */}
                    {!loading && (
                        <div>
                            {rooms.length > 0 ? (
                                rooms.map((room, i) => {
                                    const timeLeft = getTimeRemaining(room.expiresAt);
                                    const isExpired = timeLeft === 'Expired';
                                    const isFull = room.currentMembers >= room.maxMembers;
                                    const name = room.creatorName || room.creator_name;

                                    return (
                                        <div
                                            key={room.id}
                                            className={`tm-room-card ${!isExpired ? 'active-room' : ''}`}
                                            style={{ animation: `tm-fadeUp .35s ease ${i * 0.08}s both`, opacity: isExpired ? 0.5 : 1 }}
                                        >
                                            <div className="tm-room-head">
                                                <div className="tm-room-icon" style={{
                                                    background: room.duration === '1h' ? 'rgba(92,138,98,.15)' :
                                                        room.duration === '24h' ? 'rgba(212,150,10,.12)' : 'rgba(200,75,30,.1)'
                                                }}>
                                                    {room.duration === '1h' ? '⚡' : room.duration === '24h' ? '🐪' : '🏕️'}
                                                </div>
                                                <div>
                                                    <div className="tm-room-name">{room.title}</div>
                                                    <div className="tm-room-meta">{room.duration} · {room.destination}</div>
                                                </div>
                                                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                    <span className={`tm-room-badge tm-room-badge-active`}>
                                                        {isExpired ? '⏰ Ended' : '🔓 Open'}
                                                    </span>
                                                    {/* @ts-ignore */}
                                                    {!isExpired && room.activeMembers > 0 && (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded-md border border-green-100/50">
                                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                            {/* @ts-ignore */}
                                                            <span className="text-[9px] font-bold text-green-700">{room.activeMembers} ONLINE</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="tm-room-timer">
                                                <div>
                                                    <div className="tm-room-timer-label">{isExpired ? 'Ended' : 'Closes in'}</div>
                                                    <div className="tm-room-timer-display">{timeLeft}</div>
                                                </div>
                                                <div className="tm-room-members">
                                                    <div className="tm-room-member-av" style={{ background: getAvatarColor(name) }}>
                                                        {room.creatorImage ? (
                                                            <img src={room.creatorImage} alt="" />
                                                        ) : (
                                                            getInitials(name)
                                                        )}
                                                    </div>
                                                    {room.currentMembers > 1 && (
                                                        <div className="tm-room-member-av" style={{ background: 'var(--tm-muted2)', fontSize: 9 }}>
                                                            +{room.currentMembers - 1}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {room.description && (
                                                <div style={{ padding: '0 18px 12px', fontSize: 12, color: 'var(--tm-muted)', fontStyle: 'italic' }}>
                                                    &ldquo;{room.description}&rdquo;
                                                </div>
                                            )}

                                            <div className="tm-room-footer">
                                                {!isExpired ? (
                                                    <>
                                                        <button
                                                            className="tm-room-btn"
                                                            onClick={() => handleJoin(room.id)}
                                                            disabled={isFull || !session?.user}
                                                            style={{ opacity: isFull || !session?.user ? 0.5 : 1 }}
                                                        >
                                                            {isFull ? 'Full' : !session?.user ? '🔒 Login' : '💬 Open Chat'}
                                                        </button>
                                                        <button className="tm-room-btn-sec">⚙️</button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="tm-room-btn-sec"
                                                        onClick={() => setCapsuleRoomId(room.id)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        🏺 View Memory Capsule
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="tm-empty-state">
                                    <div className="tm-empty-icon">🏕️</div>
                                    <div className="tm-empty-title">No campfires burning</div>
                                    <div className="tm-empty-desc">Be the first to light one!</div>
                                    {session?.user && (
                                        <button className="tm-hero-btn" onClick={() => setShowCreateModal(true)} style={{ marginTop: 16 }}>
                                            + Create a Room
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══ SIDEBAR ═══ */}
                <div>
                    {/* Memory Capsules */}
                    <div className="tm-rooms-sidebar-card">
                        <div className="tm-rooms-sidebar-head">🏺 Memory Capsules</div>
                        <div className="tm-capsule">
                            <span style={{ fontSize: 22 }}>🏺</span>
                            <div>
                                <div className="tm-capsule-name">Recent Adventures</div>
                                <div className="tm-capsule-desc">📍 Expired rooms become memories</div>
                            </div>
                            <button className="tm-capsule-btn">View</button>
                        </div>
                    </div>

                    {/* Safety */}
                    <div className="tm-rooms-sidebar-card">
                        <div className="tm-rooms-sidebar-head">🔐 Safety</div>
                        <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--tm-ink2)', lineHeight: 2 }}>
                            <div>✅ Anonymous until both agree</div>
                            <div>🛡️ Report & instant close</div>
                            <div>⏰ Auto-expire for privacy</div>
                            <div>✅ Verified badge available</div>
                        </div>
                    </div>
                </div>
            </div>

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
                        Sign in to create or join rooms 🏕️
                    </p>
                </div>
            )}
        </div>
    );
}
