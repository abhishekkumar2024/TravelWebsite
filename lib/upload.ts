const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file: File, folder: string, onProgress?: (percent: number) => void): Promise<string> {
    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
    }

    // Helper to construct optimized URL
    const getOptimizedUrl = (publicId: string, resourceType: string) => {
        return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/f_auto,q_auto/${publicId}`;
    };

    // For files smaller than 20MB, use standard upload
    if (file.size < 20 * 1024 * 1024) {
        if (onProgress) onProgress(10); // Start progress at 10%
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        const res = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (onProgress) onProgress(100); // Complete progress

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Cloudinary upload failed: ${errorText}`);
        }

        const data = await res.json();
        return getOptimizedUrl(data.public_id, resourceType);
    }

    // Large file upload (Chunked)
    // Cloudinary supports unsigned chunked uploads via the /upload endpoint with Content-Range header
    const UNIQUE_UPLOAD_ID = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks (must be >= 5MB)
    const TOTAL_SIZE = file.size;
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

    let start = 0;
    let end = Math.min(CHUNK_SIZE, TOTAL_SIZE);
    let publicId = '';

    while (start < TOTAL_SIZE) {
        if (onProgress) {
            const percent = Math.round((start / TOTAL_SIZE) * 100);
            onProgress(percent);
        }

        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);

        // Headers for chunked upload
        const contentRange = `bytes ${start}-${end - 1}/${TOTAL_SIZE}`;

        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

        const res = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Unique-Upload-Id': UNIQUE_UPLOAD_ID,
                'Content-Range': contentRange
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Chunk upload failed at byte ${start}: ${errorText}`);
        }

        const data = await res.json();

        // If this was the last chunk, obtain the public_id
        if (end === TOTAL_SIZE) {
            publicId = data.public_id;
        }

        start = end;
        end = Math.min(start + CHUNK_SIZE, TOTAL_SIZE);
    }

    if (onProgress) onProgress(100);
    return getOptimizedUrl(publicId, resourceType);
}

export async function uploadBlogImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
    return uploadToCloudinary(file, 'blog-images', onProgress);
}

export async function uploadCoverImage(file: File, onProgress?: (percent: number) => void): Promise<string> {
    return uploadToCloudinary(file, 'cover-images', onProgress);
}

export async function uploadAvatar(file: File): Promise<string> {
    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary is not configured');
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'avatars');

    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error('Avatar upload failed');
    }

    const data = await res.json();
    const publicId = data.public_id;

    if (publicId) {
        // Optimized for avatars: 300x300, face focus, circular if we wanted but CSS is better for shape
        return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_300,h_300,c_thumb,g_face/${publicId}`;
    }

    return data.secure_url;
}

export function extractPublicIdFromUrl(url: string): string | null {
    try {
        // Example: https://res.cloudinary.com/cloud/image/upload/v12345/blog-images/pic.jpg
        // Or: https://res.cloudinary.com/cloud/image/upload/f_auto,q_auto/v12345/blog-images/pic.jpg
        const splitUrl = url.split('/upload/');
        if (splitUrl.length < 2) return null;

        const path = splitUrl[1];
        // Remove version if present (v12345/)
        const withoutVersion = path.replace(/^v\d+\//, '');
        // Remove transformations if present (f_auto,q_auto/)
        // Simple heuristic: if it contains comma or starts with w_, h_, f_, q_, c_, g_
        const parts = withoutVersion.split('/');
        if (parts[0].includes(',') || /^[whfcqg]_/.test(parts[0])) {
            parts.shift(); // Remove transformation part
        }

        // Remove version again? Sometimes transformations are followed by version
        let cleanPath = parts.join('/');
        if (cleanPath.startsWith('v') && /^\d+\//.test(cleanPath.substring(1))) {
            cleanPath = cleanPath.replace(/^v\d+\//, '');
        }

        // Remove extension
        const lastDotIndex = cleanPath.lastIndexOf('.');
        if (lastDotIndex === -1) return cleanPath;
        return cleanPath.substring(0, lastDotIndex);
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
}

export async function deleteMedia(publicId: string, resourceType: 'video' | 'image'): Promise<boolean> {
    try {
        const response = await fetch('/api/media/delete', {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publicId, resourceType }),
        });

        if (!response.ok) {
            console.error('Failed to delete media:', await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting media:', error);
        return false;
    }
}
