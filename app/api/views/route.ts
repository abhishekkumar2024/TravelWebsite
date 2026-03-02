export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAndSet } from '@/lib/redis';

/**
 * POST /api/views — Increment view count with layered deduplication
 * 
 * Dedup layers (best → fallback):
 *   1. Client: sessionStorage (same-tab refresh)
 *   2. Redis:  IP hash + 24h TTL (fast, auto-expires)
 *   3. DB:     blog_view_logs table (if Redis unavailable)
 *   4. None:   direct increment (if both Redis + DB table missing)
 * 
 * Body: { blogId: string }
 */

const VIEW_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Hash IP using Web Crypto API (SHA-256, privacy-safe)
 */
async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + '_camelthar_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract visitor IP from request headers
 */
function getClientIP(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        req.headers.get('cf-connecting-ip') ||
        'unknown'
    );
}

export async function POST(req: NextRequest) {
    try {
        const { blogId } = await req.json();

        if (!blogId) {
            return NextResponse.json({ error: 'Missing blogId' }, { status: 400 });
        }

        // Validate UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(blogId);
        if (!isUuid) {
            return NextResponse.json({ error: 'Invalid blogId' }, { status: 400 });
        }

        // Get and hash visitor IP
        const rawIP = getClientIP(req);
        const ipHash = await hashIP(rawIP);
        const dedupKey = `view:${blogId}:${ipHash}`;

        // ── Layer 1: Try Redis dedup (fastest) ──
        const isDuplicate = await checkAndSet(dedupKey, VIEW_COOLDOWN_SECONDS);

        if (isDuplicate) {
            return NextResponse.json({ success: true, counted: false, via: 'redis' });
        }

        // ── Layer 2: If Redis is not configured, try DB dedup ──
        const redisAvailable = isDuplicate !== false || (await checkRedisAvailable());

        if (!redisAvailable) {
            // Fallback: DB-based dedup via blog_view_logs table
            try {
                const existing = await db.queryOne<{ id: number }>(
                    `SELECT id FROM blog_view_logs 
                     WHERE blog_id = $1::uuid AND ip_hash = $2 
                       AND viewed_at > NOW() - INTERVAL '24 hours'
                     LIMIT 1`,
                    [blogId, ipHash]
                );

                if (existing) {
                    return NextResponse.json({ success: true, counted: false, via: 'db' });
                }

                // Log for future dedup
                await db.execute(
                    `INSERT INTO blog_view_logs (blog_id, ip_hash) VALUES ($1::uuid, $2)`,
                    [blogId, ipHash]
                );
            } catch {
                // blog_view_logs table doesn't exist — skip dedup, just count
            }
        }

        // ── Increment the view counter (atomic) ──
        await db.execute(
            `UPDATE blogs SET views = COALESCE(views, 0) + 1 WHERE id = $1::uuid`,
            [blogId]
        );

        return NextResponse.json({ success: true, counted: true });
    } catch (error: any) {
        console.error('[api/views] Error:', error.message);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

/**
 * Quick check if Redis is available (cached per request)
 */
async function checkRedisAvailable(): Promise<boolean> {
    try {
        const { getRedis } = await import('@/lib/redis');
        return getRedis() !== null;
    } catch {
        return false;
    }
}
