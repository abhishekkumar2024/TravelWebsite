/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://www.camelthar.com',
    generateRobotsTxt: true,
    sitemapSize: 5000,
    changefreq: 'daily',
    priority: 0.7,
    exclude: ['/admin', '/admin/*', '/login', '/submit', '/edit/*', '/my-blogs'],
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/login', '/submit', '/edit', '/my-blogs'],
            },
        ],
    },
    // Transform function to set priorities for specific pages
    transform: async (config, path) => {
        let priority = config.priority;
        let changefreq = config.changefreq;

        if (path === '/') {
            priority = 1.0;
            changefreq = 'daily';
        } else if (path === '/blogs') {
            priority = 0.9;
            changefreq = 'daily';
        } else if (path.startsWith('/blog/')) {
            priority = 0.8;
            changefreq = 'weekly';
        } else if (path === '/destinations') {
            priority = 0.8;
            changefreq = 'weekly';
        } else if (path === '/privacy-policy' || path === '/terms-of-service') {
            priority = 0.5;
            changefreq = 'monthly';
        }

        return {
            loc: path,
            changefreq,
            priority,
            lastmod: new Date().toISOString(),
        };
    },
    // Add dynamic blog routes
    additionalPaths: async (config) => {
        const result = [];

        // Fetch published blogs from Supabase (if available at build time)
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data: blogs } = await supabase
                    .from('blogs')
                    .select('slug, id, updated_at')
                    .eq('status', 'published');

                if (blogs && blogs.length > 0) {
                    for (const blog of blogs) {
                        const path = `/blog/${blog.slug || blog.id}`;
                        result.push({
                            loc: path,
                            changefreq: 'weekly',
                            priority: 0.8,
                            lastmod: blog.updated_at || new Date().toISOString(),
                        });
                    }
                }
            }
        } catch (error) {
            console.log('Note: Could not fetch blogs for sitemap. Using static paths only.');
        }

        return result;
    },
};
