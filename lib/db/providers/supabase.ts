/**
 * Supabase PostgreSQL Provider (Slave / Failover)
 * 
 * Connects to Supabase's PostgreSQL endpoint using the same @neondatabase/serverless
 * driver as the primary provider. This works because:
 * - Supabase exposes a standard PostgreSQL connection string
 * - @neondatabase/serverless can connect to ANY PostgreSQL (not just Neon)
 * - This keeps the same serverless-compatible, edge-friendly driver
 * - No Node.js-only dependencies (net, tls, dns) that break with Webpack
 * 
 * SOLID Principles:
 * - Liskov Substitution: Fully interchangeable with NeonProvider
 * - Open/Closed: Extends BaseProvider without modifying it
 * - Dependency Inversion: Router depends on DBProvider interface, not this class
 */

import { neon } from '@neondatabase/serverless';
import { BaseProvider } from './base';
import { ProviderRole, QueryResult } from '../types';

export class SupabaseProvider extends BaseProvider {
    private sql: ReturnType<typeof neon>;

    constructor(connectionUrl: string, role: ProviderRole = 'slave', priority: number = 10) {
        super('supabase', role, priority);

        if (!connectionUrl) {
            throw new Error('[SupabaseProvider] Connection URL is required. Set SUPABASE_DATABASE_URL.');
        }

        // The neon() driver connects to any PostgreSQL over WebSockets
        // Supabase supports this via their connection pooler (port 6543)
        this.sql = neon(connectionUrl);
    }

    /**
     * Execute a query using the serverless driver.
     * Identical implementation to NeonProvider — same driver, different endpoint.
     */
    protected async _executeQuery<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>> {
        try {
            const result = await this.sql.query(sql, params || []);
            const rows = Array.isArray(result) ? result : (result as any).rows || [];

            return {
                rows: rows as T[],
                rowCount: rows.length,
            };
        } catch (error: any) {
            this.error(`Query failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Serverless driver — no persistent connections to close.
     */
    async disconnect(): Promise<void> {
        this.log('Disconnected (serverless — no persistent connection)');
    }
}
