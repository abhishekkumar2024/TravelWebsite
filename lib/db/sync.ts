/**
 * Sync Engine
 * 
 * Handles replication of writes from master to all slaves.
 * 
 * Two modes:
 * 1. After-write hook: Immediately replicates each write to slaves (async, non-blocking)
 * 2. Queue-based: Stores writes in a queue, processes in background (for when slaves are down)
 * 
 * The sync is eventual-consistency — slaves may be slightly behind master.
 */

import { DBProvider, SyncConfig, SyncQueueEntry, DBEventListener, DBEvent } from './types';

const DEFAULT_CONFIG: SyncConfig = {
    maxRetries: 5,
    retryDelayMs: 5_000,
    cleanupAfterMs: 60 * 60 * 1000, // 1 hour
};

export class SyncEngine {
    private queue: SyncQueueEntry[] = [];
    private slaves: Map<string, DBProvider> = new Map();
    private config: SyncConfig;
    private processingInterval: ReturnType<typeof setInterval> | null = null;
    private listeners: DBEventListener[] = [];
    private enabled: boolean;

    constructor(config: Partial<SyncConfig> = {}, enabled: boolean = true) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.enabled = enabled;
    }

    // ─── Slave Management ────────────────────────────────────────

    registerSlave(provider: DBProvider): void {
        this.slaves.set(provider.name, provider);
    }

    removeSlave(name: string): void {
        this.slaves.delete(name);
    }

    updateSlaves(providers: DBProvider[]): void {
        this.slaves.clear();
        for (const p of providers) {
            if (p.role === 'slave' && p.status === 'healthy') {
                this.slaves.set(p.name, p);
            }
        }
    }

    // ─── Event System ────────────────────────────────────────────

    addEventListener(listener: DBEventListener): void {
        this.listeners.push(listener);
    }

    private emit(event: DBEvent): void {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (err) {
                console.error('[SyncEngine] Event listener error:', err);
            }
        }
    }

    // ─── After-Write Hook ────────────────────────────────────────

    /**
     * Called after every successful write to master.
     * Asynchronously replicates the write to all healthy slaves.
     * Non-blocking — does not slow down the original write.
     */
    async afterWrite(sql: string, params: any[] = []): Promise<void> {
        if (!this.enabled) return;

        // Fire and forget — don't await
        this.replicateToSlaves(sql, params).catch(err => {
            console.warn('[SyncEngine] Background replication error:', err);
        });
    }

    /**
     * Replicate a write to all registered slaves.
     */
    private async replicateToSlaves(sql: string, params: any[]): Promise<void> {
        if (this.slaves.size === 0) return;

        const promises = Array.from(this.slaves.entries()).map(
            async ([name, slave]) => {
                try {
                    await slave.execute(sql, params);
                    this.emit({
                        type: 'sync:success',
                        provider: name,
                        timestamp: Date.now(),
                    });
                } catch (error: any) {
                    console.warn(`[SyncEngine] Failed to sync to ${name}: ${error.message}`);
                    // Add to queue for retry
                    this.enqueue(sql, params, name);
                    this.emit({
                        type: 'sync:failed',
                        provider: name,
                        timestamp: Date.now(),
                        details: { error: error.message },
                    });
                }
            }
        );

        await Promise.allSettled(promises);
    }

    // ─── Queue Management ────────────────────────────────────────

    /**
     * Add a failed sync operation to the retry queue.
     */
    private enqueue(sql: string, params: any[], targetProvider: string): void {
        const entry: SyncQueueEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sql,
            params,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
            targetProvider,
        };
        this.queue.push(entry);
    }

    /**
     * Process the retry queue — attempts to sync pending entries.
     */
    async processQueue(): Promise<void> {
        if (this.queue.length === 0) return;

        const pending = this.queue.filter(e => e.status === 'pending');
        if (pending.length === 0) return;

        for (const entry of pending) {
            const slave = this.slaves.get(entry.targetProvider);

            // Skip if slave is not registered or unhealthy
            if (!slave || slave.status !== 'healthy') {
                entry.retryCount++;
                if (entry.retryCount >= this.config.maxRetries) {
                    entry.status = 'failed';
                    console.error(`[SyncEngine] ❌ Giving up on sync entry ${entry.id} after ${entry.retryCount} retries`);
                }
                continue;
            }

            try {
                await slave.execute(entry.sql, entry.params);
                entry.status = 'synced';
                this.emit({
                    type: 'sync:success',
                    provider: entry.targetProvider,
                    timestamp: Date.now(),
                    details: { fromQueue: true, entryId: entry.id },
                });
            } catch (error: any) {
                entry.retryCount++;
                if (entry.retryCount >= this.config.maxRetries) {
                    entry.status = 'failed';
                    console.error(`[SyncEngine] ❌ Sync entry ${entry.id} permanently failed: ${error.message}`);
                }
            }
        }

        // Cleanup old entries
        this.cleanup();
    }

    /**
     * Remove old synced/failed entries from the queue.
     */
    private cleanup(): void {
        const cutoff = Date.now() - this.config.cleanupAfterMs;
        this.queue = this.queue.filter(
            e => e.status === 'pending' || e.timestamp > cutoff
        );
    }

    // ─── Background Processing ───────────────────────────────────

    /**
     * Start background queue processing.
     */
    start(): void {
        if (this.processingInterval) return;

        this.processingInterval = setInterval(() => {
            this.processQueue().catch(err =>
                console.error('[SyncEngine] Queue processing error:', err)
            );
        }, this.config.retryDelayMs);
    }

    /**
     * Stop background processing.
     */
    stop(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    // ─── Status ──────────────────────────────────────────────────

    getQueueStatus(): { pending: number; synced: number; failed: number; total: number } {
        return {
            pending: this.queue.filter(e => e.status === 'pending').length,
            synced: this.queue.filter(e => e.status === 'synced').length,
            failed: this.queue.filter(e => e.status === 'failed').length,
            total: this.queue.length,
        };
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}
