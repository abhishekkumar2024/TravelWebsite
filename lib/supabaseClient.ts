import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // In dev, log a clear warning; in production this should be configured.
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
            '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Supabase features will not work.'
        );
    }
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            // Persist session to localStorage so it survives page refreshes
            persistSession: true,
            // Automatically refresh the access token before it expires
            autoRefreshToken: true,
            // Detect OAuth callback tokens in the URL hash (for Google login etc.)
            detectSessionInUrl: true,
            // Unique storage key per browser — ensures each device maintains its own
            // independent session. Logging out on device A won't affect device B.
            storageKey: 'camelthar-auth',
            // Use localStorage (default) for session storage
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
    }
);

