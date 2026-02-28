'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/components/LanguageProvider';

// Configuration
const TIMEOUT_DURATION = 1 * 60 * 1000;   // 5 minutes of inactivity before logout
const WARNING_BEFORE = 60 * 1000;          // Show warning 60 seconds before logout
const ACTIVITY_THROTTLE = 30 * 1000;       // Only update activity timestamp every 30s
const LAST_ACTIVITY_KEY = 'camelthar-last-activity';

/**
 * SessionTimeout Component
 * 
 * Automatically logs out the user after 5 minutes of inactivity.
 * Shows a 60-second countdown warning before logging out.
 * 
 * How it works:
 * - Stores last activity timestamp in localStorage (cross-tab sync)
 * - A single interval checks every second whether the timeout has elapsed
 * - User activity (mouse, keyboard, scroll, touch) updates the timestamp
 * - Activity updates are throttled to avoid performance issues
 */
export default function SessionTimeout() {
    const { t } = useLanguage();
    const { status } = useSession();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);

    const isLoggedIn = status === 'authenticated';
    const showWarningRef = useRef(false);
    const lastActivityWriteRef = useRef(0);

    // Keep ref in sync with state (for use in event handlers without re-registering)
    showWarningRef.current = showWarning;

    // Record activity in localStorage (throttled)
    const recordActivity = useCallback(() => {
        // Don't reset if warning is showing — user must click "Stay Logged In"
        if (showWarningRef.current) return;

        const now = Date.now();
        // Throttle: only write to localStorage every ACTIVITY_THROTTLE ms
        if (now - lastActivityWriteRef.current < ACTIVITY_THROTTLE) return;

        lastActivityWriteRef.current = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }, []);

    // Handle "Stay Logged In" click
    const handleStayLoggedIn = useCallback(() => {
        const now = Date.now();
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        lastActivityWriteRef.current = now;
        setShowWarning(false);
        showWarningRef.current = false;
    }, []);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            await signOut({ redirect: false });
            setShowWarning(false);
            showWarningRef.current = false;
            localStorage.removeItem(LAST_ACTIVITY_KEY);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, []);

    // Main timer: single interval that checks inactivity every second
    useEffect(() => {
        if (!isLoggedIn) {
            setShowWarning(false);
            return;
        }

        // Initialize last activity on login
        if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
            localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }
        lastActivityWriteRef.current = Date.now();

        const checkInterval = setInterval(() => {
            const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
            const elapsed = Date.now() - lastActivity;
            const remaining = TIMEOUT_DURATION - elapsed;

            if (remaining <= 0) {
                // Time's up — log out
                clearInterval(checkInterval);
                signOut({ redirect: false }).then(() => {
                    setShowWarning(false);
                    showWarningRef.current = false;
                    localStorage.removeItem(LAST_ACTIVITY_KEY);
                });
            } else if (remaining <= WARNING_BEFORE) {
                // Show warning with countdown
                setShowWarning(true);
                showWarningRef.current = true;
                setTimeLeft(Math.ceil(remaining / 1000));
            } else {
                // Still active — no warning
                if (showWarningRef.current) {
                    setShowWarning(false);
                    showWarningRef.current = false;
                }
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [isLoggedIn]);

    // Register activity listeners
    useEffect(() => {
        if (!isLoggedIn) return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        // Note: 'mousemove' intentionally excluded — too frequent, hurts performance

        events.forEach((event) => {
            window.addEventListener(event, recordActivity, { passive: true });
        });

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, recordActivity);
            });
        };
    }, [isLoggedIn, recordActivity]);

    // Don't render unless we need to show the warning
    if (!showWarning || !isLoggedIn) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 shadow-2xl p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-t-8 border-desert-gold transform scale-100 transition-transform">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-desert-gold animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <h3 className="text-2xl font-extrabold text-royal-blue mb-4">
                    {t('Session Security Alert', 'सत्र सुरक्षा चेतावनी')}
                </h3>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    {t(
                        `For your security, you will be logged out in ${timeLeft} seconds due to inactivity. Would you like to stay logged in?`,
                        `आपकी सुरक्षा के लिए, निष्क्रियता के कारण आपको ${timeLeft} सेकंड में लॉग आउट कर दिया जाएगा। क्या आप लॉग इन रहना चाहते हैं?`
                    )}
                </p>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleStayLoggedIn}
                        className="w-full px-6 py-4 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        {t('Yes, Keep Me Logged In', 'हाँ, मुझे लॉग इन रखें')}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full px-6 py-3 border-2 border-gray-100 text-gray-400 font-semibold rounded-2xl hover:bg-gray-50 hover:text-gray-600 transition-all"
                    >
                        {t('Logout Now', 'अभी लॉग आउट करें')}
                    </button>
                </div>
            </div>
        </div>
    );
}
