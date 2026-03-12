/**
 * Sanitize HTML — XSS Protection Layer
 * 
 * Wraps DOMPurify for consistent sanitization across all rendered user content.
 * Used in: ChatRoom messages, Pulse feed, Plan descriptions.
 * 
 * Usage:
 *   import { sanitize } from '@/lib/sanitize';
 *   <p>{sanitize(message)}</p>
 */

'use client';

import DOMPurify from 'dompurify';

/**
 * Sanitize user-generated text. Strips ALL HTML tags and attributes.
 * Returns plain text only — no HTML rendering.
 */
export function sanitize(dirty: string | null | undefined): string {
    if (!dirty) return '';
    // ALLOWED_TAGS: [] strips ALL HTML. No tags allowed.
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize but allow basic formatting (bold, italic, links).
 * For cases where you want minimal rich text.
 */
export function sanitizeRich(dirty: string | null | undefined): string {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
}
