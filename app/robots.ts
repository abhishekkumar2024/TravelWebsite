import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            // Default rules for all crawlers (SEO)
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            // Explicitly allow AI/Generative Engine crawlers (GEO + AEO)
            // These bots power ChatGPT search, Perplexity, Google AI Overviews, etc.
            {
                userAgent: 'GPTBot',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'ChatGPT-User',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'PerplexityBot',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'Google-Extended',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'anthropic-ai',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'ClaudeBot',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'Bytespider',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
            {
                userAgent: 'cohere-ai',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs', '/reset-password', '/profile'],
            },
        ],
        sitemap: 'https://www.camelthar.com/sitemap.xml',
    }
}
