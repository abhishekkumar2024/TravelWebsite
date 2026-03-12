'use server';

/**
 * TharMate Pulse Queries — Place Pulse Feed
 * 
 * The "Place Pulse" is a real-time city feed where travelers share:
 *   - Tips (local knowledge)
 *   - Photos (what it looks like right now)
 *   - Questions (ask fellow travelers)
 *   - Alerts (closures, weather, scams)
 *   - Join Me (spontaneous meetups)
 * 
 * Each message is tied to a destination and has a "helpful" upvote counter.
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────

export type PulseTag = 'tip' | 'photo' | 'question' | 'alert' | 'joinme';

export interface PulseMessage {
    id: string;
    userId: string;
    destination: string;
    message: string;
    tag: PulseTag;
    photoUrl: string | null;
    helpfulCount: number;
    isActive: boolean;
    createdAt: string;
    // Joined fields
    authorName: string | null;
    authorImage: string | null;
}

export interface PulseScore {
    destination: string;
    totalPosts: number;
    tipCount: number;
    photoCount: number;
    questionCount: number;
    alertCount: number;
    joinmeCount: number;
    recentActivity: string | null; // ISO timestamp of last post
}

// ─── Mapper ─────────────────────────────────────────────────────

function mapRowToPulse(row: any): PulseMessage {
    return {
        id: row.id,
        userId: row.user_id,
        destination: row.destination,
        message: row.message,
        tag: row.tag,
        photoUrl: row.photo_url || null,
        helpfulCount: parseInt(row.helpful_count || '0', 10),
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
        authorName: row.author_name || null,
        authorImage: row.author_image || null,
    };
}

// ─── Fetch Pulse Feed ───────────────────────────────────────────

/**
 * Fetch the pulse feed for a destination.
 * Returns latest messages with author info.
 */
export async function fetchPulseFeed(options: {
    destination: string;
    tag?: PulseTag;
    limit?: number;
    offset?: number;
}): Promise<PulseMessage[]> {
    const { destination, tag, limit = 30, offset = 0 } = options;

    try {
        let whereClause = `WHERE p.destination = $1 AND p.is_active = true`;
        const params: any[] = [destination];
        let paramIndex = 2;

        if (tag) {
            whereClause += ` AND p.tag = $${paramIndex}`;
            params.push(tag);
            paramIndex++;
        }

        params.push(limit, offset);

        const result = await db.query<any>(
            `SELECT 
                p.*,
                u.name AS author_name,
                u.image AS author_image
            FROM tharmate_pulse p
            LEFT JOIN users u ON u.id = p.user_id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        return result.rows.map(mapRowToPulse);
    } catch (error: any) {
        console.error('[Pulse] fetchPulseFeed error:', error.message);
        return [];
    }
}

// ─── Create Pulse Message ───────────────────────────────────────

export async function createPulseMessage(payload: {
    userId: string;
    destination: string;
    message: string;
    tag: PulseTag;
    photoUrl?: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
        // Validate tag
        const validTags: PulseTag[] = ['tip', 'photo', 'question', 'alert', 'joinme'];
        if (!validTags.includes(payload.tag)) {
            return { data: null, error: 'Invalid tag' };
        }

        const row = await db.executeOne<{ id: string }>(
            `INSERT INTO tharmate_pulse (user_id, destination, message, tag, photo_url)
             VALUES ($1::uuid, $2, $3, $4, $5)
             RETURNING id`,
            [
                payload.userId,
                payload.destination.trim().toLowerCase(),
                payload.message.trim(),
                payload.tag,
                payload.photoUrl || null,
            ]
        );

        return { data: row, error: null };
    } catch (error: any) {
        console.error('[Pulse] createPulseMessage error:', error.message);
        return { data: null, error: error.message };
    }
}

// ─── Helpful (Upvote) ───────────────────────────────────────────

/**
 * Increment the helpful counter on a pulse message.
 */
export async function markPulseHelpful(pulseId: string): Promise<{ error: string | null }> {
    try {
        await db.execute(
            `UPDATE tharmate_pulse SET helpful_count = helpful_count + 1 WHERE id = $1::uuid`,
            [pulseId]
        );
        return { error: null };
    } catch (error: any) {
        console.error('[Pulse] markPulseHelpful error:', error.message);
        return { error: error.message };
    }
}

// ─── Delete Pulse Message ───────────────────────────────────────

/**
 * Soft delete a pulse message (only the author can delete).
 */
export async function deletePulseMessage(pulseId: string, userId: string): Promise<{ error: string | null }> {
    try {
        const result = await db.execute(
            `UPDATE tharmate_pulse SET is_active = false WHERE id = $1::uuid AND user_id = $2::uuid`,
            [pulseId, userId]
        );
        return { error: null };
    } catch (error: any) {
        console.error('[Pulse] deletePulseMessage error:', error.message);
        return { error: error.message };
    }
}

// ─── Pulse Score (City Vibe) ────────────────────────────────────

/**
 * Get a summary "score" for a destination — post counts by tag.
 * Used for the PulseScoreCard widget.
 */
export async function getPulseScore(destination: string): Promise<PulseScore> {
    try {
        const row = await db.queryOne<any>(
            `SELECT
                COUNT(*) AS total_posts,
                COUNT(*) FILTER (WHERE tag = 'tip') AS tip_count,
                COUNT(*) FILTER (WHERE tag = 'photo') AS photo_count,
                COUNT(*) FILTER (WHERE tag = 'question') AS question_count,
                COUNT(*) FILTER (WHERE tag = 'alert') AS alert_count,
                COUNT(*) FILTER (WHERE tag = 'joinme') AS joinme_count,
                MAX(created_at) AS recent_activity
            FROM tharmate_pulse
            WHERE destination = $1 AND is_active = true
              AND created_at > NOW() - INTERVAL '7 days'`,
            [destination]
        );

        return {
            destination,
            totalPosts: parseInt(row?.total_posts || '0', 10),
            tipCount: parseInt(row?.tip_count || '0', 10),
            photoCount: parseInt(row?.photo_count || '0', 10),
            questionCount: parseInt(row?.question_count || '0', 10),
            alertCount: parseInt(row?.alert_count || '0', 10),
            joinmeCount: parseInt(row?.joinme_count || '0', 10),
            recentActivity: row?.recent_activity || null,
        };
    } catch (error: any) {
        console.error('[Pulse] getPulseScore error:', error.message);
        return {
            destination,
            totalPosts: 0,
            tipCount: 0,
            photoCount: 0,
            questionCount: 0,
            alertCount: 0,
            joinmeCount: 0,
            recentActivity: null,
        };
    }
}

/**
 * Get pulse scores for all major destinations (for comparison).
 */
export async function getAllPulseScores(): Promise<PulseScore[]> {
    const destinations = ['jaisalmer', 'jaipur', 'udaipur', 'jodhpur', 'pushkar', 'mount-abu', 'bikaner'];
    const scores: PulseScore[] = [];

    for (const dest of destinations) {
        scores.push(await getPulseScore(dest));
    }

    return scores;
}
