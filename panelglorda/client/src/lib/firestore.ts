import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

// Generic helpers for Firestore CRUD

export async function getDocData<T = DocumentData>(path: string): Promise<T | null> {
  const snapshot = await getDoc(doc(db, path));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T;
}

// Helper function to remove undefined values from object (Firestore doesn't allow undefined)
function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function setDocData(path: string, data: Record<string, unknown>) {
  // Remove undefined values before saving (Firestore doesn't allow undefined)
  const cleanedData = removeUndefined(data);
  
  // Check if document exists to determine if we should set createdAt
  const docRef = doc(db, path);
  const docSnap = await getDoc(docRef);
  const isNewDoc = !docSnap.exists();
  
  const docData: Record<string, unknown> = {
    ...cleanedData,
    updatedAt: serverTimestamp(),
  };
  
  // Only set createdAt for new documents
  if (isNewDoc) {
    docData.createdAt = serverTimestamp();
  }
  
  await setDoc(docRef, docData, { merge: true });
}

export async function updateDocData(path: string, data: Record<string, unknown>) {
  // Remove undefined values before updating (Firestore doesn't allow undefined)
  const cleanedData = removeUndefined(data);
  
  await updateDoc(doc(db, path), {
    ...cleanedData,
    updatedAt: serverTimestamp(),
  });
}

export async function addCollectionDoc<T = DocumentData>(collectionPath: string, data: Record<string, unknown>) {
  // Remove undefined values before adding (Firestore doesn't allow undefined)
  const cleanedData = removeUndefined(data);
  
  const ref = await addDoc(collection(db, collectionPath), {
    ...cleanedData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id as string;
}

export async function getCollectionWhere<T = DocumentData>(
  collectionPath: string,
  field: string,
  value: unknown
): Promise<T[]> {
  const q = query(collection(db, collectionPath), where(field, "==", value));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

export async function getCollectionAll<T = DocumentData>(collectionPath: string): Promise<T[]> {
  const snap = await getDocs(collection(db, collectionPath));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

export { serverTimestamp } from "firebase/firestore";






