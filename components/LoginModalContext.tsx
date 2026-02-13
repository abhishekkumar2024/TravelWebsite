'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoginModal from './LoginModal';

export type PendingAction = {
    type: 'like' | 'comment' | 'like_comment' | 'other';
    id?: string; // blogId or commentId
    data?: any; // e.g. comment content
    returnUrl?: string; // URL to redirect back to after login
};

interface LoginModalContextType {
    openLoginModal: (options?: {
        title?: string;
        message?: string;
        onSuccess?: () => void; // Ephemeral callback (e.g. for email login)
        pendingAction?: PendingAction; // Persistent action (e.g. for OAuth redirect)
    }) => void;
    closeLoginModal: () => void;
    pendingAction: PendingAction | null;
    clearPendingAction: () => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title?: string;
        message?: string;
        onSuccess?: () => void;
    }>({});

    const router = useRouter();
    const pathname = usePathname();

    // Persistent pending action state
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    // Initialize pending action from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('post_action_after_login');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.type) {
                        setPendingAction(parsed);

                        // Handle Redirect (Fix for Google Login landing on Home)
                        if (parsed.returnUrl) {
                            // Compare just pathname (strip query params) to avoid redirect loops
                            const returnPath = parsed.returnUrl.split('?')[0];
                            if (returnPath !== window.location.pathname) {
                                // Use replace to avoid history stack buildup
                                router.replace(parsed.returnUrl);
                            }

                            // Scroll to comments section if this is a comment-related action
                            if ((parsed.type === 'comment' || parsed.type === 'like_comment') && parsed.returnUrl.includes('scroll=comments')) {
                                setTimeout(() => {
                                    const el = document.getElementById('comments-section');
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }, 1200); // Wait for page to fully load + CommentSection to render
                            }
                        }
                    } else {
                        localStorage.removeItem('post_action_after_login');
                    }
                } catch (current) {
                    console.error('Failed to parse pending interaction', current);
                    localStorage.removeItem('post_action_after_login');
                }
            }
        }
    }, [router]);

    const openLoginModal = (options: {
        title?: string;
        message?: string;
        onSuccess?: () => void;
        pendingAction?: PendingAction;
    } = {}) => {
        setModalConfig({
            title: options.title,
            message: options.message,
            onSuccess: options.onSuccess
        });

        if (options.pendingAction) {
            const actionWithUrl = {
                ...options.pendingAction,
                returnUrl: options.pendingAction.returnUrl || pathname || window.location.pathname
            };
            setPendingAction(actionWithUrl);
            localStorage.setItem('post_action_after_login', JSON.stringify(actionWithUrl));
        }

        setIsOpen(true);
    };

    const closeLoginModal = () => {
        setIsOpen(false);
        setModalConfig({});
    };

    const handleLoginSuccess = () => {
        if (modalConfig.onSuccess) {
            modalConfig.onSuccess();
        }
        // We do NOT clear pendingAction here automatically, 
        // because the consumer component (LikeButton) needs to consume it.
        // It will call clearPendingAction() when done.

        // However, if the user logged in via Email (not redirect), 
        // the `onSuccess` callback might be sufficient. 
        // But to be safe and consistent, we leave it to the consumer.
    };

    const clearPendingAction = () => {
        setPendingAction(null);
        localStorage.removeItem('post_action_after_login');
    };

    return (
        <LoginModalContext.Provider value={{
            openLoginModal,
            closeLoginModal,
            pendingAction,
            clearPendingAction
        }}>
            {children}
            <LoginModal
                isOpen={isOpen}
                onClose={closeLoginModal}
                onLoginSuccess={handleLoginSuccess}
                title={modalConfig.title}
                message={modalConfig.message}
            />
        </LoginModalContext.Provider>
    );
}

export function useLoginModal() {
    const context = useContext(LoginModalContext);
    if (context === undefined) {
        throw new Error('useLoginModal must be used within a LoginModalProvider');
    }
    return context;
}
