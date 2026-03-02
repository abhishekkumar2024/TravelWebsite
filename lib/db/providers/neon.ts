/**
 * Neon PostgreSQL Provider — MASTER
 *
 * Uses @neondatabase/serverless for edge-compatible PostgreSQL connections.
 * Neon is the PRIMARY (master) provider for CamelThar.
 *
 * Features:
 * - Serverless-friendly (auto-scales to zero, no idle connections)
 * - Edge Runtime compatible (HTTP/WebSocket transport)
 * - Singapore region available (low latency from India)
 *
 * Known quirks:
 * - `.query()` returns rows as a plain array in some SDK versions and as
 *   a { rows, rowCount } object in others. We handle both forms.
 * - Occasional transient HTTP errors (504s, connection resets). We retry
 *   up to MAX_RETRIES times with exponential backoff before throwing.
 */

import { neon } from '@neondatabase/serverless';
import { BaseProvider } from './base';
import { ProviderRole, QueryResult } from '../types';

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 200; // 200ms, 400ms

export class NeonProvider extends BaseProvider {
    private sql: ReturnType<typeof neon>;

    constructor(connectionUrl: string, role: ProviderRole = 'master', priority: number = 0) {
        super('neon', role, priority);

        if (!connectionUrl) {
            throw new Error('[NeonProvider] Connection URL is required. Set NEON_DATABASE_URL.');
        }

        this.sql = neon(connectionUrl);
    }

    /**
     * Execute a query using Neon's serverless HTTP driver.
     *
     * Result normalization:
     *   @neondatabase/serverless v0.9+ returns a pg-compatible Result object
     *   ({ rows: T[], rowCount: number, fields: FieldDef[] }).
     *   Older versions / tagged-template mode returns a plain T[] array.
     *   We handle both to be safe.
     */
    protected async _executeQuery<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    // Exponential backoff before retry
                    await new Promise(res => setTimeout(res, RETRY_BASE_MS * attempt));
                    this.warn(`Retry attempt ${attempt}/${MAX_RETRIES} for query: ${sql.substring(0, 80)}...`);
                }

                const result = await this.sql.query(sql, params ?? []);

                // Normalize result — handle both array and object forms
                let rows: T[];
                let rowCount: number;

                if (Array.isArray(result)) {
                    // Older SDK: result is T[] directly
                    rows = result as T[];
                    rowCount = rows.length;
                } else if (result && typeof result === 'object' && 'rows' in result) {
                    // Newer SDK: result is { rows, rowCount, fields, ... }
                    rows = (result as any).rows as T[];
                    rowCount = (result as any).rowCount ?? rows.length;
                } else {
                    // Fallback: treat as empty
                    rows = [];
                    rowCount = 0;
                    this.warn(`Unexpected Neon result type: ${typeof result}. SQL: ${sql.substring(0, 80)}`);
                }

                return { rows, rowCount };

            } catch (error: any) {
                lastError = error;

                // Only retry on transient errors (network/timeout), not on SQL errors
                const isTransient = this.isTransientError(error);
                if (!isTransient || attempt === MAX_RETRIES) {
                    break;
                }
            }
        }

        this.error(`Query failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
        this.error(`SQL: ${sql.substring(0, 200)}`);
        throw lastError;
    }

    /**
     * Explicit ping using a simple SELECT 1 — verifies the HTTP connection works.
     */
    async ping(): Promise<boolean> {
        try {
            await this.sql.query('SELECT 1 AS ping', []);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Detect transient (retryable) errors vs permanent SQL errors.
     * Transient: network reset, timeout, 503/504, connection refused.
     * Permanent: syntax error, constraint violation, invalid column, etc.
     */
    private isTransientError(error: any): boolean {
        const msg = (error?.message || '').toLowerCase();
        return (
            msg.includes('timeout') ||
            msg.includes('connection') ||
            msg.includes('econnreset') ||
            msg.includes('econnrefused') ||
            msg.includes('fetch failed') ||
            msg.includes('network') ||
            msg.includes('503') ||
            msg.includes('504')
        );
    }

    /**
     * Neon serverless driver doesn't use persistent TCP connections.
     */
    async disconnect(): Promise<void> {
        this.log('Disconnected (serverless — no persistent connection to close)');
    }
}
