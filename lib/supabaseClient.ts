import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();
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
    "https://lvyabpenpuizwzwzswse.supabase.co" || '',
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWFicGVucHVpend6d3pzd3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDgxNTMsImV4cCI6MjA4NTA4NDE1M30.bq1O6ksPhxRFFEFmsNxbxH9boPlf2ebISO4jiHlHwj8" || ''
);

