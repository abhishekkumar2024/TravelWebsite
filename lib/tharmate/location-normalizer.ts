/**
 * TharMate Location Normalizer — GPS → Room Mapping
 * 
 * Combines three strategies to convert raw (lat, lng) into a room ID:
 * 
 *   1. ANCHOR SNAP   — Within 20km of a known landmark? → Use that room.
 *                       Prioritizes: landmark > area > city (smallest wins).
 *   2. MOVING HUB    — Near an active user cluster? → Join their room.
 *                       Checks Redis for active hubs within 2km.
 *   3. GEOHASH GRID  — Fallback: hash coordinates to a ~5km² cell.
 *                       Creates a room named "travelers-<geohash>".
 * 
 * Flow:
 *   getUserLocation() → normalizeLocation(lat, lng)
 *     ├─ Anchor match?  → { roomId: 'jaisalmer-fort',  source: 'anchor'  }
 *     ├─ Hub match?     → { roomId: 'hub-abc123',      source: 'hub'     }
 *     └─ Fallback       → { roomId: 'geo-tsu70',       source: 'geohash' }
 */

import { ANCHOR_POINTS, type AnchorPoint } from './anchor-points';

// ─── Types ──────────────────────────────────────────────────────

export interface NormalizedLocation {
    roomId: string;         // The room the user should join
    roomLabel: string;      // Human-readable name for UI
    source: 'anchor' | 'hub' | 'geohash';   // Which strategy matched
    anchor?: AnchorPoint;   // If source is 'anchor', the matched point
    city?: string;          // Parent city (if known)
    distance?: number;      // How far the user is from the anchor center (km)
    lat: number;            // Normalized lat (anchor center or original)
    lng: number;            // Normalized lng (anchor center or original)
}

export interface ActiveHub {
    hubId: string;
    lat: number;
    lng: number;
    userCount: number;
    createdAt: number;      // timestamp
}

// ─── Constants ──────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const DEFAULT_ANCHOR_RADIUS_KM = 20;    // City-level snap
const HUB_SNAP_RADIUS_KM = 2;          // Join active clusters within 2km
const GEOHASH_PRECISION = 5;            // ~5km × 5km cells

// ─── Haversine Distance ─────────────────────────────────────────

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

// ─── Geohash Encoding ───────────────────────────────────────────

const GEOHASH_CHARS = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude into a geohash string.
 * Precision 5 ≈ ±2.4km lat × ±2.4km lng cell.
 */
export function encodeGeohash(lat: number, lng: number, precision: number = GEOHASH_PRECISION): string {
    let idx = 0;
    let bit = 0;
    let evenBit = true;
    let hash = '';

    let latMin = -90, latMax = 90;
    let lngMin = -180, lngMax = 180;

    while (hash.length < precision) {
        if (evenBit) {
            // Longitude
            const mid = (lngMin + lngMax) / 2;
            if (lng >= mid) {
                idx = idx * 2 + 1;
                lngMin = mid;
            } else {
                idx = idx * 2;
                lngMax = mid;
            }
        } else {
            // Latitude
            const mid = (latMin + latMax) / 2;
            if (lat >= mid) {
                idx = idx * 2 + 1;
                latMin = mid;
            } else {
                idx = idx * 2;
                latMax = mid;
            }
        }
        evenBit = !evenBit;

        if (++bit === 5) {
            hash += GEOHASH_CHARS[idx];
            bit = 0;
            idx = 0;
        }
    }

    return hash;
}

/**
 * Get the center of a geohash cell (for display purposes).
 */
export function decodeGeohashCenter(hash: string): { lat: number; lng: number } {
    let evenBit = true;
    let latMin = -90, latMax = 90;
    let lngMin = -180, lngMax = 180;

    for (const char of hash) {
        const idx = GEOHASH_CHARS.indexOf(char);
        for (let bit = 4; bit >= 0; bit--) {
            const bitValue = (idx >> bit) & 1;
            if (evenBit) {
                const mid = (lngMin + lngMax) / 2;
                if (bitValue === 1) lngMin = mid;
                else lngMax = mid;
            } else {
                const mid = (latMin + latMax) / 2;
                if (bitValue === 1) latMin = mid;
                else latMax = mid;
            }
            evenBit = !evenBit;
        }
    }

    return {
        lat: (latMin + latMax) / 2,
        lng: (lngMin + lngMax) / 2,
    };
}

// ─── STEP 1: Anchor Snap ────────────────────────────────────────

/**
 * Find the best anchor point for a location.
 * 
 * Logic:
 *   1. Calculate distance to ALL anchors
 *   2. Filter only anchors within their declared radius
 *   3. Sort by: type priority (landmark > area > city) then distance (closest)
 *   4. Return the best match (smallest, closest anchor wins)
 */
export function findNearestAnchor(lat: number, lng: number): {
    anchor: AnchorPoint;
    distance: number;
} | null {
    const typePriority: Record<string, number> = {
        landmark: 0,   // Highest priority — specific places
        area: 1,       // Medium — zones like "Sam Dunes"
        city: 2,       // Fallback — 20km city umbrella
    };

    const matches: { anchor: AnchorPoint; distance: number; priority: number }[] = [];

    for (const anchor of ANCHOR_POINTS) {
        const dist = haversineDistance(lat, lng, anchor.lat, anchor.lng);
        const radius = anchor.radius || DEFAULT_ANCHOR_RADIUS_KM;

        if (dist <= radius) {
            matches.push({
                anchor,
                distance: dist,
                priority: typePriority[anchor.type] ?? 2,
            });
        }
    }

    if (matches.length === 0) return null;

    // Sort: landmark first → then closest within same type
    matches.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.distance - b.distance;
    });

    return {
        anchor: matches[0].anchor,
        distance: matches[0].distance,
    };
}

// ─── STEP 2: Moving Hub Check ───────────────────────────────────

/**
 * Check if a location is near any active "moving hub."
 * 
 * Active hubs are stored in Redis (see redis-tharmate.ts).
 * This function takes the list of active hubs and checks proximity.
 */
export function findNearestHub(
    lat: number,
    lng: number,
    activeHubs: ActiveHub[]
): ActiveHub | null {
    let bestHub: ActiveHub | null = null;
    let bestDist = Infinity;

    for (const hub of activeHubs) {
        const dist = haversineDistance(lat, lng, hub.lat, hub.lng);
        if (dist <= HUB_SNAP_RADIUS_KM && dist < bestDist) {
            bestHub = hub;
            bestDist = dist;
        }
    }

    return bestHub;
}

// ─── MAIN: Normalize Location ───────────────────────────────────

/**
 * The main entry point. Takes raw GPS coordinates and returns
 * the room the user should be placed in.
 * 
 * @param lat - User's latitude
 * @param lng - User's longitude
 * @param activeHubs - List of currently active moving hubs (from Redis)
 */
export function normalizeLocation(
    lat: number,
    lng: number,
    activeHubs: ActiveHub[] = []
): NormalizedLocation {

    // ── Step 1: Try Anchor Snap ─────────────────────────────
    const anchorMatch = findNearestAnchor(lat, lng);
    if (anchorMatch) {
        return {
            roomId: `anchor-${anchorMatch.anchor.id}`,
            roomLabel: `${anchorMatch.anchor.emoji} ${anchorMatch.anchor.label}`,
            source: 'anchor',
            anchor: anchorMatch.anchor,
            city: anchorMatch.anchor.city,
            distance: Math.round(anchorMatch.distance * 100) / 100,
            lat: anchorMatch.anchor.lat,
            lng: anchorMatch.anchor.lng,
        };
    }

    // ── Step 2: Try Moving Hub ──────────────────────────────
    const hubMatch = findNearestHub(lat, lng, activeHubs);
    if (hubMatch) {
        return {
            roomId: hubMatch.hubId,
            roomLabel: `📍 Travelers Nearby`,
            source: 'hub',
            distance: haversineDistance(lat, lng, hubMatch.lat, hubMatch.lng),
            lat: hubMatch.lat,
            lng: hubMatch.lng,
        };
    }

    // ── Step 3: Fallback to Geohash Grid ────────────────────
    const geohash = encodeGeohash(lat, lng);
    const center = decodeGeohashCenter(geohash);
    return {
        roomId: `geo-${geohash}`,
        roomLabel: `📍 Area ${geohash.toUpperCase()}`,
        source: 'geohash',
        lat: center.lat,
        lng: center.lng,
    };
}

// ─── Generate Hub ID ────────────────────────────────────────────

/**
 * Create a deterministic hub ID for a new moving hub.
 * Uses geohash at higher precision for uniqueness.
 */
export function generateHubId(lat: number, lng: number): string {
    const geohash = encodeGeohash(lat, lng, 7); // ~150m precision
    return `hub-${geohash}-${Date.now().toString(36).slice(-4)}`;
}
