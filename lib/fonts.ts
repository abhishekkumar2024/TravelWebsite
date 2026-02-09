import { Outfit } from 'next/font/google';
import { Noto_Sans_Devanagari } from 'next/font/google';

// Primary font for English content
export const outfit = Outfit({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    display: 'swap',
    variable: '--font-outfit',
    preload: true,
});

// Font for Hindi content
export const notoSansDevanagari = Noto_Sans_Devanagari({
    subsets: ['devanagari'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-noto-sans-devanagari',
    preload: false, // Only preload when needed
});
