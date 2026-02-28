
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
    // If not an image, return original
    if (!file.type.startsWith('image/')) return file;

    // Options for compression
    const options = {
        maxSizeMB: 1,           // Target 1MB
        maxWidthOrHeight: 1920, // ample for web
        useWebWorker: true,
        initialQuality: 0.8,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.warn('Image compression failed, using original file:', error);
        return file;
    }
}
