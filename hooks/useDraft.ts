'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Draft data structure for the submit page
export interface SubmitDraftData {
    destination: string;
    category: string;
    titleEn: string;
    titleHi: string;
    excerptEn: string;
    excerptHi: string;
    contentEn: string;
    contentHi: string;
    coverImage: string | null;
    uploadedImages: string[];
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    savedAt: number; // timestamp
}

// Draft data structure for the edit page (includes blog id)
export interface EditDraftData extends SubmitDraftData {
    blogId: string;
}

const DRAFT_KEY_SUBMIT = 'travel_blog_draft_submit';
const DRAFT_KEY_EDIT_PREFIX = 'travel_blog_draft_edit_';
const AUTO_SAVE_DELAY = 3000; // Auto-save every 3 seconds after changes

/**
 * Custom hook for managing draft auto-save functionality
 * 
 * @param pageType - 'submit' for new blog, 'edit' for editing existing blog
 * @param blogId - Required for edit page to identify which blog is being edited
 */
export function useDraft(pageType: 'submit' | 'edit', blogId?: string) {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const getDraftKey = useCallback(() => {
        if (pageType === 'submit') {
            return DRAFT_KEY_SUBMIT;
        }
        return `${DRAFT_KEY_EDIT_PREFIX}${blogId}`;
    }, [pageType, blogId]);

    /**
     * Save draft to localStorage
     */
    const saveDraft = useCallback((data: Partial<SubmitDraftData | EditDraftData>) => {
        if (typeof window === 'undefined') return;

        const draftKey = getDraftKey();
        const draftData = {
            ...data,
            savedAt: Date.now(),
            ...(pageType === 'edit' && blogId ? { blogId } : {}),
        };

        try {
            localStorage.setItem(draftKey, JSON.stringify(draftData));
            setLastSaved(new Date());
            setHasDraft(true);
            console.log('Draft saved at', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }, [getDraftKey, pageType, blogId]);

    /**
     * Load draft from localStorage
     */
    const loadDraft = useCallback((): SubmitDraftData | EditDraftData | null => {
        if (typeof window === 'undefined') return null;

        const draftKey = getDraftKey();

        try {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);

                // For edit page, verify the blogId matches
                if (pageType === 'edit' && parsed.blogId !== blogId) {
                    return null;
                }

                setHasDraft(true);
                setLastSaved(new Date(parsed.savedAt));
                return parsed;
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }

        return null;
    }, [getDraftKey, pageType, blogId]);

    /**
     * Clear draft from localStorage
     */
    const clearDraft = useCallback(() => {
        if (typeof window === 'undefined') return;

        const draftKey = getDraftKey();

        try {
            localStorage.removeItem(draftKey);
            setHasDraft(false);
            setLastSaved(null);
            console.log('Draft cleared');
        } catch (error) {
            console.error('Failed to clear draft:', error);
        }
    }, [getDraftKey]);

    /**
     * Schedule auto-save with debounce
     */
    const scheduleAutoSave = useCallback((data: Partial<SubmitDraftData | EditDraftData>) => {
        // Clear any pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);

        // Schedule new save
        saveTimeoutRef.current = setTimeout(() => {
            saveDraft(data);
            setIsSaving(false);
        }, AUTO_SAVE_DELAY);
    }, [saveDraft]);

    /**
     * Check if a draft exists on mount
     */
    useEffect(() => {
        const draft = loadDraft();
        if (draft) {
            setHasDraft(true);
        }
    }, [loadDraft]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Format the last saved time for display
     */
    const getLastSavedText = useCallback(() => {
        if (!lastSaved) return null;

        const now = new Date();
        const diffMs = now.getTime() - lastSaved.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);

        if (diffSecs < 10) return 'Just now';
        if (diffSecs < 60) return `${diffSecs} seconds ago`;
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

        return lastSaved.toLocaleTimeString();
    }, [lastSaved]);

    return {
        saveDraft,
        loadDraft,
        clearDraft,
        scheduleAutoSave,
        lastSaved,
        isSaving,
        hasDraft,
        getLastSavedText,
    };
}

export default useDraft;
