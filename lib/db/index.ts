// This module MUST only run on the server.
// Next.js will throw a build error if a 'use client' component imports this.
import 'server-only';



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
