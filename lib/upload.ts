const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const data = await res.json();
    const publicId = data.public_id as string | undefined;

    // Prefer a transformed, optimized URL so images are efficiently resized
    // and encoded when served. This does not change what is stored in Cloudinary,
    // only how the image is delivered to the client.
    if (publicId) {
        const transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_1400/${publicId}`;
        return transformedUrl;
    }

    // Fallback to the original secure URL if public_id is missing for any reason.
    return data.secure_url as string;
}

export async function uploadBlogImage(file: File): Promise<string> {
    return uploadToCloudinary(file, 'blog-images');
}

export async function uploadCoverImage(file: File): Promise<string> {
    return uploadToCloudinary(file, 'cover-images');
}

