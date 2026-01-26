import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadImage(file: File, path: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

export async function uploadBlogImage(file: File): Promise<string> {
    return uploadImage(file, 'blog-images');
}

export async function uploadCoverImage(file: File): Promise<string> {
    return uploadImage(file, 'cover-images');
}
