/**
 * TharMate Validators — Zod Schemas for All User Inputs
 * 
 * Centralized validation for:
 *   - Plan creation / editing
 *   - Pulse messages (Place Pulse feed)
 *   - Chat messages (Desert Room)
 *   - Spark requests
 *   - Room creation
 * 
 * Usage:
 *   const result = CreatePlanSchema.safeParse(body);
 *   if (!result.success) return { error: result.error.issues[0].message };
 */

import { z } from 'zod';

// ─── Shared Refinements ─────────────────────────────────────────

const noHtmlTags = (val: string) => !/<[^>]*>/.test(val);
const noScriptContent = (val: string) => !/javascript:|on\w+=/i.test(val);

const safeTextString = z.string()
    .trim()
    .refine(noHtmlTags, { message: 'HTML tags are not allowed' })
    .refine(noScriptContent, { message: 'Script content is not allowed' });

// ─── Plan Schemas ───────────────────────────────────────────────

export const CreatePlanSchema = z.object({
    destination: z.string().min(2, 'Destination is required').max(100).trim().toLowerCase(),
    title: z.string().min(3, 'Title must be at least 3 characters').max(100).trim()
        .refine(noHtmlTags, { message: 'HTML tags are not allowed' }),
    description: z.string().min(10, 'Description must be at least 10 characters').max(500).trim()
        .refine(noHtmlTags, { message: 'HTML tags are not allowed' }),
    travel_date: z.string().min(1, 'Travel date is required'),
    travel_time: z.string().optional(),
    looking_for: z.string().max(200).trim().optional(),
    max_companions: z.number().int().min(1).max(10).optional().default(1),
    tags: z.array(z.string().max(20)).max(5).optional(),
    plan_type: z.enum(['adventure', 'cultural', 'photography', 'food', 'spiritual', 'general']).optional(),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

// ─── Pulse Schemas ──────────────────────────────────────────────

export const PulseMessageSchema = z.object({
    destination: z.string().min(2, 'Destination is required').max(100).trim().toLowerCase(),
    message: z.string().min(3, 'Message must be at least 3 characters').max(300).trim()
        .refine(noHtmlTags, { message: 'HTML tags are not allowed' }),
    tag: z.enum(['tip', 'photo', 'question', 'alert', 'joinme'], {
        message: 'Invalid tag type',
    }),
    photo_url: z.string().url('Invalid photo URL').optional()
        .refine(
            (url) => !url || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes('cloudinary') || url.includes('res.cloudinary'),
            { message: 'Only image URLs from known CDNs are allowed' }
        ),
});

export type PulseMessageInput = z.infer<typeof PulseMessageSchema>;

// ─── Chat Message Schemas ───────────────────────────────────────

export const ChatMessageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long').trim()
        .refine(noHtmlTags, { message: 'HTML tags are not allowed' }),
    messageType: z.enum(['text', 'emoji', 'photo', 'image', 'gif']).optional().default('text'),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

// ─── Spark Schemas ──────────────────────────────────────────────

export const CreateSparkSchema = z.object({
    planId: z.string().uuid('Invalid plan ID'),
    message: z.string().max(300).trim().optional()
        .transform(val => val || undefined),
});

export const RespondSparkSchema = z.object({
    sparkId: z.string().uuid('Invalid spark ID'),
    action: z.enum(['accept', 'decline'], {
        message: 'Action must be accept or decline',
    }),
});

export type CreateSparkInput = z.infer<typeof CreateSparkSchema>;
export type RespondSparkInput = z.infer<typeof RespondSparkSchema>;

// ─── Room Schemas ───────────────────────────────────────────────

export const CreateRoomSchema = z.object({
    destination: z.string().min(2, 'Destination is required').max(100).trim().toLowerCase(),
    title: z.string().min(3, 'Title must be at least 3 characters').max(80, 'Title too long (max 80 chars)').trim()
        .refine(noHtmlTags, { message: 'HTML tags are not allowed' }),
    description: z.string().max(200).trim().optional()
        .transform(val => val || undefined),
    maxMembers: z.coerce.number().int().min(2, 'Minimum 2 members').max(30, 'Maximum 30 members').optional().default(10),
    duration: z.enum(['1h', '3h', '6h', '24h'], {
        message: 'Duration must be 1h, 3h, 6h, or 24h',
    }),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

// ─── Helper: Extract First Error ────────────────────────────────

/**
 * Parse and validate input. Returns { data, error }.
 * 
 * Usage:
 *   const { data, error } = validate(CreatePlanSchema, body);
 *   if (error) return NextResponse.json({ error }, { status: 400 });
 */
export function validate<T>(schema: z.ZodSchema<T>, input: unknown): { data: T | null; error: string | null } {
    const result = schema.safeParse(input);
    if (result.success) {
        return { data: result.data, error: null };
    }
    // Return the first human-readable error
    const firstIssue = result.error.issues[0];
    const field = firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
    return { data: null, error: `${field}${firstIssue.message}` };
}
