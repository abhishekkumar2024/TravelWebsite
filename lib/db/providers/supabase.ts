/**
 * Supabase PostgreSQL Provider — SLAVE / FAILOVER
 *
 * Connects to Supabase's PostgreSQL endpoint using the standard 'pg' driver.
 * Supabase exposes a TCP connection pooler on port 6543 which requires
 * a standard PostgreSQL driver — the Neon serverless driver (WebSocket/HTTP)
 * is incompatible with Supabase's pooler protocol.
 *
 * Role:
 *   This is the SLAVE / failover provider. It is only registered when:
 *     SUPABASE_SLAVE_ENABLED=true  AND  SUPABASE_DATABASE_URL is set.
 *   When Neon (master) goes unhealthy, the router auto-promotes Supabase.
 *
 * The 'pg' module is marked as server-only in next.config.js via:
 * - experimental.serverComponentsExternalPackages: ['pg']
 * - webpack fallbacks for fs, net, tls, dns (client-side)
 */

import { Pool } from 'pg';
import { BaseProvider } from './base';
import { ProviderRole, QueryResult } from '../types';

export class SupabaseProvider extends BaseProvider {
    private pool: Pool;

    constructor(connectionUrl: string, role: ProviderRole = 'slave', priority: number = 10) {
        super('supabase', role, priority);

        if (!connectionUrl) {
            throw new Error('[SupabaseProvider] Connection URL is required. Set SUPABASE_DATABASE_URL.');
        }

        this.pool = new Pool({
            connectionString: connectionUrl,
            ssl: {
                rejectUnauthorized: false, // Required for Supabase pooler (port 6543)
            },
            // Pool sizing: 5 connections is safe for Supabase free tier (max 60)
            // and provides enough headroom when acting as failover master.
            max: 5,
            idleTimeoutMillis: 30_000,        // Release idle connections after 30s
            connectionTimeoutMillis: 8_000,   // Fail fast if can't connect within 8s
        });

        this.pool.on('error', (err) => {
            this.error(`Unexpected pool error: ${err.message}`);
        });
    }

    /**
     * Execute a query using the standard PostgreSQL driver.
     * Acquires a client from the pool, runs the query, and releases.
     */
    protected async _executeQuery<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>> {
        const client = await this.pool.connect();
        const start = Date.now();
        try {
            const result = await client.query(sql, params ?? []);
            this.latency = Date.now() - start;

            return {
                rows: result.rows as T[],
                rowCount: result.rowCount ?? result.rows.length,
            };
        } catch (error: any) {
            this.latency = Date.now() - start;
            this.error(`Query failed: ${error.message}`);
            this.error(`SQL: ${sql.substring(0, 200)}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Test connectivity with a quick SELECT 1.
     */
    async ping(): Promise<boolean> {
        try {
            await this._executeQuery('SELECT 1 AS ping');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Gracefully drain and close all pool connections.
     */
    async disconnect(): Promise<void> {
        await this.pool.end();
        this.log('Disconnected (Pool drained and closed)');
    }
}
