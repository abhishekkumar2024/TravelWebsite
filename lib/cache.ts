/**
 * Simple in-memory cache with expiration
 * Caches data to improve performance and reduce Firebase reads
 */

interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresIn: number;
}

class DataCache {
    private cache: Map<string, CacheItem<unknown>> = new Map();

    // Default cache duration: 5 minutes
    private defaultExpiry = 5 * 60 * 1000;

    /**
     * Get data from cache if valid, otherwise return null
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key) as CacheItem<T> | undefined;

        if (!item) return null;

        const now = Date.now();
        const isExpired = now - item.timestamp > item.expiresIn;

        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * Set data in cache with optional custom expiry (in milliseconds)
     */
    set<T>(key: string, data: T, expiresIn?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresIn: expiresIn || this.defaultExpiry,
        });
    }

    /**
     * Check if cache has valid (non-expired) data for key
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Clear specific cache key
     */
    clear(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clearAll(): void {
        this.cache.clear();
    }

    /**
     * Get data with automatic fetch if not cached
     */
    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        expiresIn?: number
    ): Promise<T> {
        const cached = this.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        const data = await fetcher();
        this.set(key, data, expiresIn);
        return data;
    }
}

// Export singleton instance
export const dataCache = new DataCache();

// Cache keys constants
export const CACHE_KEYS = {
    BLOGS: 'blogs_approved',
    PRODUCTS: 'affiliate_products',
    DESTINATIONS: 'destinations',
} as const;

// Cache durations
export const CACHE_DURATION = {
    SHORT: 2 * 60 * 1000,      // 2 minutes
    MEDIUM: 10 * 60 * 1000,     // 10 minutes (increased from 5)
    LONG: 30 * 60 * 1000,       // 30 minutes (increased from 15)
} as const;
