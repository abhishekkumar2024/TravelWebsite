'use client';

/**
 * LanguageProvider — English-only stub.
 *
 * Hindi support has been removed. This file is kept so that all existing
 * imports don't need to change. The `t()` helper always returns the English
 * string. `lang` is always 'en'. `setLang` is a no-op.
 */

import { createContext, useContext, ReactNode } from 'react';

interface LanguageContextType {
    lang: 'en';
    setLang: (lang: string) => void;
    t: (en: string, hi?: string) => string;
    mounted: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    lang: 'en',
    setLang: () => { },
    t: (en) => en,
    mounted: true,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    return (
        <LanguageContext.Provider
            value={{
                lang: 'en',
                setLang: () => { },
                t: (en) => en,
                mounted: true,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
