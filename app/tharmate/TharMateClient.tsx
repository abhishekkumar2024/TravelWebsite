'use client';

/**
 * TharMateClient — V3 Premium Desert-Themed Layout
 * 
 * Full-width sidebar + main area layout matching tharmate-v3.html:
 *   - Desktop: Sidebar (280px) + Main with topbar
 *   - Mobile: Bottom nav + sticky header
 *   - Warm desert palette (cream, terracotta, gold)
 *   - Playfair Display + DM Sans typography
 */

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import FindCompanionTab from './components/FindCompanionTab';
import PlacePulseTab from './components/PlacePulseTab';
import DesertRoomsTab from './components/DesertRoomsTab';


type TharMateTab = 'companion' | 'pulse' | 'room';

const TABS: { id: TharMateTab; label: string; icon: string; chipCount?: string; chipGreen?: boolean }[] = [
    { id: 'companion', label: 'Find Companion', icon: '🤝', chipCount: '12' },
    { id: 'pulse', label: 'Place Pulse', icon: '🌍', chipCount: '🔴', chipGreen: true },
    { id: 'room', label: 'Desert Rooms', icon: '🏕️', chipCount: '3' },
];



const TOPBAR_DATA: Record<TharMateTab, { title: string; sub: string }> = {
    companion: { title: 'Find Your <em>TharMate</em>', sub: 'travelers looking for companions across Rajasthan' },
    pulse: { title: 'Place <em>Pulse</em>', sub: 'Real-time feed from Rajasthan travelers' },
    room: { title: 'Desert <em>Rooms</em>', sub: 'Active rooms · Create multiple private rooms' },
};

export default function TharMateClient() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<TharMateTab>('companion');
    const [onlineCount, setOnlineCount] = useState(0);
    const [loginLoading, setLoginLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeCity, setActiveCity] = useState('');

    useEffect(() => setMounted(true), []);

    // ─── Heartbeat ──────────────────────────────────────────────
    useEffect(() => {
        const fetchOnline = async () => {
            try {
                const res = await fetch('/api/tharmate/heartbeat');
                if (res.ok) {
                    const data = await res.json();
                    setOnlineCount(data.online || 0);
                }
            } catch { }
        };
        fetchOnline();

        if (session?.user) {
            const sendHeartbeat = async () => {
                try {
                    const res = await fetch('/api/tharmate/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ destination: 'general' }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.online) setOnlineCount(data.online);
                    }
                } catch { }
            };
            sendHeartbeat();
            const interval = setInterval(sendHeartbeat, 25000);
            return () => clearInterval(interval);
        }
    }, [session]);

    const handleGoogleLogin = async () => {
        setLoginLoading(true);
        await signIn('google', { callbackUrl: '/tharmate/' });
    };

    const showPage = (id: TharMateTab) => {
        setActiveTab(id);
    };

    if (!mounted) return null;

    const topbar = TOPBAR_DATA[activeTab];

    return (
        <div className="tm-app">
            <div className="tm-layout">

                {/* ═══ SIDEBAR ═══ */}
                <aside className="tm-sidebar">
                    <div className="tm-sidebar-logo">
                        <div className="tm-logo-row">
                            <div className="tm-logo-icon">🐪</div>
                            <div>
                                <div className="tm-logo-name">TharMate</div>
                                <div className="tm-logo-tag">by CamelThar</div>
                            </div>
                        </div>
                        <div className="tm-online-pill">
                            <span className="tm-online-dot"></span>
                            {onlineCount || 247} online now
                        </div>
                    </div>

                    <nav className="tm-snav">
                        <div className="tm-snav-label">Explore</div>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`tm-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => showPage(tab.id)}
                            >
                                <span className="tm-nav-btn-icon">{tab.icon}</span>
                                {tab.label}
                                {tab.chipCount && (
                                    <span className={`tm-nav-chip ${tab.chipGreen ? 'green' : ''}`}>
                                        {tab.chipCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>


                    <div className="tm-sidebar-cta">
                        {session?.user ? (
                            <button className="tm-cta-btn" onClick={() => showPage('companion')}>
                                + Post My Travel Plan
                            </button>
                        ) : (
                            <button className="tm-cta-btn" onClick={handleGoogleLogin} disabled={loginLoading}>
                                {loginLoading ? 'Signing in...' : '🔑 Sign in to Get Started'}
                            </button>
                        )}
                    </div>
                </aside>

                {/* ═══ MAIN ═══ */}
                <div className="tm-main">

                    {/* Mobile Header */}
                    <div className="tm-mob-head">
                        <span style={{ fontSize: 21 }}>🐪</span>
                        <span className="tm-mob-logo">TharMate</span>
                        <span className="tm-mob-online">🟢 {onlineCount || 247} online</span>
                        {session?.user ? (
                            <div className="tm-user-avatar" style={{ width: 32, height: 32, marginLeft: 8 }}>
                                {session.user.image ? (
                                    <img src={session.user.image} alt="" />
                                ) : (
                                    <div className="tm-user-avatar-fallback">
                                        {(session.user.name || 'U')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button className="tm-login-btn" onClick={handleGoogleLogin} disabled={loginLoading} style={{ marginLeft: 8, padding: '5px 10px', fontSize: 11 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in
                            </button>
                        )}
                    </div>

                    {/* Topbar */}
                    <div className="tm-topbar">
                        <div>
                            <div className="tm-tb-title" dangerouslySetInnerHTML={{ __html: topbar.title }} />
                            <div className="tm-tb-sub">{onlineCount || 247} {topbar.sub}</div>
                        </div>
                        <div className="tm-tb-right">
                            {session?.user ? (
                                <div className="tm-online-pill" style={{ fontSize: 11 }}>
                                    <span className="tm-online-dot"></span>
                                    {onlineCount || 247} online
                                </div>
                            ) : (
                                <button className="tm-login-btn" onClick={handleGoogleLogin} disabled={loginLoading}>
                                    <svg width="14" height="14" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="tm-content">
                        <div className="tm-page">
                            {activeTab === 'companion' && <FindCompanionTab session={session} activeCity={activeCity} setActiveCity={setActiveCity} />}
                            {activeTab === 'pulse' && <PlacePulseTab session={session} />}
                            {activeTab === 'room' && <DesertRoomsTab session={session} />}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Mobile Bottom Nav ═══ */}
            <nav className="tm-mob-nav">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tm-mob-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => showPage(tab.id)}
                    >
                        <span className="tm-mob-btn-icon">{tab.icon}</span>
                        <span className="tm-mob-btn-label">{tab.label.split(' ').pop()}</span>
                    </button>
                ))}
                {session?.user && (
                    <button className="tm-mob-btn" onClick={() => showPage('companion')}>
                        <span className="tm-mob-btn-icon">➕</span>
                        <span className="tm-mob-btn-label">Post Plan</span>
                    </button>
                )}
            </nav>

            {/* ═══ Bottom Login Bar (not logged in, mobile) ═══ */}
            {!session?.user && (
                <div className="tm-bottom-login" style={{ display: 'none' }}>
                    {/* Shown only on mobile via CSS if needed */}
                    <button className="tm-bottom-login-btn" onClick={handleGoogleLogin} disabled={loginLoading}>
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loginLoading ? 'Signing in...' : 'Sign in with Google to get started'}
                    </button>
                    <p className="tm-bottom-login-hint">Post plans, chat, and connect with fellow travelers</p>
                </div>
            )}
        </div>
    );
}
