/**
 * DB Router — Main Entry Point
 * 
 * This is the heart of the multi-database architecture.
 * All database operations go through the router, which handles:
 * 
 * 1. Read/Write splitting (writes → master, reads → any healthy provider)
 * 2. Health-aware routing (skip unhealthy providers)
 * 3. Sticky reads (after a write, reads go to master for a short window)
 * 4. Auto-failover (if master dies, promote a slave)
 * 5. Replication (after each write, sync to slaves)
 * 
 * Usage:
 *   import { db } from '@/lib/db/router';
 *   const blogs = await db.query('SELECT * FROM blogs WHERE status = $1', ['published']);
 *   await db.execute('INSERT INTO blogs (title_en) VALUES ($1)', ['My Blog']);
 */

import { DBProvider, QueryResult, RouterOptions, DBEvent, DBEventListener } from './types';

import { HealthChecker } from './health';
import { SyncEngine } from './sync';
import { NeonProvider } from './providers/neon';
import { SupabaseProvider } from './providers/supabase';

const DEFAULT_OPTIONS: RouterOptions = {
    syncEnabled: process.env.DB_SYNC_ENABLED === 'true',
    healthCheckEnabled: true,
    stickyReadDurationMs: 5_000, // 5 seconds after write, reads go to master
};

class DBRouter {
    private healthChecker: HealthChecker;
    private syncEngine: SyncEngine;
    private options: RouterOptions;
    private listeners: DBEventListener[] = [];
    private initialized = false;

    /** Timestamp of the last write — used for sticky reads */
    private lastWriteAt: number = 0;

    constructor(options: Partial<RouterOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.healthChecker = new HealthChecker();
        this.syncEngine = new SyncEngine({}, this.options.syncEnabled);

        // Forward events from health checker and sync engine
        this.healthChecker.addEventListener((event) => this.handleEvent(event));
        this.syncEngine.addEventListener((event) => this.handleEvent(event));
    }

    // ─── Initialization ──────────────────────────────────────────

    /**
     * Initialize the router with database providers.
     * 
     * Role assignment (configurable via env vars):
     *   NEON_DATABASE_URL          → Neon = MASTER  (primary, always active)
     *   SUPABASE_DATABASE_URL      → Supabase connection URL
     *   SUPABASE_SLAVE_ENABLED     → Set to 'true' to use Supabase as slave/failover
     * 
     * If SUPABASE_SLAVE_ENABLED is not 'true', Supabase is never registered,
     * even if SUPABASE_DATABASE_URL is set. This prevents accidental slave
     * registration in environments that don't need it.
     */
    init(): void {
        if (this.initialized) return;

        // Guard: never run DB initialization in a browser environment.
        // Client components may import from '@/lib/db' (e.g. for types),
        // but actual DB connections must only be established server-side.
        if (typeof window !== 'undefined') {
            return; // Silent skip — no error, no env var reads
        }

        // ── MASTER: Neon (always primary) ──────────────────────────
        const neonUrl = process.env.NEON_DATABASE_URL;
        if (neonUrl) {
            try {
                const neonProvider = new NeonProvider(neonUrl, 'master', 0);
                this.addProvider(neonProvider);
                console.log('[DBRouter] ✅ Neon registered as MASTER (priority 0)');
            } catch (err: any) {
                console.error(`[DBRouter] ❌ Neon master failed to register: ${err.message}`);
            }
        } else {
            console.error('[DBRouter] ❌ NEON_DATABASE_URL is not set — no master available!');
        }

        // ── SLAVE: Supabase (opt-in via SUPABASE_SLAVE_ENABLED=true) ─
        const slaveEnabled = process.env.SUPABASE_SLAVE_ENABLED === 'true';
        const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

        if (slaveEnabled && supabaseUrl) {
            try {
                const supabaseProvider = new SupabaseProvider(supabaseUrl, 'slave', 10);
                this.addProvider(supabaseProvider);
                console.log('[DBRouter] ✅ Supabase registered as SLAVE/FAILOVER (priority 10)');
            } catch (err: any) {
                console.warn(`[DBRouter] ⚠️ Supabase slave not registered: ${err.message}`);
            }
        } else if (slaveEnabled && !supabaseUrl) {
            console.warn('[DBRouter] ⚠️ SUPABASE_SLAVE_ENABLED=true but SUPABASE_DATABASE_URL is not set.');
        } else {
            console.log('[DBRouter] ℹ️ Supabase slave disabled (set SUPABASE_SLAVE_ENABLED=true to enable).');
        }

        // Start health checking (only in server environments)
        if (this.options.healthCheckEnabled && typeof window === 'undefined') {
            this.healthChecker.start();
        }

        // Start sync engine if enabled and slaves are registered
        if (this.options.syncEnabled) {
            this.syncEngine.start();
        }

        this.initialized = true;
    }

    /**
     * Add a database provider to the router.
     */
    addProvider(provider: DBProvider): void {
        this.healthChecker.registerProvider(provider);
        if (provider.role === 'slave') {
            this.syncEngine.registerSlave(provider);
        }
    }

    /**
     * Remove a provider from the router.
     */
    removeProvider(name: string): void {
        this.healthChecker.removeProvider(name);
        this.syncEngine.removeSlave(name);
    }

    // ─── Query Methods ───────────────────────────────────────────

    /**
     * Execute a READ query (SELECT).
     * Routes to the best healthy provider, considering sticky reads.
     */
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        this.ensureInitialized();

        const provider = this.selectReadProvider();
        if (!provider) {
            throw new Error('[DBRouter] No healthy providers available for read');
        }

        try {
            return await provider.query<T>(sql, params);
        } catch (error) {
            // If the selected provider fails, try fallback
            const fallback = this.getFallbackProvider(provider.name);
            if (fallback) {
                console.warn(`[DBRouter] Read failed on ${provider.name}, falling back to ${fallback.name}`);
                return await fallback.query<T>(sql, params);
            }
            throw error;
        }
    }

    /**
     * Execute a WRITE operation (INSERT/UPDATE/DELETE).
     * Always routes to master. Triggers async replication to slaves.
     */
    async execute<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        this.ensureInitialized();

        const master = this.healthChecker.getMaster();
        if (!master) {
            throw new Error('[DBRouter] No master provider available for write');
        }

        if (master.status === 'unhealthy') {
            throw new Error(`[DBRouter] Master (${master.name}) is unhealthy. Write rejected.`);
        }

        // Execute on master
        const result = await master.execute<T>(sql, params);

        // Mark last write time for sticky reads
        this.lastWriteAt = Date.now();

        // Async replicate to slaves (non-blocking)
        this.syncEngine.afterWrite(sql, params || []);

        return result;
    }

    /**
     * Execute a query that returns a single row or null.
     * Convenience method.
     */
    async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
        const result = await this.query<T>(sql, params);
        return result.rows[0] || null;
    }

    /**
     * Execute a write and return the first row (useful for INSERT ... RETURNING).
     * Convenience method.
     */
    async executeOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
        const result = await this.execute<T>(sql, params);
        return result.rows[0] || null;
    }

    // ─── Provider Selection ──────────────────────────────────────

    /**
     * Select the best provider for a read query.
     * 
     * Strategy:
     * 1. If within sticky read window → use master
     * 2. Otherwise → use lowest-latency healthy provider
     */
    private selectReadProvider(): DBProvider | null {
        // Sticky reads: after a recent write, route to master for consistency
        const timeSinceLastWrite = Date.now() - this.lastWriteAt;
        if (timeSinceLastWrite < this.options.stickyReadDurationMs) {
            const master = this.healthChecker.getMaster();
            if (master && master.status === 'healthy') {
                return master;
            }
        }

        // Get all healthy providers, sorted by latency
        const healthy = this.healthChecker.getHealthyProviders();
        if (healthy.length > 0) {
            return healthy[0]; // Lowest latency
        }

        // Last resort: try master even if unknown status
        const master = this.healthChecker.getMaster();
        if (master) return master;

        return null;
    }

    /**
     * Get a fallback provider (any healthy provider except the failed one).
     */
    private getFallbackProvider(excludeName: string): DBProvider | null {
        const healthy = this.healthChecker.getHealthyProviders()
            .filter(p => p.name !== excludeName);

        return healthy[0] || null;
    }

    // ─── Event System ────────────────────────────────────────────

    addEventListener(listener: DBEventListener): void {
        this.listeners.push(listener);
    }

    private handleEvent(event: DBEvent): void {
        // Log important events
        if (event.type === 'router:failover') {
            console.warn(`[DBRouter] ⚠️ FAILOVER: New master is ${event.provider}`);
        }

        // Keep sync engine's slave list updated after role changes
        if (event.type === 'provider:promoted' || event.type === 'provider:demoted') {
            const providers = this.healthChecker.getAllProviders();
            this.syncEngine.updateSlaves(providers);
        }

        // Forward to external listeners
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (err) {
                console.error('[DBRouter] Event listener error:', err);
            }
        }
    }

    // ─── Status & Utilities ──────────────────────────────────────

    /**
     * Get current status of all providers and the sync queue.
     */
    getStatus() {
        return {
            providers: this.healthChecker.getStatus(),
            sync: this.syncEngine.getQueueStatus(),
            master: this.healthChecker.getMaster()?.name || 'none',
            initialized: this.initialized,
        };
    }

    /**
     * Gracefully shutdown the router.
     */
    async shutdown(): Promise<void> {
        this.healthChecker.stop();
        this.syncEngine.stop();

        for (const provider of this.healthChecker.getAllProviders()) {
            await provider.disconnect();
        }

        this.initialized = false;
    }

    private ensureInitialized(): void {
        // On the client side, skip gracefully — queries will fail
        // at the API/fetch layer before reaching here
        if (typeof window !== 'undefined') {
            return;
        }
        if (!this.initialized) {
            this.init();
        }
    }
}

// ─── Singleton Instance (Global for Next.js HMR) ──────────────────────────

// This prevents re-initializing the router on every code change in dev mode
const globalForDB = global as unknown as {
    dbRouter: DBRouter | undefined
};

/**
 * Global database router instance.
 */
export const dbInstance = globalForDB.dbRouter ?? new DBRouter();

if (process.env.NODE_ENV !== 'production') {
    globalForDB.dbRouter = dbInstance;
}

// Auto-initialize
dbInstance.init();

// Use a proxy to export as 'db' for cleaner usage
export const db = new Proxy(dbInstance, {
    get(target, prop) {
        const value = (target as any)[prop];
        if (typeof value === 'function') {
            return value.bind(target);
        }
        return value;
    },
});

export { DBRouter };
