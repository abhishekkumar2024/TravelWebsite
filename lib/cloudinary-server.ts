import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary only on the server
// The Cloudinary Node.js SDK automatically reads CLOUDINARY_URL env var
// OR we can configure manually if we have separate keys
if (process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY, // Assume user has this too if secret is present
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

export default cloudinary;
