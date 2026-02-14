
/**
 * Utility to submit URLs to IndexNow (Bing/Yandex) for instant indexing
 * AND ping Google's sitemap endpoint for re-crawling.
 * This should ONLY be called when a blog post is created or updated.
 */

const SITE_HOST = 'www.camelthar.com';
const BASE_URL = `https://${SITE_HOST}`;
const INDEX_NOW_KEY = '0450ee6a6cb2480aaecada70c733cf8f';

/**
 * Submit URLs to IndexNow (Bing, Yandex, Naver, Seznam)
 */
async function submitToIndexNowAPI(urls: string[]) {
    if (!urls.length) return;

    try {
        const response = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                host: SITE_HOST,
                key: INDEX_NOW_KEY,
                keyLocation: `${BASE_URL}/${INDEX_NOW_KEY}.txt`,
                urlList: urls,
            }),
        });

        if (response.ok || response.status === 200 || response.status === 202) {
            console.log(`[IndexNow] ✅ Submitted ${urls.length} URL(s)`);
        } else {
            console.error(`[IndexNow] ❌ Failed: ${response.status} ${response.statusText}`);
        }
    } catch (err) {
        console.error("[IndexNow] Error submitting URLs:", err);
    }
}

/**
 * Ping Google to re-crawl the sitemap (triggers faster discovery of new pages)
 * Google deprecated the old ping API but sitemap pings via Search Console still work.
 * This is a lightweight "hey Google, come check my sitemap" signal.
 */
async function pingGoogleSitemap() {
    const sitemapUrl = `${BASE_URL}/sitemap.xml`;
    try {
        const response = await fetch(
            `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
        );
        if (response.ok) {
            console.log('[Google Ping] ✅ Sitemap ping sent successfully');
        } else {
            console.log(`[Google Ping] ⚠️ Response: ${response.status}`);
        }
    } catch (err) {
        console.error('[Google Ping] Error:', err);
    }
}

/**
 * Ping Bing to re-crawl the sitemap
 */
async function pingBingSitemap() {
    const sitemapUrl = `${BASE_URL}/sitemap.xml`;
    try {
        const response = await fetch(
            `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
        );
        if (response.ok) {
            console.log('[Bing Ping] ✅ Sitemap ping sent successfully');
        } else {
            console.log(`[Bing Ping] ⚠️ Response: ${response.status}`);
        }
    } catch (err) {
        console.error('[Bing Ping] Error:', err);
    }
}

/**
 * Main function: Submit URLs to all indexing services
 * Call this when a blog is published or updated.
 * 
 * @param urls - Array of full page URLs to index
 * @param isNewContent - If true, also pings sitemaps (for new blog posts)
 */
export async function submitToIndexNow(urls: string[], isNewContent: boolean = false) {
    if (!urls.length) return;

    // Only run in production to avoid polluting index with localhost/preview URLs
    const isProduction = process.env.NEXT_PUBLIC_SITE_URL?.includes('camelthar.com') || process.env.NODE_ENV === 'production';

    if (!isProduction) {
        console.log('[Indexing] Skipping (not production):', urls);
        return;
    }

    // Normalize URLs to use www. and trailing slash
    const normalizedUrls = urls.map(url => {
        let normalized = url;
        // Ensure www.
        normalized = normalized.replace('https://camelthar.com', BASE_URL);
        // Ensure trailing slash
        if (!normalized.endsWith('/')) {
            normalized += '/';
        }
        return normalized;
    });

    console.log(`[Indexing] Submitting ${normalizedUrls.length} URL(s):`, normalizedUrls);

    // Fire all indexing requests in parallel (non-blocking)
    const promises: Promise<void>[] = [
        submitToIndexNowAPI(normalizedUrls),
    ];

    // For new content, also ping sitemaps to accelerate discovery
    if (isNewContent) {
        promises.push(pingGoogleSitemap());
        promises.push(pingBingSitemap());
    }

    // Fire and forget — don't let indexing failures block the UI
    Promise.allSettled(promises).then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.error(`[Indexing] ${failed.length}/${results.length} requests failed`);
        }
    });
}
