/**
 * Neon Database Setup & Data Sync Script
 * 
 * Step 1: Create schema in Neon
 * Step 2: Export data from Supabase (if accessible) 
 * Step 3: Import data into Neon
 * 
 * Usage: node database_scripts/setup-neon.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const NEON_URL = envVars.NEON_DATABASE_URL;
if (!NEON_URL) {
    console.error('❌ NEON_DATABASE_URL not found in .env.local');
    process.exit(1);
}

console.log('🔌 Connecting to Neon...');
const sql = neon(NEON_URL);

// ─── Step 1: Test connection ──────────────────────────────────
async function testConnection() {
    try {
        const result = await sql`SELECT NOW() as now, version()`;
        console.log('✅ Connected to Neon!');
        console.log(`   Time: ${result[0].now}`);
        console.log(`   Version: ${result[0].version.substring(0, 50)}...`);
        return true;
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
    }
}

// ─── Step 2: Create schema ──────────────────────────────────
async function createSchema() {
    console.log('\n📐 Creating schema...');

    const schemaPath = join(__dirname, 'neon-full-schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let success = 0;
    let errors = 0;

    for (const stmt of statements) {
        try {
            await sql.query(stmt);
            success++;
        } catch (error) {
            // Ignore "already exists" type errors
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                success++;
            } else {
                console.error(`   ⚠️ Error: ${error.message.substring(0, 100)}`);
                console.error(`      SQL: ${stmt.substring(0, 80)}...`);
                errors++;
            }
        }
    }

    console.log(`   ✅ Executed ${success} statements (${errors} errors)`);
}

// ─── Step 3: Check existing data ──────────────────────────────
async function checkTables() {
    console.log('\n📊 Checking tables...');

    const tables = ['users', 'accounts', 'sessions', 'authors', 'blogs',
        'blog_likes', 'blog_comments', 'comment_likes',
        'contact_messages', 'products', 'submit_logs'];

    for (const table of tables) {
        try {
            const result = await sql`SELECT COUNT(*) as count FROM ${sql.unsafe(table)}`;
            console.log(`   ${table}: ${result[0].count} rows`);
        } catch (error) {
            console.log(`   ${table}: ❌ ${error.message.substring(0, 50)}`);
        }
    }
}

// ─── Step 4: Newsletter table (check if exists in Supabase) ───
async function createNewsletterTable() {
    console.log('\n📧 Ensuring newsletter table exists...');
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                subscribed_at TIMESTAMPTZ DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE
            )
        `;
        console.log('   ✅ newsletter_subscribers table ready');
    } catch (error) {
        console.log(`   ⚠️ ${error.message}`);
    }
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
    console.log('🚀 Neon Database Setup Script');
    console.log('═'.repeat(50));

    const connected = await testConnection();
    if (!connected) return;

    await createSchema();
    await createNewsletterTable();
    await checkTables();

    console.log('\n═'.repeat(50));
    console.log('✅ Schema setup complete!');
    console.log('\nNext steps:');
    console.log('  1. If tables are empty, you need to import data from Supabase');
    console.log('  2. Run: node database_scripts/import-from-supabase.mjs');
    console.log('  3. Or manually export from Supabase SQL editor and import here');
}

main().catch(console.error);
