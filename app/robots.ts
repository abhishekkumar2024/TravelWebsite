import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            // Default rules for all crawlers (SEO)
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            // Explicitly allow AI/Generative Engine crawlers (GEO + AEO)
            // These bots power ChatGPT search, Perplexity, Google AI Overviews, etc.
            {
                userAgent: 'GPTBot',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'ChatGPT-User',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'PerplexityBot',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'Google-Extended',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'anthropic-ai',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'ClaudeBot',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'Bytespider',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
            {
                userAgent: 'cohere-ai',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
        ],
        sitemap: 'https://www.camelthar.com/sitemap.xml',
    }
}
