/**
 * Data Migration: Supabase → Neon
 * 
 * Reads data from Supabase REST API and inserts into Neon PostgreSQL.
 * 
 * Usage: node database_scripts/migrate-data.cjs
 */

const { neon } = require('@neondatabase/serverless');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Parse .env.local ───────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    }
});

// Supabase config (uncommented values from .env.local)
const SUPABASE_URL = 'https://lvyabpenpuizwzwzswse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWFicGVucHVpend6d3pzd3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDgxNTMsImV4cCI6MjA4NTA4NDE1M30.bq1O6ksPhxRFFEFmsNxbxH9boPlf2ebISO4jiHlHwj8';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWFicGVucHVpend6d3pzd3NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUwODE1MywiZXhwIjoyMDg1MDg0MTUzfQ.5kwPTYuTKvElXT4yEKnDOFTFMN-boqnKqVIRB_5vinQ';

const NEON_URL = env.NEON_DATABASE_URL;
if (!NEON_URL) {
    console.error('❌ NEON_DATABASE_URL not found');
    process.exit(1);
}

const sql = neon(NEON_URL);

// ─── Supabase REST API helper ───────────────────────────────
function supabaseFetch(tableName, select = '*', extraParams = '') {
    return new Promise((resolve, reject) => {
        const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=${encodeURIComponent(select)}${extraParams ? '&' + extraParams : ''}`;

        const options = {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            timeout: 30000,
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                        return;
                    }
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
}

// ─── Migration functions ────────────────────────────────────

async function migrateAuthors() {
    console.log('\n📝 Migrating authors...');
    try {
        const authors = await supabaseFetch('authors');
        console.log(`   Found ${authors.length} authors in Supabase`);

        for (const a of authors) {
            try {
                await sql`
                    INSERT INTO authors (id, name, email, bio, avatar_url, slug, website, twitter, instagram, linkedin, youtube, created_at)
                    VALUES (${a.id}::uuid, ${a.name}, ${a.email}, ${a.bio}, ${a.avatar_url}, ${a.slug}, 
                            ${a.website}, ${a.twitter}, ${a.instagram}, ${a.linkedin}, ${a.youtube}, 
                            ${a.created_at || new Date().toISOString()})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                console.log(`   ⚠️ Author ${a.email}: ${e.message.substring(0, 80)}`);
            }
        }
        console.log(`   ✅ Authors migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateBlogs() {
    console.log('\n📰 Migrating blogs...');
    try {
        const blogs = await supabaseFetch('blogs', '*', 'order=created_at.asc');
        console.log(`   Found ${blogs.length} blogs in Supabase`);

        for (const b of blogs) {
            try {
                await sql`
                    INSERT INTO blogs (
                        id, author_id, title_en, title_hi, excerpt_en, excerpt_hi,
                        content_en, content_hi, destination, category, cover_image,
                        meta_title, meta_description, focus_keyword, canonical_url,
                        slug, author, images, status, reading_time_minutes, views,
                        published_at, created_at, updated_at
                    ) VALUES (
                        ${b.id}::uuid, ${b.author_id}::uuid, ${b.title_en}, ${b.title_hi}, 
                        ${b.excerpt_en}, ${b.excerpt_hi}, ${b.content_en}, ${b.content_hi}, 
                        ${b.destination}, ${b.category}, ${b.cover_image},
                        ${b.meta_title}, ${b.meta_description}, ${b.focus_keyword}, ${b.canonical_url},
                        ${b.slug}, ${JSON.stringify(b.author)}::jsonb, ${JSON.stringify(b.images || [])}::jsonb, 
                        ${b.status || 'pending'}, ${b.reading_time_minutes}, ${b.views || 0},
                        ${b.published_at}, ${b.created_at}, ${b.updated_at}
                    )
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                console.log(`   ⚠️ Blog "${(b.title_en || '').substring(0, 40)}": ${e.message.substring(0, 80)}`);
            }
        }
        console.log(`   ✅ Blogs migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateBlogLikes() {
    console.log('\n❤️  Migrating blog likes...');
    try {
        const likes = await supabaseFetch('blog_likes');
        console.log(`   Found ${likes.length} likes in Supabase`);

        for (const l of likes) {
            try {
                await sql`
                    INSERT INTO blog_likes (id, blog_id, user_id, created_at)
                    VALUES (${l.id}::uuid, ${l.blog_id}::uuid, ${l.user_id}::uuid, ${l.created_at})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                // Skip FK errors silently
            }
        }
        console.log(`   ✅ Blog likes migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateBlogComments() {
    console.log('\n💬 Migrating blog comments...');
    try {
        const comments = await supabaseFetch('blog_comments', '*', 'order=created_at.asc');
        console.log(`   Found ${comments.length} comments in Supabase`);

        // First pass: insert comments without parent_id
        for (const c of comments) {
            try {
                await sql`
                    INSERT INTO blog_comments (id, blog_id, user_id, content, parent_id, is_edited, created_at, updated_at)
                    VALUES (${c.id}::uuid, ${c.blog_id}::uuid, ${c.user_id}::uuid, ${c.content}, 
                            ${c.parent_id}::uuid, ${c.is_edited || false}, ${c.created_at}, ${c.updated_at})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                // Retry without parent_id for FK issues
                try {
                    await sql`
                        INSERT INTO blog_comments (id, blog_id, user_id, content, is_edited, created_at, updated_at)
                        VALUES (${c.id}::uuid, ${c.blog_id}::uuid, ${c.user_id}::uuid, ${c.content}, 
                                ${c.is_edited || false}, ${c.created_at}, ${c.updated_at})
                        ON CONFLICT (id) DO NOTHING
                    `;
                } catch (e2) {
                    // Skip
                }
            }
        }
        console.log(`   ✅ Blog comments migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateCommentLikes() {
    console.log('\n👍 Migrating comment likes...');
    try {
        const likes = await supabaseFetch('comment_likes');
        console.log(`   Found ${likes.length} comment likes in Supabase`);

        for (const l of likes) {
            try {
                await sql`
                    INSERT INTO comment_likes (id, comment_id, user_id, created_at)
                    VALUES (${l.id}::uuid, ${l.comment_id}::uuid, ${l.user_id}::uuid, ${l.created_at})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                // Skip FK errors
            }
        }
        console.log(`   ✅ Comment likes migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateContactMessages() {
    console.log('\n📧 Migrating contact messages...');
    try {
        const messages = await supabaseFetch('contact_messages');
        console.log(`   Found ${messages.length} messages in Supabase`);

        for (const m of messages) {
            try {
                await sql`
                    INSERT INTO contact_messages (id, name, email, subject, message, status, created_at)
                    VALUES (${m.id}::uuid, ${m.name}, ${m.email}, ${m.subject}, ${m.message}, ${m.status || 'new'}, ${m.created_at})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                console.log(`   ⚠️ Message: ${e.message.substring(0, 80)}`);
            }
        }
        console.log(`   ✅ Contact messages migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateProducts() {
    console.log('\n🛍️ Migrating products...');
    try {
        const products = await supabaseFetch('products');
        console.log(`   Found ${products.length} products in Supabase`);

        for (const p of products) {
            try {
                await sql`
                    INSERT INTO products (id, name, description, price, image_url, affiliate_link, destinations, is_active, created_at)
                    VALUES (${p.id}::uuid, ${p.name}, ${p.description}, ${p.price}, ${p.image_url}, 
                            ${p.affiliate_link}, ${JSON.stringify(p.destinations || [])}::jsonb, ${p.is_active}, ${p.created_at})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                console.log(`   ⚠️ Product "${p.name}": ${e.message.substring(0, 80)}`);
            }
        }
        console.log(`   ✅ Products migrated`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

async function migrateNewsletter() {
    console.log('\n📬 Migrating newsletter subscribers...');
    try {
        const subs = await supabaseFetch('newsletter_subscribers');
        console.log(`   Found ${subs.length} subscribers in Supabase`);

        for (const s of subs) {
            try {
                await sql`
                    INSERT INTO newsletter_subscribers (id, email, subscribed_at, is_active)
                    VALUES (${s.id}::uuid, ${s.email}, ${s.subscribed_at || s.created_at}, ${s.is_active !== false})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                // Skip duplicates silently
            }
        }
        console.log(`   ✅ Newsletter subscribers migrated`);
    } catch (e) {
        if (e.message.includes('404') || e.message.includes('relation')) {
            console.log(`   ⚠️ Table not found in Supabase (skipping)`);
        } else {
            console.error(`   ❌ Error: ${e.message}`);
        }
    }
}

// ─── Migrate Supabase auth users → Neon users table ─────────
async function migrateUsers() {
    console.log('\n👤 Creating users from authors...');
    try {
        // Since we can't access auth.users via REST API easily,
        // we'll create user entries from the authors table
        const authors = await sql`SELECT id, name, email, avatar_url, created_at FROM authors`;
        console.log(`   Found ${authors.length} authors to create as users`);

        for (const a of authors) {
            try {
                await sql`
                    INSERT INTO users (id, name, email, image, role, created_at)
                    VALUES (${a.id}::uuid, ${a.name}, ${a.email}, ${a.avatar_url}, 'user', ${a.created_at})
                    ON CONFLICT (id) DO NOTHING
                `;
            } catch (e) {
                // Skip conflicts
            }
        }
        console.log(`   ✅ Users created from authors`);
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}`);
    }
}

// ─── Verify counts ──────────────────────────────────────────
async function verifyCounts() {
    console.log('\n📊 Verification — Row counts in Neon:');
    const tables = ['users', 'authors', 'blogs', 'blog_likes', 'blog_comments',
        'comment_likes', 'contact_messages', 'products', 'newsletter_subscribers'];

    for (const table of tables) {
        try {
            const r = await sql`SELECT COUNT(*)::int as c FROM ${sql.unsafe(table)}`;
            console.log(`   ${table}: ${r[0].c} rows`);
        } catch (e) {
            console.log(`   ${table}: ERROR`);
        }
    }
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
    console.log('🚀 Supabase → Neon Data Migration');
    console.log('═'.repeat(50));

    // Test Neon connection
    const r = await sql`SELECT NOW() as now`;
    console.log('✅ Neon connected:', r[0].now);

    // Test Supabase connection
    try {
        const test = await supabaseFetch('authors', 'id', 'limit=1');
        console.log('✅ Supabase connected');
    } catch (e) {
        console.error('❌ Supabase connection failed:', e.message);
        console.log('\nIs Supabase accessible from your network?');
        return;
    }

    // Migrate all tables
    await migrateAuthors();
    await migrateBlogs();
    await migrateBlogLikes();
    await migrateBlogComments();
    await migrateCommentLikes();
    await migrateContactMessages();
    await migrateProducts();
    await migrateNewsletter();
    await migrateUsers();  // Create users from authors

    // Verify
    await verifyCounts();

    console.log('\n═'.repeat(50));
    console.log('✅ Migration complete!');
}

main().catch(e => console.error('Fatal:', e.message));
