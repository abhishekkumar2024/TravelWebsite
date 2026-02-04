// Demo data for when Firebase is not configured
export interface Author {
    name: string;
    email?: string;
    avatar?: string;
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
    publishedAt: Date;
    status: 'pending' | 'approved' | 'rejected' | 'published';
    views: number;
    meta_title?: string;
    meta_description?: string;
    focus_keyword?: string;
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
}

export const demoBlogs: BlogPost[] = [
    {
        id: '1',
        title_en: '3 Days in Jaipur: The Complete Pink City Guide',
        title_hi: 'जयपुर में 3 दिन: गुलाबी शहर की पूरी गाइड',
        excerpt_en: 'Discover the majestic forts, vibrant markets, and royal heritage of Jaipur.',
        excerpt_hi: 'जयपुर के भव्य किलों, जीवंत बाजारों और शाही विरासत की खोज करें।',
        content_en: `<h2>Day 1: Exploring the Pink City</h2>
<p>Start your Jaipur journey at the iconic <strong>Hawa Mahal</strong>, the Palace of Winds. This stunning pink sandstone structure with its 953 small windows was designed to allow royal women to observe street life without being seen.</p>
<p>Next, head to the magnificent <strong>City Palace</strong>, still partially occupied by the royal family. The blend of Rajasthani and Mughal architecture is breathtaking.</p>
<img src="/images/jaipur-hawa-mahal.webp" alt="Hawa Mahal" />
<h2>Day 2: Fort Adventures</h2>
<p>Today is all about the legendary <strong>Amber Fort</strong>. Take an elephant ride up to the fort (or walk if you prefer) and explore the stunning Sheesh Mahal (Mirror Palace).</p>
<p>In the afternoon, visit <strong>Nahargarh Fort</strong> for spectacular sunset views over the city.</p>
<h2>Day 3: Markets and Culture</h2>
<p>Spend your last day exploring the colorful bazaars of Jaipur. Don't miss Johari Bazaar for jewelry and Bapu Bazaar for textiles and handicrafts.</p>`,
        content_hi: `<h2>दिन 1: गुलाबी शहर की खोज</h2>
<p>अपनी जयपुर यात्रा की शुरुआत प्रतिष्ठित <strong>हवा महल</strong> से करें। इस शानदार गुलाबी बलुआ पत्थर की संरचना में 953 छोटी खिड़कियां हैं।</p>`,
        destination: 'jaipur',
        category: 'City Guide',
        coverImage: '/images/jaipur-hawa-mahal.webp',
        author: { name: 'Rahul Sharma', avatar: 'https://i.pravatar.cc/150?img=11' },
        readTime: '8 min',
        publishedAt: new Date('2024-01-15'),
        status: 'approved',
        views: 1250,
    },
    {
        id: '2',
        title_en: 'Udaipur: City of Lakes and Romance',
        title_hi: 'उदयपुर: झीलों और रोमांस का शहर',
        excerpt_en: 'Experience the romantic charm of Udaipur with stunning lakes and palaces.',
        excerpt_hi: 'उदयपुर के सुंदर झीलों और महलों के रोमांटिक आकर्षण का अनुभव करें।',
        content_en: `<h2>The Venice of the East</h2>
<p>Udaipur is often called the most romantic city in India, and it's easy to see why. The shimmering <strong>Lake Pichola</strong> reflects the white marble palaces that line its shores.</p>
<p>Take a boat ride to the <strong>Jag Mandir</strong> palace, floating serenely in the middle of the lake. The sunset views from here are absolutely magical.</p>`,
        content_hi: `<h2>पूर्व का वेनिस</h2>
<p>उदयपुर को अक्सर भारत का सबसे रोमांटिक शहर कहा जाता है।</p>`,
        destination: 'udaipur',
        category: 'Travel Story',
        coverImage: '/images/udaipur-lake-palace.webp',
        author: { name: 'Priya Patel', avatar: 'https://i.pravatar.cc/150?img=5' },
        readTime: '6 min',
        publishedAt: new Date('2024-01-10'),
        status: 'approved',
        views: 890,
    },
    {
        id: '3',
        title_en: 'Desert Safari in Jaisalmer: A Golden Adventure',
        title_hi: 'जैसलमेर में रेगिस्तान सफारी: एक सुनहरा रोमांच',
        excerpt_en: 'Ride camels through golden sands and camp under the stars.',
        excerpt_hi: 'सुनहरी रेत में ऊंट की सवारी करें और तारों के नीचे कैंप करें।',
        content_en: `<h2>Into the Golden Desert</h2>
<p>Jaisalmer rises from the Thar Desert like a golden mirage. The <strong>Jaisalmer Fort</strong> is unique - it's a living fort with shops, hotels, and homes still inside its walls.</p>
<p>But the real magic happens when you venture into the <strong>Sam Sand Dunes</strong>. As the sun sets, the desert turns every shade of gold and orange.</p>`,
        content_hi: `<h2>सुनहरे रेगिस्तान में</h2>
<p>जैसलमेर थार रेगिस्तान से एक सुनहरे मृगतृष्णा की तरह उभरता है।</p>`,
        destination: 'jaisalmer',
        category: 'Adventure',
        coverImage: '/images/jaisalmer-desert-safari.webp',
        author: { name: 'Amit Kumar', avatar: 'https://i.pravatar.cc/150?img=12' },
        readTime: '10 min',
        publishedAt: new Date('2024-01-05'),
        status: 'approved',
        views: 2100,
    },
    {
        id: '4',
        title_en: 'Exploring the Blue City Jodhpur',
        title_hi: 'नीले शहर जोधपुर की खोज',
        excerpt_en: 'Wander through blue-painted streets and visit Mehrangarh Fort.',
        excerpt_hi: 'नीले रंग की सड़कों पर घूमें और मेहरानगढ़ किला देखें।',
        content_en: `<h2>The Blue City</h2>
<p>Jodhpur's old city is a maze of blue-painted houses, a sight best appreciated from the towering <strong>Mehrangarh Fort</strong>.</p>`,
        content_hi: `<h2>नीला शहर</h2>
<p>जोधपुर का पुराना शहर नीले रंग के घरों की एक भूलभुलैया है।</p>`,
        destination: 'jodhpur',
        category: 'City Guide',
        coverImage: '/images/jodhpur.webp',
        author: { name: 'Sneha Agarwal', avatar: 'https://i.pravatar.cc/150?img=9' },
        readTime: '7 min',
        publishedAt: new Date('2024-01-01'),
        status: 'approved',
        views: 750,
    },
    {
        id: '5',
        title_en: 'Pushkar: Beyond the Camel Fair',
        title_hi: 'पुष्कर: ऊंट मेले से परे',
        excerpt_en: 'Discover the sacred Pushkar Lake and ancient Brahma Temple.',
        excerpt_hi: 'पवित्र पुष्कर झील और प्राचीन ब्रह्मा मंदिर की खोज करें।',
        content_en: `<h2>The Sacred Town</h2>
<p>Pushkar is one of the oldest cities in India, famous for the only <strong>Brahma Temple</strong> in the world and the sacred <strong>Pushkar Lake</strong>.</p>`,
        content_hi: `<h2>पवित्र नगरी</h2>
<p>पुष्कर भारत के सबसे पुराने शहरों में से एक है।</p>`,
        destination: 'pushkar',
        category: 'Spiritual',
        coverImage: '/images/pushkar.webp',
        author: { name: 'Vikram Singh', avatar: 'https://i.pravatar.cc/150?img=15' },
        readTime: '5 min',
        publishedAt: new Date('2023-12-28'),
        status: 'approved',
        views: 420,
    },
    {
        id: '6',
        title_en: 'Heritage Walk in Jaipur Old City',
        title_hi: 'जयपुर पुराने शहर में विरासत वॉक',
        excerpt_en: 'A walking tour through the historic lanes of the Pink City.',
        excerpt_hi: 'गुलाबी शहर की ऐतिहासिक गलियों में पैदल यात्रा।',
        content_en: `<h2>Walking Through History</h2>
<p>The best way to experience Jaipur's old city is on foot. Start early morning to avoid the heat and crowds.</p>`,
        content_hi: `<h2>इतिहास से गुजरते हुए</h2>
<p>जयपुर के पुराने शहर को अनुभव करने का सबसे अच्छा तरीका पैदल है।</p>`,
        destination: 'jaipur',
        category: 'Walking Tour',
        coverImage: '/images/jaipur-hawa-mahal.webp',
        author: { name: 'Anita Mehra', avatar: 'https://i.pravatar.cc/150?img=20' },
        readTime: '6 min',
        publishedAt: new Date('2023-12-20'),
        status: 'approved',
        views: 380,
    },
];

export const demoDestinations: Destination[] = [
    {
        id: 'jaipur',
        name_en: 'Jaipur',
        name_hi: 'जयपुर',
        tagline_en: 'The Pink City',
        tagline_hi: 'गुलाबी शहर',
        description_en: 'Capital of Rajasthan, famous for stunning forts, royal palaces, and vibrant bazaars.',
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
        description_en: 'The most romantic city in India with beautiful lakes, palaces, and sunset views.',
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
        description_en: 'A living fort in the Thar Desert with stunning golden sandstone architecture.',
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
        description_en: 'Home to mighty Mehrangarh Fort and blue-painted houses of the old city.',
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
        description_en: "One of the oldest cities with the only Brahma Temple and famous camel fair.",
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
        description_en: "Rajasthan's only hill station with cool climate and stunning Dilwara Temples.",
        description_hi: 'ठंडी जलवायु और शानदार दिलवाड़ा मंदिरों के साथ राजस्थान का एकमात्र हिल स्टेशन।',
        coverImage: '/images/mount-abu.webp',
        attractions: ['Dilwara Temples', 'Nakki Lake', 'Guru Shikhar', 'Sunset Point'],
        bestTime: 'Mar - Jun',
        blogCount: 6,
    },
];

// Helper functions
export function getBlogById(id: string): BlogPost | undefined {
    return demoBlogs.find(blog => blog.id === id);
}

export function getDestinationById(id: string): Destination | undefined {
    return demoDestinations.find(dest => dest.id === id);
}

export function getBlogsByDestination(destinationId: string): BlogPost[] {
    return demoBlogs.filter(blog => blog.destination === destinationId);
}
