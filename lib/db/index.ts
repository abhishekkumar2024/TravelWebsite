/**
 * DB Module — Public API
 *
 * Import everything from here:
 *   import { db } from '@/lib/db';
 *   import { NeonProvider } from '@/lib/db';
 *
 * NOTE: This module is safe to import in Server Components and API routes.
 * The DBRouter.init() silently skips initialization on the client side
 * (typeof window !== 'undefined'), so no env vars are ever read in the browser.
 */


export { db, DBRouter } from './router';
export { NeonProvider } from './providers/neon';
export { SupabaseProvider } from './providers/supabase';
export { BaseProvider } from './providers/base';
export { HealthChecker } from './health';
export { SyncEngine } from './sync';
export type {
    DBProvider,
    DBProviderConfig,
    ProviderRole,
    ProviderStatus,
    QueryResult,
    QueryType,
    RouterOptions,
    HealthCheckConfig,
    SyncConfig,
    SyncQueueEntry,
    DBEvent,
    DBEventType,
    DBEventListener,
} from './types';
