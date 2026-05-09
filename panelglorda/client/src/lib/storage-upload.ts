import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

// Initialize Firebase Storage
const storage = getStorage(app);

/**
 * Upload file directly to Firebase Storage from client
 * @param file - File to upload
 * @param folder - Storage folder path (e.g., 'products', 'documents')
 * @returns Promise<string> - Download URL of uploaded file
 */
export async function uploadToStorage(file: File, folder: string): Promise<string> {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

    // Create storage reference
    const storageRef = ref(storage, filename);

    // Upload file
    await uploadBytes(storageRef, file, {
        contentType: file.type,
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

/**
 * Upload multiple files to Firebase Storage
 * @param files - Array of files to upload
 * @param folder - Storage folder path
 * @returns Promise<string[]> - Array of download URLs
 */
export async function uploadMultipleToStorage(files: File[], folder: string): Promise<string[]> {
    const uploadPromises = files.map(file => uploadToStorage(file, folder));
    return Promise.all(uploadPromises);
}
