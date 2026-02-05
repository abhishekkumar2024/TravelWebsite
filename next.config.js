/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
        ],
        // Keep unoptimized since Cloudinary already handles image optimization
        // This avoids additional server-side processing latency
        unoptimized: true,
    },

    // Enable compression
    compress: true,

    // Optimize package imports
    experimental: {
        optimizePackageImports: ['@tiptap/react', '@tiptap/extension-link', '@tiptap/extension-image'],
    },

    // Security and caching headers
    async headers() {
        return [
            {
                // Apply to blog pages
                source: '/blog/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=60, stale-while-revalidate=3600',
                    },
                ],
            },
            {
                // Cache static assets for 1 year
                source: '/:all*(svg|jpg|jpeg|png|webp|gif|ico|woff|woff2)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
