'use server';

/**
 * TharMate Room Queries — Desert Rooms (Ephemeral Chat)
 * 
 * Desert Rooms are time-limited chat rooms that auto-expire.
 * Think of them as campfire conversations that vanish at dawn.
 * 
 * Features:
 *   - Create rooms with 1h / 3h / 6h / 24h duration
 *   - Join rooms (max capacity)
 *   - Send messages (text, emoji, photo)
 *   - Rooms auto-expire based on created_at + duration
 *   - Memory Capsules: save a room summary before it vanishes
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────

export type RoomDuration = '1h' | '3h' | '6h' | '24h';
export type MessageType = 'text' | 'emoji' | 'photo' | 'image' | 'gif' | 'system';

export interface DesertRoom {
    id: string;
    creatorId: string;
    destination: string;
    title: string;
    description: string | null;
    maxMembers: number;
    currentMembers: number;
    duration: RoomDuration;
    expiresAt: string;
    isActive: boolean;
    createdAt: string;
    // Joined fields
    creatorName: string | null;
    creatorImage: string | null;
}

export interface RoomMessage {
    id: string;
    roomId: string;
    senderId: string;
    message: string;
    messageType: MessageType;
    createdAt: string;
    // Joined fields
    senderName: string | null;
    senderImage: string | null;
}

// ─── Mappers ────────────────────────────────────────────────────

function mapRowToRoom(row: any): DesertRoom {
    return {
        id: row.id,
        creatorId: row.creator_id,
        destination: row.destination,
        title: row.title,
        description: row.description || null,
        maxMembers: parseInt(row.max_members || '10', 10),
        currentMembers: parseInt(row.current_members || '0', 10),
        duration: row.duration,
        expiresAt: row.expires_at,
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
        creatorName: row.creator_name || null,
        creatorImage: row.creator_image || null,
    };
}

function mapRowToMessage(row: any): RoomMessage {
    return {
        id: row.id,
        roomId: row.room_id,
        senderId: row.sender_id,
        message: row.message,
        messageType: row.message_type || 'text',
        createdAt: row.created_at,
        senderName: row.sender_name || null,
        senderImage: row.sender_image || null,
    };
}

// ─── Duration to Interval ───────────────────────────────────────

function durationToInterval(duration: RoomDuration): string {
    switch (duration) {
        case '1h': return '1 hour';
        case '3h': return '3 hours';
        case '6h': return '6 hours';
        case '24h': return '24 hours';
        default: return '3 hours';
    }
}

// ─── Fetch Active Rooms ─────────────────────────────────────────

export async function fetchActiveRooms(destination?: string): Promise<DesertRoom[]> {
    try {
        let whereClause = `WHERE r.is_active = true AND r.expires_at > NOW()`;
        const params: any[] = [];
        let paramIndex = 1;

        if (destination) {
            whereClause += ` AND r.destination = $${paramIndex}`;
            params.push(destination);
            paramIndex++;
        }

        const result = await db.query<any>(
            `SELECT 
                r.*,
                u.name AS creator_name,
                u.image AS creator_image,
                (SELECT COUNT(*) FROM tharmate_room_messages rm WHERE rm.room_id = r.id) AS message_count
            FROM tharmate_rooms r
            LEFT JOIN users u ON u.id = r.creator_id
            ${whereClause}
            ORDER BY r.created_at DESC
            LIMIT 20`,
            params
        );

        return result.rows.map(mapRowToRoom);
    } catch (error: any) {
        console.error('[Rooms] fetchActiveRooms error:', error.message);
        return [];
    }
}

// ─── Create Room ────────────────────────────────────────────────

export async function createRoom(payload: {
    creatorId: string;
    destination: string;
    title: string;
    description?: string;
    maxMembers?: number;
    duration: RoomDuration;
}): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
        const interval = durationToInterval(payload.duration);

        const row = await db.executeOne<{ id: string }>(
            `INSERT INTO tharmate_rooms (creator_id, destination, title, description, max_members, duration, expires_at)
             VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW() + $7::interval)
             RETURNING id`,
            [
                payload.creatorId,
                payload.destination.trim().toLowerCase(),
                payload.title.trim(),
                payload.description?.trim() || null,
                payload.maxMembers || 10,
                payload.duration,
                interval,
            ]
        );

        return { data: row, error: null };
    } catch (error: any) {
        console.error('[Rooms] createRoom error:', error.message);
        return { data: null, error: error.message };
    }
}

// ─── Join Room ──────────────────────────────────────────────────

export async function joinRoom(roomId: string, userId: string): Promise<{ error: string | null }> {
    try {
        // Check if user already joined this room to avoid duplicate messages and count inflation
        const alreadyJoined = await db.queryOne(
            `SELECT 1 FROM tharmate_room_messages 
             WHERE room_id = $1::uuid AND sender_id = $2::uuid AND message = 'joined the room' AND message_type = 'system'
             LIMIT 1`,
            [roomId, userId]
        );

        if (alreadyJoined) {
            return { error: null };
        }

        // Atomic conditional update — prevents race condition where
        // two users join simultaneously and exceed max_members.
        // The WHERE clause ensures we only increment if:
        //   1. Room exists and is active
        //   2. Room hasn't expired
        //   3. Room isn't full
        const result = await db.executeOne<{ id: string }>(
            `UPDATE tharmate_rooms 
             SET current_members = current_members + 1
             WHERE id = $1::uuid 
               AND is_active = true 
               AND expires_at > NOW() 
               AND current_members < max_members
             RETURNING id`,
            [roomId]
        );

        if (!result) {
            // Figure out why it failed (for better error messages)
            const room = await db.queryOne<{ is_active: boolean; expires_at: string; current_members: number; max_members: number }>(
                `SELECT is_active, expires_at, current_members, max_members FROM tharmate_rooms WHERE id = $1::uuid`,
                [roomId]
            );
            if (!room) return { error: 'Room not found' };
            if (!room.is_active || new Date(room.expires_at) < new Date()) return { error: 'Room expired' };
            if (room.current_members >= room.max_members) return { error: 'Room is full' };
            return { error: 'Unable to join room' };
        }

        // Add system message
        await db.execute(
            `INSERT INTO tharmate_room_messages (room_id, sender_id, message, message_type)
             VALUES ($1::uuid, $2::uuid, 'joined the room', 'system')`,
            [roomId, userId]
        );

        return { error: null };
    } catch (error: any) {
        console.error('[Rooms] joinRoom error:', error.message);
        return { error: error.message };
    }
}

// ─── Send Message ───────────────────────────────────────────────

export async function sendRoomMessage(payload: {
    roomId: string;
    senderId: string;
    message: string;
    messageType?: MessageType;
}): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
        // Verify room is active
        const room = await db.queryOne<{ is_active: boolean; expires_at: string }>(
            `SELECT is_active, expires_at FROM tharmate_rooms WHERE id = $1::uuid`,
            [payload.roomId]
        );

        if (!room || !room.is_active || new Date(room.expires_at) < new Date()) {
            return { data: null, error: 'Room expired' };
        }

        const row = await db.executeOne<{ id: string }>(
            `INSERT INTO tharmate_room_messages (room_id, sender_id, message, message_type)
             VALUES ($1::uuid, $2::uuid, $3, $4)
             RETURNING id`,
            [
                payload.roomId,
                payload.senderId,
                payload.message.trim().slice(0, 2000),
                payload.messageType || 'text',
            ]
        );

        return { data: row, error: null };
    } catch (error: any) {
        console.error('[Rooms] sendRoomMessage error:', error.message);
        return { data: null, error: error.message };
    }
}

// ─── Fetch Room Messages ────────────────────────────────────────

export async function fetchRoomMessages(roomId: string, afterId?: string, limit: number = 50): Promise<RoomMessage[]> {
    try {
        let whereClause = `WHERE rm.room_id = $1::uuid`;
        const params: any[] = [roomId];
        let paramIndex = 2;

        if (afterId) {
            whereClause += ` AND rm.created_at > (SELECT created_at FROM tharmate_room_messages WHERE id = $${paramIndex}::uuid)`;
            params.push(afterId);
            paramIndex++;
        }

        params.push(limit);

        const result = await db.query<any>(
            `SELECT 
                rm.*,
                u.name AS sender_name,
                u.image AS sender_image
            FROM tharmate_room_messages rm
            LEFT JOIN users u ON u.id = rm.sender_id
            ${whereClause}
            ORDER BY rm.created_at ASC
            LIMIT $${paramIndex}`,
            params
        );

        return result.rows.map(mapRowToMessage);
    } catch (error: any) {
        console.error('[Rooms] fetchRoomMessages error:', error.message);
        return [];
    }
}

// ─── Get Room Details (with Lazy Expiry) ────────────────────────

export async function getRoomDetails(roomId: string): Promise<DesertRoom | null> {
    try {
        const row = await db.queryOne<any>(
            `SELECT 
                r.*,
                u.name AS creator_name,
                u.image AS creator_image
            FROM tharmate_rooms r
            LEFT JOIN users u ON u.id = r.creator_id
            WHERE r.id = $1::uuid`,
            [roomId]
        );

        if (!row) return null;

        // Lazy expiry: if room is past expiry but still marked active, expire it now
        if (row.is_active && new Date(row.expires_at) < new Date()) {
            await db.execute(
                `UPDATE tharmate_rooms SET is_active = false WHERE id = $1::uuid`,
                [roomId]
            );
            // Clean up Redis messages (import happens at call site)
            row.is_active = false;
            console.log(`[Rooms] Lazy-expired room ${roomId}`);
        }

        return mapRowToRoom(row);
    } catch (error: any) {
        console.error('[Rooms] getRoomDetails error:', error.message);
        return null;
    }
}

// ─── Expire Old Rooms (Cleanup) ─────────────────────────────────

export async function expireOldRooms(): Promise<number> {
    try {
        const result = await db.execute(
            `UPDATE tharmate_rooms SET is_active = false WHERE expires_at < NOW() AND is_active = true`
        );
        return 0; // Can't easily get count, but it works
    } catch (error: any) {
        console.error('[Rooms] expireOldRooms error:', error.message);
        return 0;
    }
}



