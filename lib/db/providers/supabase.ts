/**
 * Supabase PostgreSQL Provider (Slave / Failover)
 * 
 * Connects to Supabase's PostgreSQL endpoint using the standard 'pg' driver.
 * Supabase exposes a TCP connection pooler on port 6543 which requires
 * a standard PostgreSQL driver — the Neon serverless driver (WebSocket/HTTP)
 * is incompatible with Supabase's pooler protocol.
 * 
 * The 'pg' module is marked as server-only in next.config.js via:
 * - experimental.serverComponentsExternalPackages: ['pg']
 * - webpack fallbacks for fs, net, tls, dns (client-side)
 * 
 * SOLID Principles:
 * - Liskov Substitution: Fully interchangeable with NeonProvider
 * - Open/Closed: Extends BaseProvider without modifying it
 * - Dependency Inversion: Router depends on DBProvider interface, not this class
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

        // Use standard pg.Pool for TCP connection to Supabase (port 6543)
        this.pool = new Pool({
            connectionString: connectionUrl,
            ssl: {
                rejectUnauthorized: false // Required for Supabase in many environments
            },
            max: 10, // Reduced from 20 to prevent "Max clients" errors in dev mode
            idleTimeoutMillis: 10000, // Close idle clients faster to free up slots
            connectionTimeoutMillis: 5000,
        });

        this.pool.on('error', (err) => {
            this.error(`Unexpected pool error: ${err.message}`);
        });
    }

    /**
     * Execute a query using the standard PostgreSQL driver.
     */
    protected async _executeQuery<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>> {
        const client = await this.pool.connect();
        try {
            const start = Date.now();
            const result = await client.query(sql, params || []);
            this.latency = Date.now() - start;

            return {
                rows: result.rows as T[],
                rowCount: result.rowCount || result.rows.length,
            };
        } catch (error: any) {
            this.error(`Query failed: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Test connectivity with a simple query.
     */
    async ping(): Promise<boolean> {
        try {
            await this._executeQuery('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Close the pool on disconnect.
     */
    async disconnect(): Promise<void> {
        await this.pool.end();
        this.log('Disconnected (Pool closed)');
    }
}
