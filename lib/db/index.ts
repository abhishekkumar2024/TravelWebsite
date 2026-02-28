/**
 * DB Module — Public API
 * 
 * Import everything from here:
 *   import { db } from '@/lib/db';
 *   import { NeonProvider } from '@/lib/db';
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
