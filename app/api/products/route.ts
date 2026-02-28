import { NextRequest, NextResponse } from 'next/server';
import { fetchProducts } from '@/lib/db/queries';

/**
 * API route for fetching affiliate products.
 * 
 * GET /api/products?destination=jaisalmer&limit=4
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const destination = searchParams.get('destination') || undefined;
        const limit = parseInt(searchParams.get('limit') || '4', 10);

        let products = await fetchProducts();

        // Filter by destination if specified
        if (destination) {
            const searchDest = destination.toLowerCase();
            products = products.filter((p: any) =>
                (p.destinations || []).some((d: string) => d.toLowerCase() === searchDest) ||
                (p.destinations || []).length === 0
            );
        }

        products = products.slice(0, limit);
        return NextResponse.json({ products });
    } catch (error: any) {
        console.error('[api/products] Error:', error.message);
        return NextResponse.json({ products: [] });
    }
}
