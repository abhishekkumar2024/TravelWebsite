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
            'react-dropzone',
        ],
        // Treat pg as a server-only external package (prevents client bundling)
        serverComponentsExternalPackages: ['pg'],
    },

    // Webpack config: prevent Node.js built-in modules from breaking client bundle
    // The pg driver (used by SupabaseProvider) depends on fs, net, tls, dns
    // These are server-only but Webpack tries to resolve them during bundling
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                dns: false,
                child_process: false,
                'pg-native': false,
            };
        }
        return config;
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
            // ── Security Headers (all pages) ──
            // These improve SEO trust scores in Google PageSpeed & Lighthouse
            {
                source: '/(.*)',
                headers: [
                    // Prevent MIME type sniffing (XSS mitigation)
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Prevent clickjacking — only allow framing from own domain
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    // Control referrer info sent with outbound links
                    // 'strict-origin-when-cross-origin' = sends full URL for same-origin, only origin for cross-origin
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Restrict browser features the site doesn't need
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    // Enable DNS prefetching for faster external resource loading
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                    // HSTS — enforce HTTPS for 2 years (required for preload list)
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                    // CSP frame-ancestors — modern replacement for X-Frame-Options
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
                ],
            },

            // ── Caching Headers ──
            {
                // Blog pages: CDN cache must match ISR revalidate (60s)
                // On-demand revalidation (via /api/revalidate) also purges CDN cache
                source: '/blogs/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=60, stale-while-revalidate=300',
                    },
                ],
            },
            {
                // Destination pages: cache for 5 minutes (rarely updated)
                source: '/destinations/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=300, stale-while-revalidate=600',
                    },
                ],
            },
            {
                // RSS feed: cache for 1 hour (matches revalidate in route)
                source: '/feed.xml',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=3600, stale-while-revalidate=600',
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