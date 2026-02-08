export interface CloudinaryOptions {
    width?: number | string;
    height?: number | string;
    crop?: string;
    format?: string;
    quality?: number | string;
    aspectRatio?: string;
}

export function getCloudinaryUrl(publicId: string, options: CloudinaryOptions = {}): string {
    const {
        width = 'auto',
        height,
        crop = 'scale',
        format = 'auto',
        quality = 'auto',
        aspectRatio,
    } = options;

    // Base URL for Cloudinary
    const baseUrl = 'https://res.cloudinary.com/camelthar/image/upload';

    // Construct transformations
    const transformations = [
        width && `w_${width}`,
        height && `h_${height}`,
        crop && `c_${crop}`,
        format && `f_${format}`,
        quality && `q_${quality}`,
        aspectRatio && `ar_${aspectRatio}`,
    ].filter(Boolean).join(',');

    // Handle full URLs passed as publicId
    if (publicId.startsWith('http')) {
        // If it's already a Cloudinary URL, we could potentially manipulate it, 
        // but for safety, return as is or extract ID if needed.
        // Simple return for now to avoid breaking existing full URLs
        return publicId;
    }

    return `${baseUrl}/${transformations}/${publicId}`;
}
