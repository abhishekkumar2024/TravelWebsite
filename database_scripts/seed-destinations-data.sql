-- ============================================
-- SEED DESTINATIONS DATA
-- ============================================

-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS destinations (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_hi TEXT,
    tagline_en TEXT,
    tagline_hi TEXT,
    description_en TEXT,
    description_hi TEXT,
    cover_image TEXT,
    attractions JSONB DEFAULT '[]'::jsonb,
    best_time TEXT,
    image_credits JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert destinations (using ON CONFLICT to avoid duplicates)
INSERT INTO destinations (id, name_en, name_hi, tagline_en, tagline_hi, description_en, description_hi, cover_image, attractions, best_time)
VALUES 
('jaipur', 'Jaipur', 'जयपुर', 'The Pink City', 'गुलाबी शहर', 'Discover Jaipur, the Pink City of India, known for majestic forts, royal palaces, local bazaars, culture, food, and unforgettable travel experiences.', 'राजस्थान की राजधानी, शानदार किलों, शाही महलों और जीवंत बाजारों के लिए प्रसिद्ध।', '/images/jaipur-hawa-mahal.webp', '["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar"]', 'Oct - Mar'),

('udaipur', 'Udaipur', 'उदयपुर', 'City of Lakes', 'झीलों का शहर', 'Explore Udaipur, the City of Lakes, famous for romantic palaces, scenic lakes, heritage hotels, sunsets, and rich Rajasthani culture.', 'सुंदर झीलों, महलों और सूर्यास्त दृश्यों के साथ भारत का सबसे रोमांटिक शहर।', '/images/udaipur-lake-palace.webp', '["Lake Pichola", "City Palace", "Jag Mandir", "Fateh Sagar"]', 'Sep - Mar'),

('jaisalmer', 'Jaisalmer', 'जैसलमेर', 'The Golden City', 'सुनहरा शहर', 'Explore Jaisalmer, the Golden City of India, famous for its living fort, desert safaris, havelis, culture, and unforgettable Thar Desert experiences.', 'थार रेगिस्तान में सुनहरे बलुआ पत्थर की शानदार वास्तुकला वाला एक जीवित किला।', '/images/jaisalmer-golden-fort.webp', '["Jaisalmer Fort", "Sam Sand Dunes", "Patwon Ki Haveli", "Desert Safari"]', 'Oct - Mar'),

('jodhpur', 'Jodhpur', 'जोधपुर', 'The Blue City', 'नीला शहर', 'Visit Jodhpur, the Blue City, home to the mighty Mehrangarh Fort, vibrant blue houses, bustling markets, and authentic Rajasthani heritage.', 'शक्तिशाली मेहरानगढ़ किले और पुराने शहर के नीले घरों का घर।', '/images/jodhpur.webp', '["Mehrangarh Fort", "Umaid Bhawan", "Jaswant Thada", "Clock Tower"]', 'Oct - Mar'),

('pushkar', 'Pushkar', 'पुष्कर', 'The Sacred Town', 'पवित्र नगरी', 'Experience Pushkar, a sacred pilgrimage site with the famous Brahma Temple, holy Pushkar Lake, colorful camel fair, and spiritual vibes.', 'एकमात्र ब्रह्मा मंदिर और प्रसिद्ध ऊंट मेले के साथ सबसे पुराने शहरों में से एक।', '/images/pushkar.webp', '["Brahma Temple", "Pushkar Lake", "Savitri Temple", "Camel Fair"]', 'Oct - Mar'),

('mount-abu', 'Mount Abu', 'माउंट आबू', 'The Hill Station', 'पहाड़ी स्टेशन', 'Escape to Mount Abu, Rajasthan''s only hill station, featuring the stunning Dilwara Temples, Nakki Lake, cool climate, and lush green landscapes.', 'ठंडी जलवायु और शानदार दिलवाड़ा मंदिरों के साथ राजस्थान का एकमात्र हिल स्टेशन।', '/images/mount-abu.webp', '["Dilwara Temples", "Nakki Lake", "Guru Shikhar", "Sunset Point"]', 'Mar - Jun')
ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_hi = EXCLUDED.name_hi,
    tagline_en = EXCLUDED.tagline_en,
    tagline_hi = EXCLUDED.tagline_hi,
    description_en = EXCLUDED.description_en,
    description_hi = EXCLUDED.description_hi,
    cover_image = EXCLUDED.cover_image,
    attractions = EXCLUDED.attractions,
    best_time = EXCLUDED.best_time,
    updated_at = NOW();

-- Special entry for Bikaner with image credits
INSERT INTO destinations (id, name_en, name_hi, tagline_en, tagline_hi, description_en, description_hi, cover_image, attractions, best_time, image_credits)
VALUES (
    'bikaner', 
    'Bikaner', 
    'बीकानेर', 
    'The Camel Country', 
    'ऊंटों का देश', 
    'Visit Bikaner, famous for the invincible Junagarh Fort, Karni Mata Temple, and its annual Camel Festival. A vibrant desert city with rich history.', 
    'अपराजित जूनागढ़ किले, करणी माता मंदिर और वार्षिक ऊंट उत्सव के लिए प्रसिद्ध।', 
    'https://images.unsplash.com/photo-1590766940554-634a7ed41450?q=80&w=2670&auto=format&fit=crop', 
    '["Junagarh Fort", "Karni Mata Temple", "Camel Research Farm", "Rampuria Haveli"]', 
    'Oct - Mar',
    '{"name": "Unsplash", "url": "https://unsplash.com/photos/brown-concrete-building-during-daytime-X9gh4J4_w98"}'
)
ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    image_credits = EXCLUDED.image_credits,
    updated_at = NOW();
