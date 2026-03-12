const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Fixing room member counts...');
        const res = await pool.query(`
      UPDATE tharmate_rooms r
      SET current_members = (
          SELECT COUNT(DISTINCT sender_id)
          FROM tharmate_room_messages rm
          WHERE rm.room_id = r.id 
            AND rm.message = 'joined the room' 
            AND rm.message_type = 'system'
      )
      WHERE is_active = true
      RETURNING id, title, current_members
    `);
        console.log('✅ Updated counts for rooms:');
        res.rows.forEach(row => {
            console.log(`- ${row.title} (${row.id}): ${row.current_members} members`);
        });
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
