'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/components/LanguageProvider';

// Configuration: 5 minutes of total inactivity before logout
const TIMEOUT_DURATION = 10 * 60 * 1000;
// Show warning 2 minutes before the actual timeout
const WARNING_DURATION = 2 * 60 * 1000;

/**
 * SessionTimeout Component
 * 
 * Automatically logs out the user after a period of inactivity.
 * Shows a warning modal before the session actually expires.
 */
export default function SessionTimeout() {
    const { t } = useLanguage();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(WARNING_DURATION / 1000);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            setShowWarning(false);
            setIsLoggedIn(false);

            // Clear any pending draft indicators if needed, 
            // though useDraft takes care of itself.

            // We don't necessarily need a hard reload here as 
            // our components listen to onAuthStateChange
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, []);

    const resetTimer = useCallback(() => {
        // Clear all existing timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        setShowWarning(false);

        if (!isLoggedIn) return;

        // Set the warning timer
        // This will fire 2 minutes before the total 15 minutes is up
        warningRef.current = setTimeout(() => {
            setShowWarning(true);
            setTimeLeft(WARNING_DURATION / 1000);

            // Start the visual countdown for the user
            countdownRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        }, TIMEOUT_DURATION - WARNING_DURATION);

        // Set the absolute logout timer
        timeoutRef.current = setTimeout(logout, TIMEOUT_DURATION);
    }, [isLoggedIn, logout]);

    // Track authentication state
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const isNowLoggedIn = !!session;
            setIsLoggedIn(isNowLoggedIn);

            // If user just logged in, start the timer
            if (isNowLoggedIn) {
                resetTimer();
            }
        });

        return () => subscription.unsubscribe();
    }, [resetTimer]);

    // Handle user activity listeners
    useEffect(() => {
        if (!isLoggedIn) return;

        // Common events that indicate user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        const handleActivity = () => {
            // Only reset if we're not currently showing the warning
            // This prevents a user from "fixing" the timeout just by moving the mouse 
            // after the warning appeared - they must click "Stay Logged In"
            if (!showWarning) {
                resetTimer();
            }
        };

        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        // Initialize timer
        resetTimer();

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningRef.current) clearTimeout(warningRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [isLoggedIn, resetTimer, showWarning]);

    // If not logged in or no warning to show, don't render anything
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
                        onClick={resetTimer}
                        className="w-full px-6 py-4 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        {t('Yes, Keep Me Logged In', 'हाँ, मुझे लॉग इन रखें')}
                    </button>

                    <button
                        onClick={logout}
                        className="w-full px-6 py-3 border-2 border-gray-100 text-gray-400 font-semibold rounded-2xl hover:bg-gray-50 hover:text-gray-600 transition-all"
                    >
                        {t('Logout Now', 'अभी लॉग आउट करें')}
                    </button>
                </div>
            </div>
        </div>
    );
}
