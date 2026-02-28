/**
 * Submit Performance Logger
 * 
 * Migrated from supabase.from('submit_logs') to db.execute()
 * 
 * Usage:
 *   const logger = new SubmitLogger('submit', userId, userEmail);
 *   logger.startStage('base64_cleanup');
 *   // ... do work ...
 *   logger.endStage('base64_cleanup');
 *   await logger.save({ blogId, blogSlug, ... });
 */

import { db } from '@/lib/db';

interface StageEntry {
    name: string;
    duration_ms: number;
}

interface SaveOptions {
    blogId?: string;
    blogSlug?: string;
    payloadSizeKB?: number;
    contentWordCount?: number;
    imagesCount?: number;
    orphanedImagesCount?: number;
    status?: 'success' | 'error' | 'timeout';
    errorMessage?: string;
}

export class SubmitLogger {
    private action: string;
    private userId: string;
    private userEmail: string;
    private stages: StageEntry[] = [];
    private stageStartTimes: Map<string, number> = new Map();
    private globalStart: number;

    constructor(action: 'submit' | 'edit', userId: string, userEmail: string) {
        this.action = action;
        this.userId = userId;
        this.userEmail = userEmail;
        this.globalStart = performance.now();
    }

    /** Mark the start of a named stage */
    startStage(name: string): void {
        this.stageStartTimes.set(name, performance.now());
    }

    /** Mark the end of a named stage and record its duration */
    endStage(name: string): number {
        const start = this.stageStartTimes.get(name);
        if (start === undefined) {
            console.warn(`[SubmitLogger] Stage "${name}" was never started`);
            return 0;
        }
        const duration = Math.round(performance.now() - start);
        this.stages.push({ name, duration_ms: duration });
        this.stageStartTimes.delete(name);
        return duration;
    }

    /** Get total elapsed time since logger was created */
    getElapsed(): number {
        return Math.round(performance.now() - this.globalStart);
    }

    /** Save the log entry to the database (non-blocking) */
    async save(options: SaveOptions = {}): Promise<void> {
        const totalDuration = this.getElapsed();

        try {
            await db.execute(
                `INSERT INTO submit_logs (
                    user_id, user_email, blog_id, blog_slug, action,
                    total_duration_ms, stages, payload_size_kb,
                    content_word_count, images_count, orphaned_images_count,
                    status, error_message
                ) VALUES (
                    $1::uuid, $2, $3, $4, $5,
                    $6, $7::jsonb, $8,
                    $9, $10, $11,
                    $12, $13
                )`,
                [
                    this.userId,
                    this.userEmail,
                    options.blogId || null,
                    options.blogSlug || null,
                    this.action,
                    totalDuration,
                    JSON.stringify(this.stages),
                    options.payloadSizeKB || null,
                    options.contentWordCount || null,
                    options.imagesCount || null,
                    options.orphanedImagesCount || null,
                    options.status || 'success',
                    options.errorMessage || null,
                ]
            );
        } catch (err) {
            // Non-critical: don't break the submit flow for logging failures
            console.warn('[SubmitLogger] Failed to save log:', err);
        }
    }
}
