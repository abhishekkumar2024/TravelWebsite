
import EssentialsContent, { AffiliateProduct } from './EssentialsContent';

// Static demo products for now (no Firebase)
const demoProducts: AffiliateProduct[] = [
    {
        id: '1',
        name: 'Rajasthan Travel Guide Book',
        description: 'Complete guide to Rajasthan destinations',
        price: '$19.99',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        affiliateLink: '#',
        destinations: ['jaipur', 'udaipur'],
        isActive: true
    },
    {
        id: '2',
        name: 'Traditional Rajasthani Scarf',
        description: 'Handmade colorful scarf for women',
        price: '$24.99',
        imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300',
        affiliateLink: '#',
        destinations: ['jodhpur', 'pushkar'],
        isActive: true
    },
    {
        id: '3',
        name: 'Desert Safari Package',
        description: 'Complete desert experience with camel ride',
        price: '$89.99',
        imageUrl: 'https://images.unsplash.com/photo-1518623001395-125242310d0c?w=300',
        affiliateLink: '#',
        destinations: ['jaisalmer'],
        isActive: true
    }
];

export default async function TripEssentialsPage() {
    return <EssentialsContent products={demoProducts} />;
}
