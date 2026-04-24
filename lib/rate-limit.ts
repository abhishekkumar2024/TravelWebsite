/**
 * Rate Limiting — Redis Counter Pattern
 * 
 * Sliding window rate limiter using Upstash Redis.
 * Falls open (allows traffic) if Redis is unavailable.
 * 
 * Usage:
 *   const { allowed, remaining } = await rateLimit('ip:123', 30, 60);
 *   if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

import { getRedis } from '@/lib/redis';

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
}

/**
 * Check if a request is within rate limits.
 * 
 * @param identifier - Unique key (e.g., IP address, userId)
 * @param limit - Max requests allowed in the window
 * @param windowSecs - Time window in seconds
 */
export async function rateLimit(
    identifier: string,
    limit: number = 30,
    windowSecs: number = 60
): Promise<RateLimitResult> {
    const redis = getRedis();

    // If Redis is not available, fail open (allow all traffic)
    if (!redis) {
        return { allowed: true, remaining: limit, limit };
    }

    try {
        const key = `tharmate:rate:${identifier}`;
        
        // Execute INCR and EXPIRE atomically using a Lua Script
        // This eliminates race conditions during the initial key creation window
        const luaScript = `
            local current = redis.call("INCR", KEYS[1])
            if current == 1 then
                redis.call("EXPIRE", KEYS[1], ARGV[1])
            end
            return current
        `;
        
        const result = await redis.eval(luaScript, [key], [windowSecs]);
        const count = Number(result);

        const remaining = Math.max(0, limit - count);
        return {
            allowed: count <= limit,
            remaining,
            limit,
        };
    } catch (error) {
        console.error('[RateLimit] Error:', error);
        // Fail open — allow traffic if Redis errors
        return { allowed: true, remaining: limit, limit };
    }
}

/**
 * Pre-configured rate limiters for different TharMate routes.
 */
export const RATE_LIMITS = {
    // Plan operations
    createPlan: { limit: 5, window: 60 },      // 5 plans per minute
    readPlans: { limit: 60, window: 60 },       // 60 reads per minute

    // Spark operations
    sendSpark: { limit: 10, window: 60 },       // 10 sparks per minute

    // Pulse operations
    postPulse: { limit: 10, window: 60 },       // 10 posts per minute
    readPulse: { limit: 60, window: 60 },       // 60 reads per minute

    // Chat operations
    sendMessage: { limit: 30, window: 60 },     // 30 messages per minute
    pollMessages: { limit: 30, window: 60 },    // 30 polls per minute (every 2s)

    // Heartbeat
    heartbeat: { limit: 5, window: 60 },        // 5 beats per minute (every 25s)
} as const;
