/**
 * Multi-Database Master-Slave Architecture — Type Definitions
 * 
 * Every database provider must implement the DBProvider interface.
 * The router uses these types to manage read/write splitting, health
 * checking, and replication.
 */

// ─── Provider Types ──────────────────────────────────────────────

export type ProviderRole = 'master' | 'slave';
export type ProviderStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface DBProviderConfig {
    /** Unique identifier for this provider */
    name: string;
    /** Connection URL */
    connectionUrl: string;
    /** Role in the cluster */
    role: ProviderRole;
    /** Lower = preferred for reads. Master defaults to 0. */
    priority: number;
    /** Whether this provider is enabled */
    enabled: boolean;
}

export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

/**
 * Contract that every database provider must implement.
 * This is the core abstraction that allows plugging in any database.
 */
export interface DBProvider {
    /** Unique name for this provider (e.g., 'neon', 'supabase') */
    readonly name: string;

    /** Current role — can change during failover */
    role: ProviderRole;

    /** Current health status */
    status: ProviderStatus;

    /** Priority for read routing (lower = preferred) */
    readonly priority: number;

    /** Last known latency in ms */
    latency: number;

    /** Consecutive failure count for health checking */
    failureCount: number;

    /** Consecutive success count for recovery detection */
    successCount: number;

    /**
     * Execute a read query (SELECT).
     * Returns typed rows.
     */
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;

    /**
     * Execute a write operation (INSERT/UPDATE/DELETE).
     * Returns the affected row count and optionally the first returned row.
     */
    execute<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;

    /**
     * Health check — can this provider respond within the timeout?
     * Should execute a simple `SELECT 1` or equivalent.
     */
    ping(): Promise<boolean>;

    /**
     * Get current connection latency in ms.
     */
    getLatency(): Promise<number>;

    /**
     * Gracefully close connections.
     */
    disconnect(): Promise<void>;
}

// ─── Router Types ────────────────────────────────────────────────

export type QueryType = 'read' | 'write';

export interface RouterOptions {
    /** Enable sync engine (replication to slaves after writes) */
    syncEnabled: boolean;
    /** Enable health checking */
    healthCheckEnabled: boolean;
    /** After a write, route reads to master for this many ms (sticky reads) */
    stickyReadDurationMs: number;
}

// ─── Health Check Types ──────────────────────────────────────────

export interface HealthCheckConfig {
    /** How often to ping providers (ms) */
    pingIntervalMs: number;
    /** How many consecutive failures before marking unhealthy */
    failureThreshold: number;
    /** How many consecutive successes before marking healthy again */
    recoveryThreshold: number;
    /** Timeout for each ping (ms) */
    timeoutMs: number;
}

// ─── Sync Types ──────────────────────────────────────────────────

export interface SyncQueueEntry {
    id: string;
    sql: string;
    params: any[];
    timestamp: number;
    status: 'pending' | 'synced' | 'failed';
    retryCount: number;
    targetProvider: string;
}

export interface SyncConfig {
    /** Max retries for a failed sync entry */
    maxRetries: number;
    /** Delay between retries (ms) */
    retryDelayMs: number;
    /** Clean up synced entries older than this (ms) */
    cleanupAfterMs: number;
}

// ─── Event Types ─────────────────────────────────────────────────

export type DBEventType =
    | 'provider:healthy'
    | 'provider:unhealthy'
    | 'provider:promoted'
    | 'provider:demoted'
    | 'sync:success'
    | 'sync:failed'
    | 'router:failover'
    | 'router:recovery';

export interface DBEvent {
    type: DBEventType;
    provider: string;
    timestamp: number;
    details?: any;
}

export type DBEventListener = (event: DBEvent) => void;
