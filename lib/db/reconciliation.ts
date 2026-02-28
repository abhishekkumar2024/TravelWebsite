import { db } from './router';
import { Client } from 'pg';

/**
 * DB Reconciliation Service
 * 
 * Logic to compare Master (Neon) and Slave (Supabase) 
 * and perform deep synchronization.
 */

export interface SyncResult {
    table: string;
    synced: number;
    failed: number;
    status: 'success' | 'partial' | 'error';
    message: string;
}

export async function runFullReconciliation(): Promise<SyncResult[]> {
    const MASTER_URL = process.env.NEON_DATABASE_URL;
    const SLAVE_URL = process.env.SUPABASE_DATABASE_URL;

    if (!MASTER_URL || !SLAVE_URL) {
        throw new Error('Database URLs not configured for reconciliation.');
    }

    const master = new Client({ connectionString: MASTER_URL });
    const slave = new Client({ connectionString: SLAVE_URL });
    const results: SyncResult[] = [];

    try {
        await master.connect();
        await slave.connect();

        const tables = ['authors', 'blogs', 'users'];

        for (const table of tables) {
            try {
                const res = await reconcileTable(master, slave, table);
                results.push(res);
            } catch (err: any) {
                results.push({
                    table,
                    synced: 0,
                    failed: 0,
                    status: 'error',
                    message: err.message
                });
            }
        }

        return results;
    } finally {
        await master.end().catch(() => { });
        await slave.end().catch(() => { });
    }
}

async function reconcileTable(master: Client, slave: Client, tableName: string): Promise<SyncResult> {
    // 1. Fetch IDs and timestamps
    const masterRows = (await master.query(`SELECT id, updated_at FROM ${tableName}`)).rows;
    const slaveRows = (await slave.query(`SELECT id, updated_at FROM ${tableName}`)).rows;

    const slaveMap = new Map<string, string>(slaveRows.map(r => [r.id, r.updated_at?.toISOString() || '']));

    let syncedCount = 0;
    let failedCount = 0;

    for (const masterRow of masterRows) {
        const slaveUpdatedAt = slaveMap.get(masterRow.id);
        const masterUpdatedAt = masterRow.updated_at?.toISOString() || '';

        // Sync if missing or master is newer
        if (!slaveUpdatedAt || masterUpdatedAt !== slaveUpdatedAt) {
            try {
                const fullRow = (await master.query(`SELECT * FROM ${tableName} WHERE id = $1`, [masterRow.id])).rows[0];
                if (!fullRow) continue;

                const columns = Object.keys(fullRow);
                const values = Object.values(fullRow).map(val => {
                    // Important: Explicitly stringify objects for JSONB columns
                    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                        return JSON.stringify(val);
                    }
                    return val;
                });

                const colNames = columns.map(c => `"${c}"`).join(', ');
                const valPlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const updateSet = columns
                    .filter(c => c !== 'id')
                    .map((c) => `"${c}" = EXCLUDED."${c}"`)
                    .join(', ');

                const upsertSql = `
                    INSERT INTO ${tableName} (${colNames}) 
                    VALUES (${valPlaceholders})
                    ON CONFLICT (id) 
                    DO UPDATE SET ${updateSet}
                `;

                await slave.query(upsertSql, values);
                syncedCount++;
            } catch (err) {
                failedCount++;
            }
        }
    }

    return {
        table: tableName,
        synced: syncedCount,
        failed: failedCount,
        status: failedCount > 0 ? 'partial' : 'success',
        message: `Processed ${masterRows.length} rows.`
    };
}
