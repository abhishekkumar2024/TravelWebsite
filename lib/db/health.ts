/**
 * Health Checker
 * 
 * Periodically pings all database providers and manages their health status.
 * Handles:
 * - Marking providers as healthy/unhealthy based on consecutive failures
 * - Auto-promoting a slave to master when master goes down
 * - Recovering the original master when it comes back online
 */

import { DBProvider, HealthCheckConfig, DBEvent, DBEventListener, ProviderStatus } from './types';

const DEFAULT_CONFIG: HealthCheckConfig = {
    pingIntervalMs: 30_000,      // Check every 30 seconds
    failureThreshold: 3,          // 3 consecutive fails = unhealthy
    recoveryThreshold: 2,         // 2 consecutive successes = healthy again
    timeoutMs: 5_000,             // 5 second timeout per ping
};

export class HealthChecker {
    private providers: Map<string, DBProvider> = new Map();
    private config: HealthCheckConfig;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private listeners: DBEventListener[] = [];

    /** The name of the original master (for re-promotion) */
    private originalMasterName: string | null = null;

    constructor(config: Partial<HealthCheckConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ─── Provider Management ─────────────────────────────────────

    registerProvider(provider: DBProvider): void {
        this.providers.set(provider.name, provider);
        if (provider.role === 'master' && !this.originalMasterName) {
            this.originalMasterName = provider.name;
        }
    }

    removeProvider(name: string): void {
        this.providers.delete(name);
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
                console.error('[HealthChecker] Event listener error:', err);
            }
        }
    }

    // ─── Health Check Logic ──────────────────────────────────────

    /**
     * Start periodic health checking.
     */
    start(): void {
        if (this.intervalId) return; // Already running

        // Run first check immediately
        this.checkAll();

        this.intervalId = setInterval(() => {
            this.checkAll();
        }, this.config.pingIntervalMs);
    }

    /**
     * Stop periodic health checking.
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Check all providers and update statuses.
     */
    async checkAll(): Promise<void> {
        const checks = Array.from(this.providers.values()).map(p => this.checkProvider(p));
        await Promise.allSettled(checks);

        // After checking all, handle failover/recovery
        this.handleFailover();
    }

    /**
     * Check a single provider's health.
     */
    private async checkProvider(provider: DBProvider): Promise<void> {
        try {
            // Ping with timeout
            const pingOk = await Promise.race([
                provider.ping(),
                new Promise<boolean>((_, reject) =>
                    setTimeout(() => reject(new Error('Ping timeout')), this.config.timeoutMs)
                ),
            ]);

            if (pingOk) {
                // Check if we should transition to healthy
                if (provider.status !== 'healthy' && provider.successCount >= this.config.recoveryThreshold) {
                    provider.status = 'healthy';
                    this.emit({
                        type: 'provider:healthy',
                        provider: provider.name,
                        timestamp: Date.now(),
                        details: { latency: provider.latency },
                    });
                } else if (provider.status === 'unknown') {
                    // First successful ping
                    provider.status = 'healthy';
                }
            }
        } catch {
            // Check if we should transition to unhealthy
            if (provider.failureCount >= this.config.failureThreshold) {
                if (provider.status !== 'unhealthy') {
                    provider.status = 'unhealthy';
                    console.error(`[HealthChecker] ❌ ${provider.name} is now UNHEALTHY (${provider.failureCount} consecutive failures)`);
                    this.emit({
                        type: 'provider:unhealthy',
                        provider: provider.name,
                        timestamp: Date.now(),
                        details: { failureCount: provider.failureCount },
                    });
                }
            }
        }
    }

    // ─── Failover Logic ──────────────────────────────────────────

    /**
     * Handle master failover and recovery.
     */
    private handleFailover(): void {
        const healthySlaves = this.getHealthySlaves();
        const master = this.getMaster();

        // Case 1: Master is unhealthy — promote best slave
        if (master && master.status === 'unhealthy' && healthySlaves.length > 0) {
            const bestSlave = healthySlaves[0]; // Lowest priority = best candidate
            this.promote(bestSlave);
        }

        // Case 2: Original master recovered — optionally re-promote
        if (this.originalMasterName) {
            const originalMaster = this.providers.get(this.originalMasterName);
            if (
                originalMaster &&
                originalMaster.status === 'healthy' &&
                originalMaster.role === 'slave'
            ) {
                // Re-promote original master
                this.promote(originalMaster);
            }
        }
    }

    /**
     * Promote a slave to master, demoting the current master.
     */
    private promote(provider: DBProvider): void {
        // Demote current master
        const currentMaster = this.getMaster();
        if (currentMaster) {
            currentMaster.role = 'slave';
            this.emit({
                type: 'provider:demoted',
                provider: currentMaster.name,
                timestamp: Date.now(),
            });
        }

        // Promote new master
        provider.role = 'master';
        this.emit({
            type: 'provider:promoted',
            provider: provider.name,
            timestamp: Date.now(),
        });

        this.emit({
            type: 'router:failover',
            provider: provider.name,
            timestamp: Date.now(),
            details: { previousMaster: currentMaster?.name },
        });
    }

    // ─── Getters ─────────────────────────────────────────────────

    getMaster(): DBProvider | null {
        const providers = Array.from(this.providers.values());
        for (const provider of providers) {
            if (provider.role === 'master') return provider;
        }
        return null;
    }

    getHealthySlaves(): DBProvider[] {
        return Array.from(this.providers.values())
            .filter(p => p.role === 'slave' && p.status === 'healthy')
            .sort((a, b) => a.priority - b.priority);
    }

    getHealthyProviders(): DBProvider[] {
        return Array.from(this.providers.values())
            .filter(p => p.status === 'healthy')
            .sort((a, b) => a.latency - b.latency);
    }

    getAllProviders(): DBProvider[] {
        return Array.from(this.providers.values());
    }

    getStatus(): Record<string, { role: string; status: ProviderStatus; latency: number }> {
        const result: Record<string, any> = {};
        const entries = Array.from(this.providers.entries());
        for (const [name, provider] of entries) {
            result[name] = {
                role: provider.role,
                status: provider.status,
                latency: provider.latency,
            };
        }
        return result;
    }
}
