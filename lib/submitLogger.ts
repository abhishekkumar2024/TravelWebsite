import { supabase } from './supabaseClient';

/**
 * Performance logger for blog submit/edit operations.
 * Tracks timing at each stage and saves to Supabase submit_logs table.
 * 
 * Usage:
 *   const logger = new SubmitLogger('submit', userId, userEmail);
 *   logger.startStage('base64_cleanup');
 *   // ... do work ...
 *   logger.endStage('base64_cleanup');
 *   logger.startStage('database_insert');
 *   // ... do work ...
 *   logger.endStage('database_insert');
 *   await logger.save({ blogId, blogSlug, payloadSizeKB, ... });
 */

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

        // Also log to console for dev visibility
        console.log(`[Submit:${this.action}] ⏱ ${name}: ${duration}ms`);
        return duration;
    }

    /** Get total elapsed time since logger was created */
    getElapsed(): number {
        return Math.round(performance.now() - this.globalStart);
    }

    /** Save the log entry to Supabase (non-blocking) */
    async save(options: SaveOptions = {}): Promise<void> {
        const totalDuration = this.getElapsed();

        // Log summary to console
        console.log(`[Submit:${this.action}] ✅ Total: ${totalDuration}ms`);
        console.table(this.stages);

        try {
            const { error } = await supabase
                .from('submit_logs')
                .insert({
                    user_id: this.userId,
                    user_email: this.userEmail,
                    blog_id: options.blogId || null,
                    blog_slug: options.blogSlug || null,
                    action: this.action,
                    total_duration_ms: totalDuration,
                    stages: this.stages,
                    payload_size_kb: options.payloadSizeKB || null,
                    content_word_count: options.contentWordCount || null,
                    images_count: options.imagesCount || null,
                    orphaned_images_count: options.orphanedImagesCount || null,
                    status: options.status || 'success',
                    error_message: options.errorMessage || null,
                });

            if (error) {
                // Non-critical: don't break the submit flow for logging failures
                console.warn('[SubmitLogger] Failed to save log:', error.message);
            }
        } catch (err) {
            // Silently fail — logging should never break the main flow
            console.warn('[SubmitLogger] Error saving log:', err);
        }
    }
}
