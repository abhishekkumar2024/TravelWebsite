'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavigationContextType {
    isLoading: boolean;
    currentPage: string;
    setLoading: (loading: boolean) => void;
    setCurrentPage: (page: string) => void;
    startPageTransition: (page: string) => Promise<void>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState('');

    const setLoading = (loading: boolean) => {
        setIsLoading(loading);
    };

    const startPageTransition = async (page: string) => {
        // Prevent rapid switching
        if (isLoading) {
            return;
        }

        setIsLoading(true);
        setCurrentPage(page);
        
        // Small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsLoading(false);
    };

    return (
        <NavigationContext.Provider value={{ 
            isLoading, 
            currentPage, 
            setLoading, 
            setCurrentPage,
            startPageTransition 
        }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
}
