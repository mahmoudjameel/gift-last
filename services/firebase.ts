import Constants from 'expo-constants';

/** Config only – no Firebase SDK imported at load time (avoids React Native runtime errors). */
export function getFirebaseConfig(): Record<string, string> | null {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  if (extra?.firebaseApiKey) {
    return {
      apiKey: extra.firebaseApiKey,
      authDomain: extra.firebaseAuthDomain || '',
      projectId: extra.firebaseProjectId || '',
      storageBucket: extra.firebaseStorageBucket || '',
      messagingSenderId: extra.firebaseMessagingSenderId || '',
      appId: extra.firebaseAppId || '',
    };
  }
  if (process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    return {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    };
  }
  return null;
}

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return !!(config && config.apiKey && config.projectId);
};

/** Lazy init: load Firebase SDK only when first needed (after app has registered). */
let app: unknown = null;
let auth: unknown = null;
let db: unknown = null;
let functions: unknown = null;
let storage: unknown = null;

export async function getFirebase(): Promise<{
  app: unknown;
  auth: unknown;
  db: unknown;
  functions: unknown;
  storage: unknown;
}> {
  if (auth && db && functions && storage) {
    return { app, auth, db, functions, storage };
  }
  const config = getFirebaseConfig();
  if (!config?.apiKey || !config?.projectId) {
    return { app: null, auth: null, db: null, functions: null, storage: null };
  }
  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    const { getFunctions } = await import('firebase/functions');
    const { getStorage } = await import('firebase/storage');
    app = initializeApp(config);
    auth = getAuth(app as import('firebase/app').FirebaseApp);
    db = getFirestore(app as import('firebase/app').FirebaseApp);
    functions = getFunctions(app as import('firebase/app').FirebaseApp);
    storage = getStorage(app as import('firebase/app').FirebaseApp);
    return { app, auth, db, functions, storage };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return { app: null, auth: null, db: null, functions: null, storage: null };
  }
}
