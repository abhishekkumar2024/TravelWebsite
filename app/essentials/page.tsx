
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EssentialsContent, { AffiliateProduct } from './EssentialsContent';

// Define demo products here as fallback/initial data if needed
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
    let products: AffiliateProduct[] = [];

    try {
        // Attempt to fetch from Firestore at build time
        const productsQuery = query(
            collection(db, 'affiliateProducts'),
            where('isActive', '==', true)
        );
        const snapshot = await getDocs(productsQuery);

        const realProducts = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        })) as AffiliateProduct[];

        if (realProducts.length > 0) {
            products = realProducts;
        } else {
            console.log('No products found in Firestore, using demo products.');
            products = demoProducts;
        }
    } catch (error) {
        console.error('Error fetching products during build:', error);
        // Fallback to demo data
        products = demoProducts;
    }

    return <EssentialsContent products={products} />;
}
