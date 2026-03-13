import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { destinations as staticDestinations } from '@/lib/data';
import { getServerSession } from 'next-auth';
import { isAdmin } from '@/lib/db/queries/admin';

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userAdmin = await isAdmin((session.user as any).role);
        if (!userAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. Create the table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS destinations (
                id TEXT PRIMARY KEY,
                name_en TEXT NOT NULL,
                name_hi TEXT,
                tagline_en TEXT,
                tagline_hi TEXT,
                description_en TEXT,
                description_hi TEXT,
                cover_image TEXT,
                attractions JSONB DEFAULT '[]'::jsonb,
                best_time TEXT,
                image_credits JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // 2. Check if already populated
        const countRes = await db.query('SELECT COUNT(*) FROM destinations');
        const count = parseInt(countRes.rows[0].count);

        if (count === 0) {
            // 3. Populate with static data
            for (const dest of staticDestinations) {
                await db.execute(
                    `INSERT INTO destinations (
                        id, name_en, name_hi, tagline_en, tagline_hi, 
                        description_en, description_hi, cover_image, 
                        attractions, best_time, image_credits
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb)`,
                    [
                        dest.id,
                        dest.name_en,
                        dest.name_hi,
                        dest.tagline_en,
                        dest.tagline_hi,
                        dest.description_en,
                        dest.description_hi,
                        dest.coverImage,
                        JSON.stringify(dest.attractions),
                        dest.bestTime,
                        dest.imageCredits ? JSON.stringify(dest.imageCredits) : null
                    ]
                );
            }
            return NextResponse.json({ message: 'Table created and populated with ' + staticDestinations.length + ' destinations.' });
        }

        return NextResponse.json({ message: 'Table already exists and has data.' });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
