import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CamelThar - Rajasthan Travel Guide',
        short_name: 'CamelThar',
        description: 'Your gateway to Rajasthan travel stories, destination guides, and insider tips.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fffbf0', // matches bg-sand/10 or similar light theme
        theme_color: '#cd853f', // matches desert-gold/peru
        orientation: 'portrait',
        icons: [
            {
                src: '/logo-round.png?v=4',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo-round.png?v=4',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
