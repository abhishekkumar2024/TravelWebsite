const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    }
});

const sql = neon(env.NEON_DATABASE_URL);

async function check() {
    try {
        console.log('--- Blogs Count per Author ---');
        const blogs = await sql`SELECT author_id, COUNT(*) as count FROM blogs GROUP BY author_id`;
        console.log(JSON.stringify(blogs, null, 2));

        console.log('\n--- Authors ---');
        const authors = await sql`SELECT id, email, name FROM authors`;
        console.log(JSON.stringify(authors, null, 2));

        console.log('\n--- Users ---');
        const users = await sql`SELECT id, email, name FROM users`;
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error(err);
    }
}

check();
