'use server';

/**
 * TharMate Queries — Database Abstraction Layer
 * 
 * Handles all TharMate CRUD operations:
 * - Fetching active plans (with filters)
 * - Creating / updating / cancelling plans
 * - Join requests (create, accept, decline)
 * - Counting companions
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────

export interface TharMatePlan {
    id: string;
    userId: string;
    title: string;
    description: string;
    destination: string;
    meetingPoint: string | null;
    planDate: string;     // ISO date string
    planTime: string | null;
    maxCompanions: number;
    vibe: string[];
    status: 'active' | 'completed' | 'cancelled' | 'expired';
    isSpark: boolean;
    createdAt: string;
    updatedAt: string;
    expiresAt: string | null;
    // Joined fields
    authorName: string | null;
    authorImage: string | null;
    authorSlug: string | null;
    companionCount: number;
    requestCount: number;
}

export interface TharMateRequest {
    id: string;
    planId: string;
    requesterId: string;
    message: string | null;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
    // Joined fields
    requesterName: string | null;
    requesterImage: string | null;
}

// ─── Mappers ────────────────────────────────────────────────────

function mapRowToPlan(row: any): TharMatePlan {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        destination: row.destination,
        meetingPoint: row.meeting_point,
        planDate: row.plan_date,
        planTime: row.plan_time,
        maxCompanions: row.max_companions || 3,
        vibe: row.vibe || [],
        status: row.status,
        isSpark: row.is_spark || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        authorName: row.author_name || null,
        authorImage: row.author_image || null,
        authorSlug: row.author_slug || null,
        companionCount: parseInt(row.companion_count || '0', 10),
        requestCount: parseInt(row.request_count || '0', 10),
    };
}

function mapRowToRequest(row: any): TharMateRequest {
    return {
        id: row.id,
        planId: row.plan_id,
        requesterId: row.requester_id,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        requesterName: row.requester_name || null,
        requesterImage: row.requester_image || null,
    };
}

// ─── Plan Queries ───────────────────────────────────────────────

/**
 * Fetch active plans with optional destination filter.
 * Includes author info and companion counts.
 */
export async function fetchTharMatePlans(options?: {
    destination?: string;
    limit?: number;
    offset?: number;
}): Promise<TharMatePlan[]> {
    const { destination, limit = 20, offset = 0 } = options || {};

    try {
        let whereClause = `WHERE tp.status = 'active' AND tp.plan_date >= CURRENT_DATE`;
        const params: any[] = [];
        let paramIndex = 1;

        if (destination) {
            whereClause += ` AND tp.destination = $${paramIndex}`;
            params.push(destination);
            paramIndex++;
        }

        params.push(limit, offset);

        const result = await db.query<any>(
            `SELECT 
                tp.*,
                u.name AS author_name,
                u.image AS author_image,
                a.slug AS author_slug,
                COALESCE(acc.companion_count, 0) AS companion_count,
                COALESCE(req.request_count, 0) AS request_count
            FROM tharmate_plans tp
            LEFT JOIN users u ON u.id = tp.user_id
            LEFT JOIN authors a ON a.id = tp.user_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS companion_count 
                FROM tharmate_requests 
                WHERE plan_id = tp.id AND status = 'accepted'
            ) acc ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS request_count 
                FROM tharmate_requests 
                WHERE plan_id = tp.id AND status = 'pending'
            ) req ON true
            ${whereClause}
            ORDER BY tp.is_spark DESC, tp.plan_date ASC, tp.plan_time ASC NULLS LAST
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        return result.rows.map(mapRowToPlan);
    } catch (error: any) {
        console.error('[TharMate] fetchPlans error:', error.message);
        return [];
    }
}

/**
 * Fetch a single plan by ID (with full details).
 */
export async function fetchTharMatePlanById(planId: string): Promise<TharMatePlan | null> {
    try {
        const row = await db.queryOne<any>(
            `SELECT 
                tp.*,
                u.name AS author_name,
                u.image AS author_image,
                a.slug AS author_slug,
                COALESCE(acc.companion_count, 0) AS companion_count,
                COALESCE(req.request_count, 0) AS request_count
            FROM tharmate_plans tp
            LEFT JOIN users u ON u.id = tp.user_id
            LEFT JOIN authors a ON a.id = tp.user_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS companion_count 
                FROM tharmate_requests 
                WHERE plan_id = tp.id AND status = 'accepted'
            ) acc ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS request_count 
                FROM tharmate_requests 
                WHERE plan_id = tp.id AND status = 'pending'
            ) req ON true
            WHERE tp.id = $1::uuid`,
            [planId]
        );

        return row ? mapRowToPlan(row) : null;
    } catch (error: any) {
        console.error('[TharMate] fetchPlanById error:', error.message);
        return null;
    }
}

/**
 * Fetch user's own plans.
 */
export async function fetchUserPlans(userId: string): Promise<TharMatePlan[]> {
    try {
        const result = await db.query<any>(
            `SELECT 
                tp.*,
                u.name AS author_name,
                u.image AS author_image,
                a.slug AS author_slug,
                COALESCE(acc.companion_count, 0) AS companion_count,
                COALESCE(req.request_count, 0) AS request_count
            FROM tharmate_plans tp
            LEFT JOIN users u ON u.id = tp.user_id
            LEFT JOIN authors a ON a.id = tp.user_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS companion_count 
                FROM tharmate_requests 
                WHERE plan_id = tp.id AND status = 'accepted'
            ) acc ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS request_count 
                FROM tharmate_requests 
                WHERE plan_id = tp.id AND status = 'pending'
            ) req ON true
            WHERE tp.user_id = $1::uuid
            ORDER BY tp.created_at DESC`,
            [userId]
        );

        return result.rows.map(mapRowToPlan);
    } catch (error: any) {
        console.error('[TharMate] fetchUserPlans error:', error.message);
        return [];
    }
}

/**
 * Create a new travel plan.
 */
export async function createTharMatePlan(payload: {
    userId: string;
    title: string;
    description: string;
    destination: string;
    meetingPoint?: string;
    planDate: string;
    planTime?: string;
    maxCompanions?: number;
    vibe?: string[];
}): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
        const row = await db.executeOne<{ id: string }>(
            `INSERT INTO tharmate_plans 
                (user_id, title, description, destination, meeting_point, plan_date, plan_time, max_companions, vibe)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id`,
            [
                payload.userId,
                payload.title,
                payload.description,
                payload.destination,
                payload.meetingPoint || null,
                payload.planDate,
                payload.planTime || null,
                payload.maxCompanions || 3,
                payload.vibe || [],
            ]
        );
        return { data: row, error: null };
    } catch (error: any) {
        console.error('[TharMate] createPlan error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Cancel a plan (only owner can cancel).
 */
export async function cancelTharMatePlan(planId: string, userId: string): Promise<{ error: string | null }> {
    try {
        await db.execute(
            `UPDATE tharmate_plans 
             SET status = 'cancelled', updated_at = NOW() 
             WHERE id = $1::uuid AND user_id = $2::uuid`,
            [planId, userId]
        );
        return { error: null };
    } catch (error: any) {
        console.error('[TharMate] cancelPlan error:', error.message);
        return { error: error.message };
    }
}

// ─── Request Queries ────────────────────────────────────────────

/**
 * Send a join request for a plan.
 */
export async function createJoinRequest(payload: {
    planId: string;
    requesterId: string;
    message?: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
    try {
        // Check if user is the plan owner
        const plan = await db.queryOne<{ user_id: string; status: string; max_companions: number }>(
            `SELECT user_id, status, max_companions FROM tharmate_plans WHERE id = $1::uuid`,
            [payload.planId]
        );

        if (!plan) return { data: null, error: 'Plan not found' };
        if (plan.status !== 'active') return { data: null, error: 'Plan is no longer active' };
        if (plan.user_id === payload.requesterId) return { data: null, error: 'You cannot join your own plan' };

        // Check if already at max companions
        const countRow = await db.queryOne<{ cnt: string }>(
            `SELECT COUNT(*) AS cnt FROM tharmate_requests 
             WHERE plan_id = $1::uuid AND status = 'accepted'`,
            [payload.planId]
        );
        const currentCount = parseInt(countRow?.cnt || '0', 10);
        if (currentCount >= plan.max_companions) {
            return { data: null, error: 'This plan is already full' };
        }

        const row = await db.executeOne<{ id: string }>(
            `INSERT INTO tharmate_requests (plan_id, requester_id, message)
             VALUES ($1::uuid, $2::uuid, $3)
             ON CONFLICT (plan_id, requester_id) DO NOTHING
             RETURNING id`,
            [payload.planId, payload.requesterId, payload.message || null]
        );

        if (!row) return { data: null, error: 'You have already requested to join this plan' };
        return { data: row, error: null };
    } catch (error: any) {
        console.error('[TharMate] createJoinRequest error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Fetch requests for a plan (only plan owner should call this).
 */
export async function fetchPlanRequests(planId: string): Promise<TharMateRequest[]> {
    try {
        const result = await db.query<any>(
            `SELECT 
                r.*,
                u.name AS requester_name,
                u.image AS requester_image
            FROM tharmate_requests r
            LEFT JOIN users u ON u.id = r.requester_id
            WHERE r.plan_id = $1::uuid
            ORDER BY r.created_at DESC`,
            [planId]
        );
        return result.rows.map(mapRowToRequest);
    } catch (error: any) {
        console.error('[TharMate] fetchPlanRequests error:', error.message);
        return [];
    }
}

/**
 * Accept or decline a join request (only plan owner).
 */
export async function updateRequestStatus(
    requestId: string,
    planOwnerId: string,
    newStatus: 'accepted' | 'declined'
): Promise<{ error: string | null }> {
    try {
        // Verify ownership
        const request = await db.queryOne<{ plan_id: string }>(
            `SELECT plan_id FROM tharmate_requests WHERE id = $1::uuid`,
            [requestId]
        );
        if (!request) return { error: 'Request not found' };

        const plan = await db.queryOne<{ user_id: string }>(
            `SELECT user_id FROM tharmate_plans WHERE id = $1::uuid`,
            [request.plan_id]
        );
        if (!plan || plan.user_id !== planOwnerId) {
            return { error: 'Not authorized' };
        }

        await db.execute(
            `UPDATE tharmate_requests 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2::uuid`,
            [newStatus, requestId]
        );
        return { error: null };
    } catch (error: any) {
        console.error('[TharMate] updateRequestStatus error:', error.message);
        return { error: error.message };
    }
}

/**
 * Check if user has already requested to join a plan.
 */
export async function checkExistingRequest(planId: string, userId: string): Promise<TharMateRequest | null> {
    try {
        const row = await db.queryOne<any>(
            `SELECT r.*, u.name AS requester_name, u.image AS requester_image
             FROM tharmate_requests r
             LEFT JOIN users u ON u.id = r.requester_id
             WHERE r.plan_id = $1::uuid AND r.requester_id = $2::uuid`,
            [planId, userId]
        );
        return row ? mapRowToRequest(row) : null;
    } catch (error: any) {
        console.error('[TharMate] checkExistingRequest error:', error.message);
        return null;
    }
}

/**
 * Get count of active plans (for badge in navbar).
 */
export async function getActivePlanCount(): Promise<number> {
    try {
        const row = await db.queryOne<{ cnt: string }>(
            `SELECT COUNT(*) AS cnt FROM tharmate_plans 
             WHERE status = 'active' AND plan_date >= CURRENT_DATE`
        );
        return parseInt(row?.cnt || '0', 10);
    } catch (error: any) {
        console.error('[TharMate] getActivePlanCount error:', error.message);
        return 0;
    }
}
