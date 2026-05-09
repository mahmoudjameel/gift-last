import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App;

try {
    // Check if already initialized
    firebaseApp = admin.app();
} catch (error) {
    // Initialize with project ID only (client-side uploads mode)
    const projectId = process.env.FIREBASE_PROJECT_ID || 'glorda';
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'glorda.firebasestorage.app';

    firebaseApp = admin.initializeApp({
        projectId,
        storageBucket,
    });
}

// Export initialized services
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const auth = getAuth(firebaseApp);

// Bucket not used - uploads are client-side
export const bucket = null;

export const firebaseAdmin = admin;

// Firestore settings
db.settings({ ignoreUndefinedProperties: true });

console.log('✅ Firebase Admin SDK initialized');
