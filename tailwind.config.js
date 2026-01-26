/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'desert-gold': '#D4A853',
                'royal-blue': '#1E3A5F',
                'terracotta': '#C75B39',
                'deep-maroon': '#722F37',
                'sand': '#F5E6D3',
            },
            fontFamily: {
                english: ['Outfit', 'sans-serif'],
                hindi: ['Noto Sans Devanagari', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease forwards',
                'slide-up': 'slideUp 0.6s ease forwards',
                'bounce-slow': 'bounceSlow 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(30px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                bounceSlow: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
};
