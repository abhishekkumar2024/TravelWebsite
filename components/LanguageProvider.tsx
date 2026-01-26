'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (en: string, hi: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>('en');

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('language') as Language;
        if (saved === 'en' || saved === 'hi') {
            setLangState(saved);
        }
        setMounted(true);
    }, []);

    const setLang = (newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem('language', newLang);
        document.body.classList.toggle('hindi', newLang === 'hi');
    };

    const t = (en: string, hi: string) => (lang === 'hi' ? hi : en);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
