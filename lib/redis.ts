/**
 * Redis Client — Upstash (Serverless-compatible, free tier)
 * 
 * Used for:
 *   - View dedup (24h TTL per IP+blog)
 *   - Rate limiting (future)
 *   - Session caching (future)
 * 
 * Setup:
 *   1. Create free account at https://upstash.com
 *   2. Create a Redis database (choose nearest region)
 *   3. Copy REST URL and Token to .env.local:
 *      UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *      UPSTASH_REDIS_REST_TOKEN=AXxx...
 * 
 * If env vars are missing, Redis is silently disabled (graceful fallback).
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Get the Redis instance (lazy initialization).
 * Returns null if not configured — callers must handle this.
 */
export function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        // Redis not configured — will fall back to DB-based dedup
        return null;
    }

    try {
        redis = new Redis({ url, token });
        return redis;
    } catch (error) {
        console.warn('[Redis] Failed to initialize:', error);
        return null;
    }
}

/**
 * Check if a key exists and set it with TTL if not.
 * Used for dedup: "has this IP viewed this blog?"
 * 
 * @returns true if key already existed (= duplicate), false if new (= count it)
 */
export async function checkAndSet(key: string, ttlSeconds: number): Promise<boolean> {
    const r = getRedis();
    if (!r) return false; // Redis not configured — treat as "not seen" (fallback to DB)

    try {
        // SET key value NX EX ttl — only sets if key doesn't exist
        // Returns "OK" if set, null if key already exists
        const result = await r.set(key, '1', { nx: true, ex: ttlSeconds });
        return result === null; // null = key already existed = duplicate
    } catch (error) {
        console.warn('[Redis] checkAndSet error:', error);
        return false; // On error, allow the view (fail open)
    }
}
