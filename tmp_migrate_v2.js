const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: true
});

async function run() {
    try {
        console.log('Connecting to:', process.env.NEON_DATABASE_URL?.split('@')[1] || 'URL not found');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tharmate_room_members (
        room_id UUID REFERENCES tharmate_rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (room_id, user_id)
      )
    `);
        console.log('✅ Table created or already exists');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
