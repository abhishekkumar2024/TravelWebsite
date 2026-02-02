/**
 * Migration Runner - Run migrations from code
 * 
 * Usage:
 *   npm run migrate
 * 
 * Or import and call:
 *   import { runMigrations } from '@/lib/run-migration';
 *   await runMigrations();
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials. Check your .env.local file.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * Read SQL file from project root
 */
function readSQLFile(filename: string): string {
    try {
        const filePath = join(process.cwd(), filename);
        const content = readFileSync(filePath, 'utf-8');
        // Remove comments and empty lines for cleaner execution
        return content
            .split('\n')
            .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
            .join('\n');
    } catch (error) {
        console.error(`❌ Error reading ${filename}:`, error);
        throw error;
    }
}

/**
 * Check if migration function exists in Supabase
 */
async function checkMigrationFunction(): Promise<boolean> {
    try {
        // Try to call the function with empty SQL to test if it exists
        const { error } = await supabaseAdmin.rpc('execute_migration_sql', {
            sql_text: 'SELECT 1;',
        });

        // If function doesn't exist, we'll get a specific error
        if (error && (
            error.code === 'PGRST202' ||
            error.message.includes('function') ||
            error.message.includes('schema cache')
        )) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Run a single migration
 */
export async function runMigration(migrationName: string, sqlFile: string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`📦 Running migration: ${migrationName}`);

        // Check if migration function exists
        const functionExists = await checkMigrationFunction();
        if (!functionExists) {
            const errorMsg = `
❌ Migration function not found!

Please run this SQL in Supabase SQL Editor ONCE:
File: supabase-migration-function.sql

This sets up the migration system so you can run migrations from code.
            `.trim();
            return { success: false, error: errorMsg };
        }

        // Read SQL file
        const sql = readSQLFile(sqlFile);

        // Execute migration via RPC
        const { data, error } = await supabaseAdmin.rpc('execute_migration_sql', {
            sql_text: sql,
        });

        if (error) {
            console.error(`❌ Migration error:`, error);
            return { success: false, error: error.message };
        }

        // Mark migration as complete
        try {
            await supabaseAdmin.rpc('mark_migration_complete', {
                migration_name: migrationName,
            });
        } catch (markError) {
            // Non-critical, migration still succeeded
            console.warn('⚠️  Could not mark migration as complete:', markError);
        }

        console.log(`✅ Migration ${migrationName} completed successfully`);
        if (data) {
            console.log(`   Executed statements: ${data.executed || 'unknown'}`);
            if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                console.warn(`   Warnings: ${data.errors.length} (may be expected)`);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error(`❌ Migration ${migrationName} failed:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Run all migrations
 */
export async function runMigrations(): Promise<{ success: boolean; errors: string[] }> {
    console.log('🚀 Starting database migrations...\n');

    const errors: string[] = [];

    // Define migrations in order
    const migrations = [
        {
            name: 'approval_workflow_setup',
            file: 'database_scripts/supabase-approval-workflow.sql',
        },
        {
            name: 'add_blog_slug',
            file: 'database_scripts/add-blog-slug.sql',
        },
    ];

    // Check if already run
    for (const migration of migrations) {
        try {
            const { data } = await supabaseAdmin
                .from('_migrations')
                .select('name')
                .eq('name', migration.name)
                .single();

            if (data) {
                console.log(`⏭️  Skipping ${migration.name} (already executed)`);
                continue;
            }
        } catch {
            // Table doesn't exist or migration hasn't run, continue
        }

        // Run migration
        const result = await runMigration(migration.name, migration.file);
        if (!result.success) {
            errors.push(`${migration.name}: ${result.error || 'Unknown error'}`);
        }
    }

    console.log('');

    if (errors.length > 0) {
        console.error('❌ Some migrations failed:');
        errors.forEach(error => console.error(`   - ${error}`));
        return { success: false, errors };
    }

    console.log('✅ All migrations completed successfully!');
    return { success: true, errors: [] };
}

// Run if called directly (check if this is the main module)
const isMainModule = process.argv[1] && process.argv[1].endsWith('run-migration.ts');
if (isMainModule) {
    runMigrations()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}
