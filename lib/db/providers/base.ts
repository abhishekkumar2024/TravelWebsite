/**
 * Abstract Base Provider
 * 
 * Provides shared logic for all database providers (logging, latency tracking, etc.).
 * Concrete providers (Neon, Supabase, etc.) extend this class.
 */

import { DBProvider, ProviderRole, ProviderStatus, QueryResult } from '../types';

export abstract class BaseProvider implements DBProvider {
    readonly name: string;
    role: ProviderRole;
    status: ProviderStatus = 'unknown';
    readonly priority: number;
    latency: number = Infinity;
    failureCount: number = 0;
    successCount: number = 0;

    constructor(name: string, role: ProviderRole, priority: number) {
        this.name = name;
        this.role = role;
        this.priority = priority;
    }

    /**
     * Execute a query and track latency.
     * Subclasses implement _executeQuery for provider-specific logic.
     */
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const start = Date.now();
        try {
            const result = await this._executeQuery<T>(sql, params);
            this.latency = Date.now() - start;
            this.recordSuccess();
            return result;
        } catch (error) {
            this.latency = Date.now() - start;
            this.recordFailure();
            throw error;
        }
    }

    /**
     * Execute a write operation and track latency.
     * Uses the same underlying implementation — distinction is for routing.
     */
    async execute<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const start = Date.now();
        try {
            const result = await this._executeQuery<T>(sql, params);
            this.latency = Date.now() - start;
            this.recordSuccess();
            return result;
        } catch (error) {
            this.latency = Date.now() - start;
            this.recordFailure();
            throw error;
        }
    }

    /**
     * Health check with timeout.
     */
    async ping(): Promise<boolean> {
        try {
            const start = Date.now();
            await this._executeQuery('SELECT 1 AS ping');
            this.latency = Date.now() - start;
            this.recordSuccess();
            return true;
        } catch {
            this.recordFailure();
            return false;
        }
    }

    /**
     * Get current latency. If unknown, does a ping first.
     */
    async getLatency(): Promise<number> {
        if (this.latency === Infinity) {
            await this.ping();
        }
        return this.latency;
    }

    // ─── Internal Helpers ────────────────────────────────────────

    protected recordSuccess(): void {
        this.failureCount = 0;
        this.successCount++;
    }

    protected recordFailure(): void {
        this.successCount = 0;
        this.failureCount++;
    }

    protected log(message: string, ...args: any[]): void {
        console.log(`[DB:${this.name}] ${message}`, ...args);
    }

    protected warn(message: string, ...args: any[]): void {
        console.warn(`[DB:${this.name}] ${message}`, ...args);
    }

    protected error(message: string, ...args: any[]): void {
        console.error(`[DB:${this.name}] ${message}`, ...args);
    }

    // ─── Abstract Methods (subclasses must implement) ────────────

    /**
     * Provider-specific query execution.
     * Must return rows + rowCount.
     */
    protected abstract _executeQuery<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>>;

    /**
     * Gracefully close the connection pool.
     */
    abstract disconnect(): Promise<void>;
}
