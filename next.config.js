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
        // Enabled for better performance with Cloudinary and local images
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 60,
    },

    // Enable compression
    compress: true,

    // Optimize package imports - reduces bundle size by tree-shaking
    experimental: {
        optimizePackageImports: [
            '@tiptap/react',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
            '@tiptap/starter-kit',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            '@tiptap/extension-underline',
            '@tiptap/extension-placeholder',
            '@supabase/supabase-js',
            'react-dropzone',
        ],
    },

    // Enable React Strict Mode for better debugging
    reactStrictMode: true,

    // Enable SWC minification for faster builds
    swcMinify: true,

    // Reduce bundle size by avoiding unnecessary polyfills
    modularizeImports: {
        '@tiptap/react': {
            transform: '@tiptap/react/{{member}}',
        },
    },

    // Security and caching headers
    async headers() {
        return [
            {
                // Apply to blog pages - cache for 1 hour, stale-while-revalidate for 1 day
                source: '/blog/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=3600, stale-while-revalidate=86400',
                    },
                ],
            },
            {
                // Apply to destination pages
                source: '/destinations/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=3600, stale-while-revalidate=86400',
                    },
                ],
            },
            {
                // Apply to blogs listing page
                source: '/blogs/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=300, stale-while-revalidate=3600',
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
            {
                // Cache JS and CSS with content hash for 1 year
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    trailingSlash: true,
};

module.exports = nextConfig;
