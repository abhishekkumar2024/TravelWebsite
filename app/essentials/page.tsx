import EssentialsContent from './EssentialsContent';
import { fetchProducts } from '@/lib/supabaseProducts';

export const revalidate = 3600; // Revalidate every hour

export default async function TripEssentialsPage() {
    const products = await fetchProducts();
    return <EssentialsContent products={products} />;
}
