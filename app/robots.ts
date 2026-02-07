import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
        },
        sitemap: 'https://www.camelthar.com/sitemap.xml',
    }
}
