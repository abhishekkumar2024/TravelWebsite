
/**
 * Utility to submit URLs to IndexNow (Bing/Yandex) for instant indexing.
 * This should ONLY be called when a blog post is created or updated.
 */
export async function submitToIndexNow(urls: string[]) {
    if (!urls.length) return;

    // Only run in production to avoid polluting index with localhost/preview URLs
    // We check for the production domain or an env var
    const isProduction = process.env.NEXT_PUBLIC_SITE_URL?.includes('camelthar.com') || process.env.NODE_ENV === 'production';

    if (!isProduction) {
        console.log('[IndexNow] Skipping submission (not production):', urls);
        return;
    }

    // Key configuration
    const apiKey = '0450ee6a6cb2480aaecada70c733cf8f';
    const host = 'camelthar.com';
    const keyLocation = `https://${host}/${apiKey}.txt`;

    try {
        const response = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                host,
                key: apiKey,
                keyLocation,
                urlList: urls,
            }),
        });

        if (response.ok) {
            console.log(`[IndexNow] Successfully submitted ${urls.length} URL(s)`);
        } else {
            console.error(`[IndexNow] Submission failed: ${response.status} ${response.statusText}`);
        }
    } catch (err) {
        // Fail silently — indexing should never break the publishing flow
        console.error("[IndexNow] Error submitting URLs:", err);
    }
}
