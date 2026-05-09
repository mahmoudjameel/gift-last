import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFirebaseConfigured } from '@/services/firebase';
import {
  submitProductReviewToFirestore,
  getProductReviewsFromFirestore,
  reviewExistsForOrderProduct,
  getMerchantReviews,
  type FirestoreReview,
} from '@/services/merchantFirestore';

const LOCAL_KEY = 'glorda_local_product_reviews_v1';

type LocalReviewRow = FirestoreReview & {
  dedupeKey: string;
  merchantId: string;
  productId: string;
  orderId: string;
  customerId: string;
};

async function loadLocal(): Promise<LocalReviewRow[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalReviewRow[]) : [];
  } catch {
    return [];
  }
}

async function saveLocal(rows: LocalReviewRow[]) {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

export type SubmitProductReviewParams = {
  merchantId: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  orderId: string;
};

export async function hasReviewedOrderProduct(
  customerId: string,
  orderId: string,
  productId: string
): Promise<boolean> {
  const dedupeKey = `${customerId}_${orderId}_${productId}`;
  const local = await loadLocal();
  if (local.some((r) => r.dedupeKey === dedupeKey)) return true;
  if (isFirebaseConfigured()) {
    return reviewExistsForOrderProduct(customerId, orderId, productId);
  }
  return false;
}

/** Saves to Firestore when configured; otherwise device-local storage (dev / offline). */
export async function submitProductReview(params: SubmitProductReviewParams): Promise<{ id: string; local: boolean }> {
  const dedupeKey = `${params.customerId}_${params.orderId}_${params.productId}`;
  if (await hasReviewedOrderProduct(params.customerId, params.orderId, params.productId)) {
    throw new Error('already_reviewed');
  }

  if (isFirebaseConfigured()) {
    const id = await submitProductReviewToFirestore(params);
    return { id, local: false };
  }

  const rows = await loadLocal();
  const rating = Math.min(5, Math.max(1, Math.round(params.rating)));
  const row: LocalReviewRow = {
    id: `local_${Date.now()}`,
    dedupeKey,
    merchantId: params.merchantId,
    productId: params.productId,
    orderId: params.orderId,
    customerId: params.customerId,
    customerName: params.customerName,
    customerAvatar: params.customerAvatar || '',
    rating,
    comment: (params.comment || '').trim(),
    date: new Date().toISOString().split('T')[0],
    productName: params.productName,
    helpful: 0,
  };
  rows.push(row);
  await saveLocal(rows);
  return { id: row.id, local: true };
}

export async function getMergedProductReviews(productId: string): Promise<FirestoreReview[]> {
  let remote: FirestoreReview[] = [];
  if (isFirebaseConfigured()) {
    try {
      remote = await getProductReviewsFromFirestore(productId);
    } catch {
      remote = [];
    }
  }
  const localRows = (await loadLocal()).filter((r) => r.productId === productId);
  const local: FirestoreReview[] = localRows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    customerAvatar: r.customerAvatar,
    rating: r.rating,
    comment: r.comment,
    date: r.date,
    productName: r.productName,
    helpful: r.helpful,
    reply: r.reply,
    productId: r.productId,
    orderId: r.orderId,
  }));
  const byId = new Map<string, FirestoreReview>();
  for (const r of remote) byId.set(r.id, r);
  for (const r of local) byId.set(r.id, r);
  return Array.from(byId.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Customer-facing store reviews: Firestore merchant reviews + local fallbacks. */
export async function getMergedMerchantReviews(merchantId: string): Promise<FirestoreReview[]> {
  let remote: FirestoreReview[] = [];
  if (isFirebaseConfigured()) {
    try {
      remote = await getMerchantReviews(merchantId);
    } catch {
      remote = [];
    }
  }
  const localRows = (await loadLocal()).filter((r) => r.merchantId === merchantId);
  const local: FirestoreReview[] = localRows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    customerAvatar: r.customerAvatar,
    rating: r.rating,
    comment: r.comment,
    date: r.date,
    productName: r.productName,
    helpful: r.helpful,
    reply: r.reply,
    productId: r.productId,
    orderId: r.orderId,
  }));
  const combined = [...remote, ...local];
  combined.sort((a, b) => (a.date < b.date ? 1 : -1));
  return combined;
}

export type { FirestoreReview };
