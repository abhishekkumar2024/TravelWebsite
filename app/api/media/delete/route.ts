import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary-server';

// Server-side route to delete media from Cloudinary
export async function POST(req: NextRequest) {
    if (!process.env.CLOUDINARY_API_SECRET) {
        return NextResponse.json(
            { error: 'Server configuration missing: CLOUDINARY_API_SECRET not set' },
            { status: 500 }
        );
    }

    try {
        const { publicId, resourceType } = await req.json();

        if (!publicId) {
            return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
        }

        // Validate resourceType to be 'image' or 'video'
        const type = resourceType === 'video' ? 'video' : 'image';

        // Use Cloudinary Node SDK to delete
        // Note: uploader.destroy uses signed API call
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: type,
            invalidate: true, // clear CDN cache
        });

        if (result.result !== 'ok' && result.result !== 'not found') {
            console.error('Cloudinary delete failed:', result);
            return NextResponse.json({ error: 'Delete failed', details: result }, { status: 500 });
        }

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('Delete API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
