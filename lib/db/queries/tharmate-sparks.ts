'use server';

/**
 * TharMate Spark Queries — Companion Request System
 * 
 * A "Spark" is a connection request from one traveler to another.
 * Flow: Send Spark → Pending → Accept (creates Desert Room) or Decline
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────

export interface TharMateSpark {
    id: string;
    planId: string;
    senderId: string;
    receiverId: string;
    message: string | null;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    createdAt: string;
    respondedAt: string | null;
    // Joined fields
    senderName: string | null;
    senderImage: string | null;
    receiverName: string | null;
    receiverImage: string | null;
    planTitle: string | null;
    planDestination: string | null;
}

function mapRowToSpark(row: any): TharMateSpark {
    return {
        id: row.id,
        planId: row.plan_id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        respondedAt: row.responded_at,
        senderName: row.sender_name || null,
        senderImage: row.sender_image || null,
        receiverName: row.receiver_name || null,
        receiverImage: row.receiver_image || null,
        planTitle: row.plan_title || null,
        planDestination: row.plan_destination || null,
    };
}

// ─── Create Spark ───────────────────────────────────────────────

export async function createSpark(payload: {
    planId: string;
    senderId: string;
    message?: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
        // Get the plan to find the receiver
        const plan = await db.queryOne<{ user_id: string; status: string }>(
            `SELECT user_id, status FROM tharmate_plans WHERE id = $1::uuid`,
            [payload.planId]
        );

        if (!plan) return { data: null, error: 'Plan not found' };
        if (plan.status !== 'active') return { data: null, error: 'Plan is no longer active' };
        if (plan.user_id === payload.senderId) return { data: null, error: 'You cannot spark your own plan' };

        // Check for existing spark
        const existing = await db.queryOne<{ id: string; status: string }>(
            `SELECT id, status FROM tharmate_sparks WHERE plan_id = $1::uuid AND sender_id = $2::uuid`,
            [payload.planId, payload.senderId]
        );

        if (existing) {
            return { data: null, error: "You've already sent a Spark for this plan" };
        }

        const row = await db.executeOne<{ id: string }>(
            `INSERT INTO tharmate_sparks (plan_id, sender_id, receiver_id, message)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
             RETURNING id`,
            [payload.planId, payload.senderId, plan.user_id, payload.message || null]
        );

        return { data: row, error: null };
    } catch (error: any) {
        console.error('[TharMate] createSpark error:', error.message);
        return { data: null, error: error.message };
    }
}

// ─── Fetch Sparks ───────────────────────────────────────────────

/**
 * Get sparks received by a user (pending ones).
 */
export async function fetchReceivedSparks(userId: string): Promise<TharMateSpark[]> {
    try {
        const result = await db.query<any>(
            `SELECT 
                s.*,
                su.name AS sender_name,
                su.image AS sender_image,
                ru.name AS receiver_name,
                ru.image AS receiver_image,
                tp.title AS plan_title,
                tp.destination AS plan_destination
            FROM tharmate_sparks s
            LEFT JOIN users su ON su.id = s.sender_id
            LEFT JOIN users ru ON ru.id = s.receiver_id
            LEFT JOIN tharmate_plans tp ON tp.id = s.plan_id
            WHERE s.receiver_id = $1::uuid AND s.status = 'pending'
            ORDER BY s.created_at DESC`,
            [userId]
        );
        return result.rows.map(mapRowToSpark);
    } catch (error: any) {
        console.error('[TharMate] fetchReceivedSparks error:', error.message);
        return [];
    }
}

/**
 * Get sparks sent by a user.
 */
export async function fetchSentSparks(userId: string): Promise<TharMateSpark[]> {
    try {
        const result = await db.query<any>(
            `SELECT 
                s.*,
                su.name AS sender_name,
                su.image AS sender_image,
                ru.name AS receiver_name,
                ru.image AS receiver_image,
                tp.title AS plan_title,
                tp.destination AS plan_destination
            FROM tharmate_sparks s
            LEFT JOIN users su ON su.id = s.sender_id
            LEFT JOIN users ru ON ru.id = s.receiver_id
            LEFT JOIN tharmate_plans tp ON tp.id = s.plan_id
            WHERE s.sender_id = $1::uuid
            ORDER BY s.created_at DESC`,
            [userId]
        );
        return result.rows.map(mapRowToSpark);
    } catch (error: any) {
        console.error('[TharMate] fetchSentSparks error:', error.message);
        return [];
    }
}

// ─── Respond to Spark ───────────────────────────────────────────

/**
 * Accept or decline a spark.
 * On accept → auto-creates a 24h Desert Room linking both travelers + the plan.
 */
export async function respondToSpark(
    sparkId: string,
    userId: string,
    action: 'accept' | 'decline'
): Promise<{ data: TharMateSpark | null; roomId?: string; error: string | null }> {
    try {
        // Verify the spark belongs to this user
        const spark = await db.queryOne<any>(
            `SELECT s.*, tp.destination AS plan_destination, tp.title AS plan_title
             FROM tharmate_sparks s
             LEFT JOIN tharmate_plans tp ON tp.id = s.plan_id
             WHERE s.id = $1::uuid`,
            [sparkId]
        );

        if (!spark) return { data: null, error: 'Spark not found' };
        if (spark.receiver_id !== userId) return { data: null, error: 'Not authorized' };
        if (spark.status !== 'pending') return { data: null, error: 'Spark already responded to' };

        const newStatus = action === 'accept' ? 'accepted' : 'declined';

        // Atomic conditional update — prevents race condition on double-click.
        // Only updates if status is still 'pending'. Returns null if already responded.
        const updated = await db.executeOne<{ id: string }>(
            `UPDATE tharmate_sparks 
             SET status = $1, responded_at = NOW() 
             WHERE id = $2::uuid AND status = 'pending'
             RETURNING id`,
            [newStatus, sparkId]
        );

        if (!updated) {
            return { data: null, error: 'Spark already responded to' };
        }

        let roomId: string | undefined;

        // On accept → create a Desert Room for the two travelers
        if (action === 'accept') {
            const destination = spark.plan_destination || 'rajasthan';
            const planTitle = spark.plan_title || 'Travel Plans';

            const roomRow = await db.executeOne<{ id: string }>(
                `INSERT INTO tharmate_rooms (
                    creator_id, partner_id, destination, title, 
                    plan_id, spark_id, room_type, 
                    expires_at, status, is_active, duration, max_members, current_members
                ) VALUES (
                    $1::uuid, $2::uuid, $3, $4,
                    $5::uuid, $6::uuid, 'desert_room',
                    NOW() + INTERVAL '24 hours', 'active', true, '24h', 2, 2
                ) RETURNING id`,
                [
                    spark.receiver_id,  // Room creator = who accepted
                    spark.sender_id,    // Partner = who sent the spark
                    destination,
                    `💬 ${planTitle}`,
                    spark.plan_id,
                    sparkId,
                ]
            );

            if (roomRow) {
                roomId = roomRow.id;

                // Add system message announcing the connection
                await db.execute(
                    `INSERT INTO tharmate_room_messages (room_id, sender_id, message, message_type)
                     VALUES ($1::uuid, $2::uuid, $3, 'system')`,
                    [roomId, userId, `Spark accepted! You're now connected for ${planTitle}. This room expires in 24 hours.`]
                );
            }
        }

        return {
            data: mapRowToSpark({ ...spark, status: newStatus, responded_at: new Date().toISOString() }),
            roomId,
            error: null,
        };
    } catch (error: any) {
        console.error('[TharMate] respondToSpark error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Check if a user has already sent a spark for a specific plan.
 */
export async function hasUserSparked(planId: string, userId: string): Promise<{ sparked: boolean; status?: string }> {
    try {
        const row = await db.queryOne<{ status: string }>(
            `SELECT status FROM tharmate_sparks WHERE plan_id = $1::uuid AND sender_id = $2::uuid`,
            [planId, userId]
        );
        return row ? { sparked: true, status: row.status } : { sparked: false };
    } catch (error: any) {
        console.error('[TharMate] hasUserSparked error:', error.message);
        return { sparked: false };
    }
}

/**
 * Get the count of pending sparks for a user (for notification badge).
 */
export async function getPendingSparkCount(userId: string): Promise<number> {
    try {
        const row = await db.queryOne<{ cnt: string }>(
            `SELECT COUNT(*) AS cnt FROM tharmate_sparks 
             WHERE receiver_id = $1::uuid AND status = 'pending'`,
            [userId]
        );
        return parseInt(row?.cnt || '0', 10);
    } catch (error: any) {
        console.error('[TharMate] getPendingSparkCount error:', error.message);
        return 0;
    }
}
