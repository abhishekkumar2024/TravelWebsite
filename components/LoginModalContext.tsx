'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LoginModal from './LoginModal';

export type PendingAction = {
    type: 'like' | 'comment' | 'like_comment' | 'other';
    id?: string; // blogId or commentId
    data?: any; // e.g. comment content
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
                    } else {
                        localStorage.removeItem('post_action_after_login');
                    }
                } catch (current) {
                    console.error('Failed to parse pending interaction', current);
                    localStorage.removeItem('post_action_after_login');
                }
            }
        }
    }, []);

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
            setPendingAction(options.pendingAction);
            localStorage.setItem('post_action_after_login', JSON.stringify(options.pendingAction));
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
