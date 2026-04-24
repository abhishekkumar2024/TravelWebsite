/**
 * TharMate Anchor Points — Known Landmarks & Hotspots
 * 
 * Each anchor defines a "snap zone" — when a user's GPS falls within
 * the anchor's radius, they get placed in that anchor's chat room
 * instead of a generic geohash room.
 * 
 * Anchor radius = 20 km (covers entire city / zone).
 * 
 * Structure:
 *   id       — unique slug used as room key (e.g. "jaisalmer-fort")
 *   label    — human-readable room name
 *   city     — parent city for grouping
 *   lat/lng  — center coordinates
 *   radius   — snap radius in km (default 20)
 *   emoji    — icon for UI
 *   type     — 'city' | 'landmark' | 'area'
 *              city     = main city center (largest radius)
 *              landmark = specific popular spot
 *              area     = region / zone (desert, lake, etc.)
 * 
 * To add a new anchor:
 *   1. Add an entry below with accurate lat/lng from Google Maps
 *   2. Set `type` to 'landmark' for specific spots, 'city' for city-wide
 *   3. Keep id lowercase-hyphenated (e.g. "sam-sand-dunes")
 */

// ─── Types ──────────────────────────────────────────────────────

export interface AnchorPoint {
    id: string;
    label: string;
    city: string;
    lat: number;
    lng: number;
    radius: number;  // in km
    emoji: string;
    type: 'city' | 'landmark' | 'area';
}

// ─── Rajasthan Anchor Points ────────────────────────────────────

export const ANCHOR_POINTS: AnchorPoint[] = [

    // ════════════════════════════════════════════════════════════
    // JAISALMER (The Golden City)
    // ════════════════════════════════════════════════════════════
    {
        id: 'jaisalmer',
        label: 'Jaisalmer City',
        city: 'jaisalmer',
        lat: 26.9157,
        lng: 70.9083,
        radius: 20,
        emoji: '🏯',
        type: 'city',
    },
    {
        id: 'jaisalmer-fort',
        label: 'Jaisalmer Fort (Sonar Quila)',
        city: 'jaisalmer',
        lat: 26.9124,
        lng: 70.9126,
        radius: 3,
        emoji: '🏰',
        type: 'landmark',
    },
    {
        id: 'patwon-ki-haveli',
        label: 'Patwon Ki Haveli',
        city: 'jaisalmer',
        lat: 26.9148,
        lng: 70.9154,
        radius: 2,
        emoji: '🪟',
        type: 'landmark',
    },
    {
        id: 'gadisar-lake',
        label: 'Gadisar Lake',
        city: 'jaisalmer',
        lat: 26.9076,
        lng: 70.9213,
        radius: 2,
        emoji: '🌊',
        type: 'landmark',
    },
    {
        id: 'sam-sand-dunes',
        label: 'Sam Sand Dunes',
        city: 'jaisalmer',
        lat: 26.8896,
        lng: 70.5524,
        radius: 10,
        emoji: '🏜️',
        type: 'area',
    },
    {
        id: 'kuldhara-village',
        label: 'Kuldhara Ghost Village',
        city: 'jaisalmer',
        lat: 26.8515,
        lng: 70.7557,
        radius: 3,
        emoji: '👻',
        type: 'landmark',
    },
    {
        id: 'bada-bagh',
        label: 'Bada Bagh',
        city: 'jaisalmer',
        lat: 26.9356,
        lng: 70.8578,
        radius: 3,
        emoji: '🕌',
        type: 'landmark',
    },

    // ════════════════════════════════════════════════════════════
    // JAIPUR (The Pink City)
    // ════════════════════════════════════════════════════════════
    {
        id: 'jaipur',
        label: 'Jaipur City',
        city: 'jaipur',
        lat: 26.9124,
        lng: 75.7873,
        radius: 20,
        emoji: '🎨',
        type: 'city',
    },
    {
        id: 'hawa-mahal',
        label: 'Hawa Mahal',
        city: 'jaipur',
        lat: 26.9239,
        lng: 75.8267,
        radius: 2,
        emoji: '🏛️',
        type: 'landmark',
    },
    {
        id: 'amer-fort',
        label: 'Amer Fort',
        city: 'jaipur',
        lat: 26.9855,
        lng: 75.8513,
        radius: 3,
        emoji: '🏰',
        type: 'landmark',
    },
    {
        id: 'city-palace-jaipur',
        label: 'City Palace Jaipur',
        city: 'jaipur',
        lat: 26.9258,
        lng: 75.8237,
        radius: 2,
        emoji: '👑',
        type: 'landmark',
    },
    {
        id: 'nahargarh-fort',
        label: 'Nahargarh Fort',
        city: 'jaipur',
        lat: 26.9372,
        lng: 75.8155,
        radius: 3,
        emoji: '🦁',
        type: 'landmark',
    },
    {
        id: 'jantar-mantar-jaipur',
        label: 'Jantar Mantar',
        city: 'jaipur',
        lat: 26.9246,
        lng: 75.8243,
        radius: 1,
        emoji: '🔭',
        type: 'landmark',
    },

    // ════════════════════════════════════════════════════════════
    // UDAIPUR (City of Lakes)
    // ════════════════════════════════════════════════════════════
    {
        id: 'udaipur',
        label: 'Udaipur City',
        city: 'udaipur',
        lat: 24.5854,
        lng: 73.7125,
        radius: 20,
        emoji: '🌊',
        type: 'city',
    },
    {
        id: 'city-palace-udaipur',
        label: 'City Palace Udaipur',
        city: 'udaipur',
        lat: 24.5764,
        lng: 73.6913,
        radius: 2,
        emoji: '👑',
        type: 'landmark',
    },
    {
        id: 'lake-pichola',
        label: 'Lake Pichola',
        city: 'udaipur',
        lat: 24.5706,
        lng: 73.6834,
        radius: 3,
        emoji: '⛵',
        type: 'area',
    },
    {
        id: 'fateh-sagar-lake',
        label: 'Fateh Sagar Lake',
        city: 'udaipur',
        lat: 24.5997,
        lng: 73.6750,
        radius: 3,
        emoji: '🏞️',
        type: 'area',
    },
    {
        id: 'sajjangarh-monsoon-palace',
        label: 'Sajjangarh Palace',
        city: 'udaipur',
        lat: 24.5803,
        lng: 73.6509,
        radius: 3,
        emoji: '🌧️',
        type: 'landmark',
    },

    // ════════════════════════════════════════════════════════════
    // JODHPUR (The Blue City)
    // ════════════════════════════════════════════════════════════
    {
        id: 'jodhpur',
        label: 'Jodhpur City',
        city: 'jodhpur',
        lat: 26.2389,
        lng: 73.0243,
        radius: 20,
        emoji: '🔵',
        type: 'city',
    },
    {
        id: 'mehrangarh-fort',
        label: 'Mehrangarh Fort',
        city: 'jodhpur',
        lat: 26.2981,
        lng: 73.0186,
        radius: 3,
        emoji: '🏰',
        type: 'landmark',
    },
    {
        id: 'umaid-bhawan',
        label: 'Umaid Bhawan Palace',
        city: 'jodhpur',
        lat: 26.2700,
        lng: 73.0372,
        radius: 3,
        emoji: '🏛️',
        type: 'landmark',
    },
    {
        id: 'clock-tower-jodhpur',
        label: 'Clock Tower & Sardar Market',
        city: 'jodhpur',
        lat: 26.2918,
        lng: 73.0254,
        radius: 2,
        emoji: '🕰️',
        type: 'landmark',
    },

    // ════════════════════════════════════════════════════════════
    // PUSHKAR (The Sacred Town)
    // ════════════════════════════════════════════════════════════
    {
        id: 'pushkar',
        label: 'Pushkar Town',
        city: 'pushkar',
        lat: 26.4896,
        lng: 74.5511,
        radius: 15,
        emoji: '🌸',
        type: 'city',
    },
    {
        id: 'pushkar-lake',
        label: 'Pushkar Lake',
        city: 'pushkar',
        lat: 26.4886,
        lng: 74.5535,
        radius: 3,
        emoji: '🛕',
        type: 'landmark',
    },
    {
        id: 'brahma-temple',
        label: 'Brahma Temple',
        city: 'pushkar',
        lat: 26.4898,
        lng: 74.5528,
        radius: 1,
        emoji: '🕉️',
        type: 'landmark',
    },

    // ════════════════════════════════════════════════════════════
    // MOUNT ABU (Hill Station)
    // ════════════════════════════════════════════════════════════
    {
        id: 'mount-abu',
        label: 'Mount Abu',
        city: 'mount-abu',
        lat: 24.5926,
        lng: 72.7156,
        radius: 15,
        emoji: '⛰️',
        type: 'city',
    },
    {
        id: 'nakki-lake',
        label: 'Nakki Lake',
        city: 'mount-abu',
        lat: 24.5880,
        lng: 72.7120,
        radius: 2,
        emoji: '🏞️',
        type: 'landmark',
    },
    {
        id: 'dilwara-temples',
        label: 'Dilwara Temples',
        city: 'mount-abu',
        lat: 24.6149,
        lng: 72.6913,
        radius: 2,
        emoji: '🛕',
        type: 'landmark',
    },

    // ════════════════════════════════════════════════════════════
    // BIKANER (The Camel City)
    // ════════════════════════════════════════════════════════════
    {
        id: 'bikaner',
        label: 'Bikaner City',
        city: 'bikaner',
        lat: 28.0229,
        lng: 73.3119,
        radius: 20,
        emoji: '🐫',
        type: 'city',
    },
    {
        id: 'junagarh-fort',
        label: 'Junagarh Fort',
        city: 'bikaner',
        lat: 28.0230,
        lng: 73.3172,
        radius: 2,
        emoji: '🏰',
        type: 'landmark',
    },
    {
        id: 'karni-mata-temple',
        label: 'Karni Mata Temple (Rat Temple)',
        city: 'bikaner',
        lat: 27.6480,
        lng: 73.3389,
        radius: 3,
        emoji: '🐀',
        type: 'landmark',
    },
];

// ─── Lookup Helpers ─────────────────────────────────────────────

/** Get all anchors for a specific city */
export function getAnchorsForCity(city: string): AnchorPoint[] {
    return ANCHOR_POINTS.filter(a => a.city === city.toLowerCase());
}

/** Get a specific anchor by ID */
export function getAnchorById(id: string): AnchorPoint | undefined {
    return ANCHOR_POINTS.find(a => a.id === id);
}

/** Get all city-level anchors (the "umbrella" zones) */
export function getCityAnchors(): AnchorPoint[] {
    return ANCHOR_POINTS.filter(a => a.type === 'city');
}

/** Get all unique city IDs */
export function getAllCityIds(): string[] {
    return [...new Set(ANCHOR_POINTS.filter(a => a.type === 'city').map(a => a.city))];
}
