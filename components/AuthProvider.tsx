/**
 * NextAuth Session Provider
 * 
 * Wraps the app with NextAuth's SessionProvider so that
 * useSession() works in all client components.
 * 
 * This replaces the implicit Supabase auth context.
 */

'use client';

import { SessionProvider } from 'next-auth/react';

interface AuthProviderProps {
    children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
    return (
        <SessionProvider
            // Re-fetch session every 5 minutes (for session timeout)
            refetchInterval={5 * 60}
            // Re-fetch when window gains focus
            refetchOnWindowFocus={true}
        >
            {children}
        </SessionProvider>
    );
}
