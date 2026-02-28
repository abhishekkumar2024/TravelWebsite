/**
 * Neon PostgreSQL Provider
 * 
 * Uses @neondatabase/serverless for edge-compatible PostgreSQL connections.
 * This is the recommended primary (master) provider for CamelThar.
 * 
 * Features:
 * - Serverless-friendly (auto-scales to zero)
 * - Compatible with Vercel Edge Functions
 * - Singapore region available (low latency from India)
 */

import { neon } from '@neondatabase/serverless';
import { BaseProvider } from './base';
import { ProviderRole, QueryResult } from '../types';

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
     * Execute a query using Neon's serverless driver.
     * Neon returns an array of rows directly.
     */
    protected async _executeQuery<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>> {
        try {
            // Use .query() for parameterized queries (string + params array)
            // The neon() function itself is a tagged template — .query() handles regular SQL
            const result = await this.sql.query(sql, params || []);

            // .query() returns an array of rows
            const rows = Array.isArray(result) ? result : (result as any).rows || [];

            return {
                rows: rows as T[],
                rowCount: rows.length,
            };
        } catch (error: any) {
            this.error(`Query failed: ${error.message}`);
            this.error(`SQL: ${sql.substring(0, 200)}...`);
            throw error;
        }
    }

    /**
     * Neon serverless driver doesn't need explicit disconnect.
     */
    async disconnect(): Promise<void> {
        this.log('Disconnected (serverless — no persistent connection)');
    }
}
