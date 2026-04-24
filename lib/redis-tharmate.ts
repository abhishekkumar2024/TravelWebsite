/**
 * Redis TharMate Operations — Cache + Real-time Layer
 * 
 * Handles:
 *   - Plan feed caching (60s TTL)
 *   - Pulse feed caching (30s TTL)
 *   - Online presence (Sorted Set heartbeats)
 *   - Chat messages (Redis List, fast read/write)
 *   - Typing indicators (3s TTL keys)
 *   - Cache invalidation on writes
 * 
 * All operations are SAFE — Redis failures fall back gracefully.
 */

import { getRedis } from '@/lib/redis';

// ─── Plan Feed Cache ────────────────────────────────────────────

const PLAN_CACHE_TTL = 60; // 60 seconds
const PULSE_CACHE_TTL = 30; // 30 seconds

/**
 * Get cached plans for a destination. Returns null on miss.
 */
export async function getCachedPlans(destination: string): Promise<any[] | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
        const key = `tharmate:plans:${destination || 'all'}`;
        const cached = await redis.get<string>(key);
        if (cached) {
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
        return null;
    } catch (e) {
        console.error('[Redis] getCachedPlans failed:', e);
        return null; // Fall through to DB
    }
}

/**
 * Cache plans for a destination.
 */
export async function setCachedPlans(destination: string, plans: any[]): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = `tharmate:plans:${destination || 'all'}`;
        await redis.set(key, JSON.stringify(plans), { ex: PLAN_CACHE_TTL });
    } catch (e) {
        console.error('[Redis] setCachedPlans failed:', e);
    }
}

/**
 * Invalidate plan cache for a destination (on new plan/update).
 */
export async function invalidatePlanCache(destination?: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        if (destination) {
            // Bust specific destination + "all" cache
            await Promise.all([
                redis.del(`tharmate:plans:${destination}`),
                redis.del(`tharmate:plans:all`),
            ]);
        } else {
            // Bust all plan caches (use scan pattern)
            await redis.del(`tharmate:plans:all`);
        }
    } catch (e) {
        console.error('[Redis] invalidatePlanCache failed:', e);
    }
}

// ─── Pulse Feed Cache ───────────────────────────────────────────

export async function getCachedPulse(destination: string): Promise<any[] | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
        const cached = await redis.get<string>(`tharmate:pulse:${destination}`);
        if (cached) {
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
        return null;
    } catch (e) {
        console.error('[Redis] getCachedPulse failed:', e);
        return null;
    }
}

export async function setCachedPulse(destination: string, messages: any[]): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.set(`tharmate:pulse:${destination}`, JSON.stringify(messages), { ex: PULSE_CACHE_TTL });
    } catch (e) {
        console.error('[Redis] setCachedPulse failed:', e);
    }
}

export async function invalidatePulseCache(destination: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.del(`tharmate:pulse:${destination}`);
    } catch (e) {
        console.error('[Redis] invalidatePulseCache failed:', e);
    }
}

const PRESENCE_WINDOW = 30; // 30 seconds — users active in this window are "online"

/**
 * Record a heartbeat for a user at a destination.
 */
export async function recordHeartbeat(userId: string, destination: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const now = Date.now();
        await redis.zadd(`tharmate:online:${destination}`, { score: now, member: userId });
        await redis.set(`tharmate:user:${userId}:heartbeat`, destination, { ex: PRESENCE_WINDOW });
    } catch (e) {
        console.error('[Redis] recordHeartbeat failed:', e);
    }
}

/**
 * Get count of users online at a destination (active in last 30s).
 */
export async function getOnlineCount(destination: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;

    try {
        const cutoff = Date.now() - (PRESENCE_WINDOW * 1000);
        const count = await redis.zcount(`tharmate:online:${destination}`, cutoff, '+inf');
        return count || 0;
    } catch (e) {
        console.error('[Redis] getOnlineCount failed:', e);
        return 0;
    }
}

/**
 * Get total online count across all destinations.
 */
export async function getTotalOnlineCount(): Promise<number> {
    const destinations = ['jaisalmer', 'jaipur', 'udaipur', 'jodhpur', 'pushkar', 'mount-abu', 'bikaner'];
    let total = 0;
    for (const dest of destinations) {
        total += await getOnlineCount(dest);
    }
    return total;
}

/**
 * Record a heartbeat for a user in a specific chat room.
 * Users active in the last 30s are considered "in the room".
 */
export async function recordRoomHeartbeat(roomId: string, userId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const now = Date.now();
        // Add user to the room's presence set with current timestamp
        await redis.zadd(`tharmate:room:${roomId}:presence`, { score: now, member: userId });
        // Set a 40s expiry on the set if no more heartbeats come
        await redis.expire(`tharmate:room:${roomId}:presence`, 40);
    } catch (e) {
        console.error('[Redis] recordRoomHeartbeat failed:', e);
    }
}

/**
 * Get the number of unique active users in a room right now (last 30s).
 */
export async function getRoomPresenceCount(roomId: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return 1; // Fallback

    try {
        const cutoff = Date.now() - (PRESENCE_WINDOW * 1000);
        // First, clean up old members from the set
        await redis.zremrangebyscore(`tharmate:room:${roomId}:presence`, '-inf', cutoff);
        // Get the count of remaining members
        const count = await redis.zcard(`tharmate:room:${roomId}:presence`);
        return count || 1;
    } catch (e) {
        console.error('[Redis] getRoomPresenceCount failed:', e);
        return 1;
    }
}

// ─── Chat Messages (Redis List) ─────────────────────────────────

const MAX_MESSAGES_IN_REDIS = 200; // Keep last 200 messages in Redis

interface RedisChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    message: string;
    messageType: string;
    createdAt: string;
}

/**
 * Push a chat message to Redis (fast write).
 */
export async function pushChatMessage(roomId: string, msg: RedisChatMessage): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = `tharmate:room:${roomId}:msgs`;
        await redis.rpush(key, JSON.stringify(msg));
        // Trim to keep only last N messages in Redis
        await redis.ltrim(key, -MAX_MESSAGES_IN_REDIS, -1);
    } catch (e) {
        console.error('[Redis] pushChatMessage failed:', e);
    }
}

/**
 * Get recent chat messages from Redis.
 */
export async function getChatMessages(roomId: string, limit: number = 50): Promise<RedisChatMessage[]> {
    const redis = getRedis();
    if (!redis) return [];

    try {
        const key = `tharmate:room:${roomId}:msgs`;
        const raw = await redis.lrange(key, -limit, -1);
        return raw.map((item: any) => typeof item === 'string' ? JSON.parse(item) : item);
    } catch (e) {
        console.error('[Redis] getChatMessages failed:', e);
        return [];
    }
}

/**
 * Delete room messages from Redis (on room expiry).
 */
export async function deleteRoomMessages(roomId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.del(`tharmate:room:${roomId}:msgs`);
        // Also clean up typing indicators
        // Note: typing keys auto-expire, but clean up just in case
    } catch (e) {
        console.error('[Redis] deleteRoomMessages failed:', e);
    }
}

// ─── Typing Indicator ───────────────────────────────────────────

/**
 * Set typing indicator for a user in a room (auto-expires in 3s).
 */
export async function setTyping(roomId: string, userId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.set(`tharmate:room:${roomId}:typing:${userId}`, '1', { ex: 3 });
    } catch (e) {
        console.error('[Redis] setTyping failed:', e);
    }
}

/**
 * Check if a user is typing in a room.
 */
export async function isTyping(roomId: string, userId: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
        const result = await redis.exists(`tharmate:room:${roomId}:typing:${userId}`);
        return result === 1;
    } catch (e) {
        console.error('[Redis] isTyping failed:', e);
        return false;
    }
}

// ─── Room Creation Lock ─────────────────────────────────────────

/**
 * Acquire a lock for room creation (prevents duplicate rooms from race conditions).
 * Uses SET NX EX 5 — lock auto-expires after 5 seconds.
 * Returns true if lock was acquired, false if another creation is in progress.
 */
export async function acquireRoomLock(lockKey: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return true; // Fail open — allow creation if Redis is down

    try {
        const result = await redis.set(`tharmate:room:lock:${lockKey}`, '1', { ex: 5, nx: true });
        return result === 'OK';
    } catch (e) {
        console.error('[Redis] acquireRoomLock failed:', e);
        return true; // Fail open
    }
}

/**
 * Release a room creation lock.
 */
export async function releaseRoomLock(lockKey: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.del(`tharmate:room:lock:${lockKey}`);
    } catch (e) {
        console.error('[Redis] releaseRoomLock failed:', e);
    }
}

// ─── Spark Notifications ────────────────────────────────────────

const NOTIFICATION_TTL = 7 * 24 * 3600; // 7 days

interface SparkNotification {
    type: 'spark_received' | 'spark_accepted' | 'spark_declined';
    sparkId: string;
    fromUserId: string;
    fromUserName: string;
    planTitle: string;
    roomId?: string; // Only for accepted sparks
    timestamp: string;
}

/**
 * Push a notification for a user (LPUSH → newest first).
 */
export async function pushNotification(userId: string, notification: SparkNotification): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = `tharmate:notifications:${userId}`;
        await redis.lpush(key, JSON.stringify(notification));
        await redis.ltrim(key, 0, 49); // Keep max 50 notifications
        await redis.expire(key, NOTIFICATION_TTL);
    } catch (e) {
        console.error('[Redis] pushNotification failed:', e);
    }
}

/**
 * Get notifications for a user (most recent first).
 */
export async function getNotifications(userId: string, limit: number = 20): Promise<SparkNotification[]> {
    const redis = getRedis();
    if (!redis) return [];

    try {
        const raw = await redis.lrange(`tharmate:notifications:${userId}`, 0, limit - 1);
        return raw
            .map((item: any) => {
                try { return JSON.parse(typeof item === 'string' ? item : JSON.stringify(item)); } catch { return null; }
            })
            .filter(Boolean);
    } catch (e) {
        console.error('[Redis] getNotifications failed:', e);
        return [];
    }
}

/**
 * Get count of pending notifications.
 */
export async function getNotificationCount(userId: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;

    try {
        return await redis.llen(`tharmate:notifications:${userId}`);
    } catch (e) {
        console.error('[Redis] getNotificationCount failed:', e);
        return 0;
    }
}

/**
 * Clear all notifications for a user (after they've been read).
 */
export async function clearNotifications(userId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        await redis.del(`tharmate:notifications:${userId}`);
    } catch (e) {
        console.error('[Redis] clearNotifications failed:', e);
    }
}

// ─── Anchor Room (Pulse Live Chat) ──────────────────────────────

const ANCHOR_MSG_TTL = 48 * 3600; // 48 hours
const ANCHOR_MAX_MSGS = 500;       // Keep last 500 messages per anchor room

interface AnchorChatMessage {
    id: string;
    anchorId: string;
    senderId: string;
    senderName: string;
    senderImage: string | null;
    message: string;
    messageType: string; // 'text' | 'emoji' | 'image' | 'gif' | 'system'
    createdAt: string;
}

/**
 * Push a message to an anchor room (48hr TTL).
 */
export async function pushAnchorMessage(anchorId: string, msg: AnchorChatMessage): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const key = `tharmate:anchor:${anchorId}:msgs`;
        await redis.rpush(key, JSON.stringify(msg));
        await redis.ltrim(key, -ANCHOR_MAX_MSGS, -1);
        await redis.expire(key, ANCHOR_MSG_TTL);
    } catch (e) {
        console.error('[Redis] pushAnchorMessage failed:', e);
    }
}

/**
 * Get recent messages from an anchor room.
 */
export async function getAnchorMessages(anchorId: string, limit: number = 50): Promise<AnchorChatMessage[]> {
    const redis = getRedis();
    if (!redis) return [];

    try {
        const key = `tharmate:anchor:${anchorId}:msgs`;
        const raw = await redis.lrange(key, -limit, -1);
        return raw.map((item: any) => typeof item === 'string' ? JSON.parse(item) : item);
    } catch (e) {
        console.error('[Redis] getAnchorMessages failed:', e);
        return [];
    }
}

/**
 * Record heartbeat for a user in an anchor room.
 */
export async function recordAnchorHeartbeat(anchorId: string, userId: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const now = Date.now();
        await redis.zadd(`tharmate:anchor:${anchorId}:presence`, { score: now, member: userId });
        await redis.expire(`tharmate:anchor:${anchorId}:presence`, 60);
    } catch (e) {
        console.error('[Redis] recordAnchorHeartbeat failed:', e);
    }
}

/**
 * Get the number of active users in an anchor room (last 30s).
 */
export async function getAnchorPresenceCount(anchorId: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;

    try {
        const cutoff = Date.now() - (PRESENCE_WINDOW * 1000);
        await redis.zremrangebyscore(`tharmate:anchor:${anchorId}:presence`, '-inf', cutoff);
        const count = await redis.zcard(`tharmate:anchor:${anchorId}:presence`);
        return count || 0;
    } catch (e) {
        console.error('[Redis] getAnchorPresenceCount failed:', e);
        return 0;
    }
}

/**
 * Get message count in an anchor room (to show activity level).
 */
export async function getAnchorMessageCount(anchorId: string): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;

    try {
        const count = await redis.llen(`tharmate:anchor:${anchorId}:msgs`);
        return count || 0;
    } catch (e) {
        console.error('[Redis] getAnchorMessageCount failed:', e);
        return 0;
    }
}
