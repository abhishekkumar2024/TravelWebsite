import { Outfit } from 'next/font/google';

// Primary font — English content
export const outfit = Outfit({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    display: 'swap',
    variable: '--font-outfit',
    preload: true,
});
