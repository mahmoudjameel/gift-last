import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Debug: Check if storageBucket is loaded correctly
console.log('🔥 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    hasStorageBucket: !!firebaseConfig.storageBucket
});

// Initialize Firebase core services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);/** استدعاء دالة سحابية (مثلاً إرسال إشعار ترويجي لجميع المستخدمين) */
export async function callSendPromotionalPush(adId: string): Promise<{ success: boolean; message?: string }> {
  const sendPromotionalPush = httpsCallable<{ adId: string }, { success: boolean; message?: string }>(functions, 'sendPromotionalPush');
  const result = await sendPromotionalPush({ adId });
  return result.data;
}
