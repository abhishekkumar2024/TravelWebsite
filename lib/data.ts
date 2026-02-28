// Static data and type definitions
export interface Author {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    bio?: string;
    slug?: string;
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
}

export interface BlogPost {
    id: string;
    title_en: string;
    title_hi: string;
    excerpt_en: string;
    excerpt_hi: string;
    content_en: string;
    content_hi: string;
    destination: string;
    category: string;
    coverImage: string;
    images?: string[];
    author: Author;
    readTime: string;
    publishedAt: string;
    status: 'pending' | 'approved' | 'rejected' | 'published';
    views: number;
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    slug?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Destination {
    id: string;
    name_en: string;
    name_hi: string;
    tagline_en: string;
    tagline_hi: string;
    description_en: string;
    description_hi: string;
    coverImage: string;
    attractions: string[];
    bestTime: string;
    blogCount: number;
    imageCredits?: {
        name: string;
        url: string;
    };
}

export const destinations: Destination[] = [
    {
        id: 'jaipur',
        name_en: 'Jaipur',
        name_hi: 'जयपुर',
        tagline_en: 'The Pink City',
        tagline_hi: 'गुलाबी शहर',
        description_en: 'Discover Jaipur, the Pink City of India, known for majestic forts, royal palaces, local bazaars, culture, food, and unforgettable travel experiences.',
        description_hi: 'राजस्थान की राजधानी, शानदार किलों, शाही महलों और जीवंत बाजारों के लिए प्रसिद्ध।',
        coverImage: '/images/jaipur-hawa-mahal.webp',
        attractions: ['Amber Fort', 'Hawa Mahal', 'City Palace', 'Jantar Mantar'],
        bestTime: 'Oct - Mar',
        blogCount: 24,
    },
    {
        id: 'udaipur',
        name_en: 'Udaipur',
        name_hi: 'उदयपुर',
        tagline_en: 'City of Lakes',
        tagline_hi: 'झीलों का शहर',
        description_en: 'Explore Udaipur, the City of Lakes, famous for romantic palaces, scenic lakes, heritage hotels, sunsets, and rich Rajasthani culture.',
        description_hi: 'सुंदर झीलों, महलों और सूर्यास्त दृश्यों के साथ भारत का सबसे रोमांटिक शहर।',
        coverImage: '/images/udaipur-lake-palace.webp',
        attractions: ['Lake Pichola', 'City Palace', 'Jag Mandir', 'Fateh Sagar'],
        bestTime: 'Sep - Mar',
        blogCount: 18,
    },
    {
        id: 'jaisalmer',
        name_en: 'Jaisalmer',
        name_hi: 'जैसलमेर',
        tagline_en: 'The Golden City',
        tagline_hi: 'सुनहरा शहर',
        description_en: 'Explore Jaisalmer, the Golden City of India, famous for its living fort, desert safaris, havelis, culture, and unforgettable Thar Desert experiences.',
        description_hi: 'थार रेगिस्तान में सुनहरे बलुआ पत्थर की शानदार वास्तुकला वाला एक जीवित किला।',
        coverImage: '/images/jaisalmer-golden-fort.webp',
        attractions: ['Jaisalmer Fort', 'Sam Sand Dunes', 'Patwon Ki Haveli', 'Desert Safari'],
        bestTime: 'Oct - Mar',
        blogCount: 15,
    },
    {
        id: 'jodhpur',
        name_en: 'Jodhpur',
        name_hi: 'जोधपुर',
        tagline_en: 'The Blue City',
        tagline_hi: 'नीला शहर',
        description_en: 'Visit Jodhpur, the Blue City, home to the mighty Mehrangarh Fort, vibrant blue houses, bustling markets, and authentic Rajasthani heritage.',
        description_hi: 'शक्तिशाली मेहरानगढ़ किले और पुराने शहर के नीले घरों का घर।',
        coverImage: '/images/jodhpur.webp',
        attractions: ['Mehrangarh Fort', 'Umaid Bhawan', 'Jaswant Thada', 'Clock Tower'],
        bestTime: 'Oct - Mar',
        blogCount: 12,
    },
    {
        id: 'pushkar',
        name_en: 'Pushkar',
        name_hi: 'पुष्कर',
        tagline_en: 'The Sacred Town',
        tagline_hi: 'पवित्र नगरी',
        description_en: 'Experience Pushkar, a sacred pilgrimage site with the famous Brahma Temple, holy Pushkar Lake, colorful camel fair, and spiritual vibes.',
        description_hi: 'एकमात्र ब्रह्मा मंदिर और प्रसिद्ध ऊंट मेले के साथ सबसे पुराने शहरों में से एक।',
        coverImage: '/images/pushkar.webp',
        attractions: ['Brahma Temple', 'Pushkar Lake', 'Savitri Temple', 'Camel Fair'],
        bestTime: 'Oct - Mar',
        blogCount: 8,
    },
    {
        id: 'mount-abu',
        name_en: 'Mount Abu',
        name_hi: 'माउंट आबू',
        tagline_en: 'The Hill Station',
        tagline_hi: 'पहाड़ी स्टेशन',
        description_en: "Escape to Mount Abu, Rajasthan's only hill station, featuring the stunning Dilwara Temples, Nakki Lake, cool climate, and lush green landscapes.",
        description_hi: 'ठंडी जलवायु और शानदार दिलवाड़ा मंदिरों के साथ राजस्थान का एकमात्र हिल स्टेशन।',
        coverImage: '/images/mount-abu.webp',
        attractions: ['Dilwara Temples', 'Nakki Lake', 'Guru Shikhar', 'Sunset Point'],
        bestTime: 'Mar - Jun',
        blogCount: 6,
    },
    {
        id: 'bikaner',
        name_en: 'Bikaner',
        name_hi: 'बीकानेर',
        tagline_en: 'The Camel Country',
        tagline_hi: 'ऊंटों का देश',
        description_en: 'Visit Bikaner, famous for the invincible Junagarh Fort, Karni Mata Temple, and its annual Camel Festival. A vibrant desert city with rich history.',
        description_hi: 'अपराजित जूनागढ़ किले, करणी माता मंदिर और वार्षिक ऊंट उत्सव के लिए प्रसिद्ध।',
        coverImage: 'https://images.unsplash.com/photo-1590766940554-634a7ed41450?q=80&w=2670&auto=format&fit=crop',
        attractions: ['Junagarh Fort', 'Karni Mata Temple', 'Camel Research Farm', 'Rampuria Haveli'],
        bestTime: 'Oct - Mar',
        blogCount: 0,
        imageCredits: {
            name: 'Unsplash',
            url: 'https://unsplash.com/photos/brown-concrete-building-during-daytime-X9gh4J4_w98'
        }
    },
];

// Helper functions
export function getDestinationById(id: string): Destination | undefined {
    return destinations.find(dest => dest.id === id);
}
