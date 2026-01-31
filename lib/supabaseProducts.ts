import { supabase } from './supabaseClient';
import { AffiliateProduct } from '@/app/essentials/EssentialsContent';

export async function fetchProducts(): Promise<AffiliateProduct[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[supabaseProducts] fetchProducts error:', error.message);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        imageUrl: row.image_url,
        affiliateLink: row.affiliate_link,
        destinations: row.destinations || [],
        isActive: row.is_active,
    }));
}

export async function fetchAllProductsForAdmin(): Promise<AffiliateProduct[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[supabaseProducts] fetchAllProductsForAdmin error:', error.message);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        imageUrl: row.image_url,
        affiliateLink: row.affiliate_link,
        destinations: row.destinations || [],
        isActive: row.is_active,
    }));
}

export async function createProduct(payload: Omit<AffiliateProduct, 'id'>) {
    const { data, error } = await supabase
        .from('products')
        .insert({
            name: payload.name,
            description: payload.description,
            price: payload.price,
            image_url: payload.imageUrl,
            affiliate_link: payload.affiliateLink,
            destinations: payload.destinations,
            is_active: payload.isActive,
        })
        .select('id')
        .single();

    return { data, error };
}

export async function updateProduct(id: string, payload: Partial<AffiliateProduct>) {
    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.price !== undefined) updateData.price = payload.price;
    if (payload.imageUrl !== undefined) updateData.image_url = payload.imageUrl;
    if (payload.affiliateLink !== undefined) updateData.affiliate_link = payload.affiliateLink;
    if (payload.destinations !== undefined) updateData.destinations = payload.destinations;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select('id')
        .single();

    return { data, error };
}

export async function deleteProduct(id: string) {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    return { error };
}
