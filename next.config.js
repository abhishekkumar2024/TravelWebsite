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
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
        // Enabled for better performance with Cloudinary and local images
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 31536000,
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


    trailingSlash: true,
};

module.exports = nextConfig;
