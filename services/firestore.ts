/**
 * Firestore helpers for the new app.
 * Uses lazy Firebase from getFirebase() to avoid load-time errors.
 */
import type { Product } from '@/types';

const getDateFromTimestamp = (timestamp: unknown): Date => {
  if (!timestamp) return new Date(0);
  const t = timestamp as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
  if (t.seconds != null) {
    return new Date(t.seconds * 1000 + ((t.nanoseconds || 0) / 1000000));
  }
  if (typeof t.toDate === 'function') return t.toDate();
  return new Date(timestamp as number);
};

/** Get Firestore db with retry (like old app: db is used synchronously there, we init async so retry once if null). */
async function getDb(): Promise<import('firebase/firestore').Firestore | null> {
  const mod = await import('@/services/firebase');
  let result = await mod.getFirebase();
  if (result.db) return result.db as import('firebase/firestore').Firestore;
  await new Promise((r) => setTimeout(r, 600));
  result = await mod.getFirebase();
  return result.db as import('firebase/firestore').Firestore | null;
}

/** Get a generic app setting from the settings collection */
export async function getAppSetting(key: string): Promise<string> {
  const db = await getDb();
  if (!db) return '';
  const { doc, getDoc } = await import('firebase/firestore');
  try {
    const snap = await getDoc(doc(db, 'settings', key));
    if (snap.exists()) {
      return snap.data()?.value || '';
    }
  } catch (e) {
    console.warn(`[getAppSetting] Error fetching ${key}:`, e);
  }
  return '';
}
/** Resolve category names from lookup (same logic as old app) */
function resolveCategoryNames(
  p: Record<string, unknown>,
  categoryById: Record<string, { nameAr?: string; nameEn?: string; name?: string }>,
  categoryByDocId: Record<string, { nameAr?: string; nameEn?: string; name?: string }>,
  categoryByName: Record<string, { nameAr?: string; nameEn?: string; name?: string }>
): { nameAr: string; nameEn: string } {
  const id = p.categoryId?.toString() ?? (p.category as string) ?? '';
  const byId = id && categoryById[id];
  if (byId) return { nameAr: byId.nameAr || byId.name || '', nameEn: byId.nameEn || byId.name || '' };
  const byDocId = (p.category as string) && categoryByDocId[p.category as string];
  if (byDocId) return { nameAr: byDocId.nameAr || byDocId.name || '', nameEn: byDocId.nameEn || byDocId.name || '' };
  const byName = (p.category as string) && categoryByName[p.category as string];
  if (byName) return { nameAr: byName.nameAr || byName.name || '', nameEn: byName.nameEn || byName.name || '' };
  return { nameAr: (p.category as string) || '', nameEn: (p.category as string) || '' };
}

/** Map Firestore product to app Product (aligned with old app mapping) */
function mapFirestoreProductToAppProduct(
  p: Record<string, unknown>,
  categoryNameAr: string,
  categoryNameEn: string,
  merchantName: string,
  merchantCity: string,
  merchantLogo?: string
): Product {
  let images: string[] = [];
  if (Array.isArray(p.images)) images = p.images as string[];
  else if (p.image) images = [p.image as string];
  const image = images[0] || (p.image as string) || '';
  const nameAr = (p.nameAr as string) || (p.name as string) || '';
  const nameEn = (p.nameEn as string) || (p.name as string) || '';
  const price = p.price != null
    ? (typeof p.price === 'number' ? Math.round(p.price) : Math.round(parseFloat(String(p.price)) || 0))
    : 0;
  const originalPrice = p.originalPrice != null
    ? (typeof p.originalPrice === 'number' ? Math.round(p.originalPrice) : Math.round(parseFloat(String(p.originalPrice)) || 0))
    : undefined;
  let city = (p.city as string) || merchantCity || '';
  if (typeof p.city === 'object' && p.city !== null) {
    const raw = p.city as Record<string, unknown>;
    city = String(raw.id ?? raw.name ?? raw.nameAr ?? raw.nameEn ?? '');
  } else if (p.merchantCity) city = String(p.merchantCity);
  return {
    id: (p.id as string) || '',
    name: nameAr,
    nameEn,
    description: (p.descriptionAr as string) || (p.description as string) || '',
    price,
    originalPrice,
    image,
    images: images.length ? images : (image ? [image] : []),
    category: categoryNameAr || (p.category as string) || '',
    categoryEn: categoryNameEn || (p.category as string) || '',
    rating: typeof p.rating === 'number' ? p.rating : 0,
    reviewCount: typeof p.reviewsCount === 'number' ? p.reviewsCount : 0,
    shopName: merchantName || (p.merchantName as string) || '',
    shopImage: merchantLogo || (p.merchantImage as string) || '',
    isFavorite: false,
    inStock: (p.inStock as boolean) !== false,
    stock: typeof p.stock === 'number' ? p.stock : 99,
    isHidden: (p.isHidden as boolean) === true,
    tags: (p.tags as string[]) || [],
    city,
    storeId: p.merchantId != null ? String(p.merchantId) : undefined,
    hasGiftCard: (p.allowsGiftCard as boolean) === true,
    giftCardFee: typeof p.giftCardFee === 'number' ? p.giftCardFee : undefined,
  };
}

// ========== BANNERS ==========
export interface AppBanner {
  id: string;
  image: string;
  text: string;
}

export async function getBanners(): Promise<AppBanner[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const { collection, getDocs } = await import('firebase/firestore');
    const firestore = db as import('firebase/firestore').Firestore;
    const snap = await getDocs(collection(firestore, 'banners'));
    let list = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, ...data };
    });
    list = list
      .filter((b: any) => b.isActive === true)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return list.map((b: any) => ({
      id: b.id,
      image: b.image || b.imageUrl || b.photo || '',
      text: b.text || b.titleAr || b.titleEn || b.title || '',
    })).filter((b) => b.image || b.text);
  } catch (e) {
    console.error('getBanners error:', e);
    return [];
  }
}

// ========== CATEGORIES ==========
export interface FirestoreCategory {
  id: string | number;
  docId?: string;
  nameAr?: string;
  nameEn?: string;
  name?: string;
  image?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function getCategories(): Promise<FirestoreCategory[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db as import('firebase/firestore').Firestore, 'categories'));
    let list = snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: (data.id as string | number) ?? doc.id,
        ...data,
        docId: doc.id,
      } as FirestoreCategory;
    });
    list = list
      .filter((c) => c.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    console.log('[getCategories] عدد التصنيفات:', list.length);
    list.forEach((c, i) => {
      console.log(`  [${i + 1}] id: ${c.id}, nameAr: ${c.nameAr ?? c.name}, nameEn: ${c.nameEn ?? c.name}`);
    });
    return list;
  } catch (e) {
    console.error('getCategories error:', e);
    return [];
  }
}

// ========== PRODUCTS ==========
/** Fetch products the same way as the old app: status filter, active merchants only, sort by createdAt */
export async function getProductsFromFirestore(filters?: {
  category?: string;
  merchantId?: string | number;
  status?: string;
}): Promise<Product[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
    const firestore = db;

    const snap = await getDocs(collection(firestore, 'products'));
    let products = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    console.log('[getProducts] من Firestore (كل المنتجات):', products.length);

    const statusFilter = filters?.status ?? 'active';
    let afterStatus = products.filter((p) => ((p.status as string) || 'active') === statusFilter);
    if (afterStatus.length === 0 && products.length > 0) {
      console.log('[getProducts] لا منتجات active، نعرض الكل. عدد المنتجات:', products.length);
      afterStatus = products;
    } else {
      console.log('[getProducts] بعد فلتر status=', statusFilter, ':', afterStatus.length);
    }
    products = afterStatus;

    let beforeMerchant = products;
    try {
      const merchantsSnap = await getDocs(collection(firestore, 'merchants'));
      const activeMerchants = new Set<string>();
      merchantsSnap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        if (data.status !== 'active') return;
        activeMerchants.add(d.id);
        if (data.id != null && String(data.id) !== d.id) activeMerchants.add(String(data.id));
      });
      console.log('[getProducts] تجار نشطون (activeMerchants):', activeMerchants.size, Array.from(activeMerchants).slice(0, 5));
      if (activeMerchants.size > 0) {
        products = products.filter((p) => {
          const mid = p.merchantId != null ? String(p.merchantId) : '';
          return mid && activeMerchants.has(mid);
        });
        console.log('[getProducts] بعد فلتر التجار:', products.length);
        if (products.length === 0 && beforeMerchant.length > 0) {
          console.log('[getProducts] لا منتجات لتجار نشطين، نعرض المنتجات بدون فلتر تاجر');
          products = beforeMerchant;
        }
      }
    } catch (err) {
      console.warn('[getProducts] خطأ جلب التجار، نكمل بالمنتجات:', err);
    }

    if (filters?.category) {
      products = products.filter(
        (p) =>
          (p.category as string) === filters.category ||
          (p.categoryId as string) === filters.category
      );
    }
    if (filters?.merchantId != null) {
      const mid = String(filters.merchantId);
      products = products.filter((p) => p.merchantId != null && String(p.merchantId) === mid);
    }

    products.sort((a, b) => {
      const da = getDateFromTimestamp(a.createdAt);
      const db_ = getDateFromTimestamp(b.createdAt);
      return db_.getTime() - da.getTime();
    });

    const categoriesSnap = await getDocs(collection(firestore, 'categories'));
    const categoryById: Record<string, { nameAr?: string; nameEn?: string; name?: string }> = {};
    const categoryByDocId: Record<string, { nameAr?: string; nameEn?: string; name?: string }> = {};
    const categoryByName: Record<string, { nameAr?: string; nameEn?: string; name?: string }> = {};
    categoriesSnap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const id = String(data.id ?? d.id);
      const nameAr = (data.nameAr as string) || (data.name as string) || '';
      const nameEn = (data.nameEn as string) || (data.name as string) || '';
      const entry = { nameAr, nameEn, name: nameAr || nameEn };
      categoryById[id] = entry;
      categoryByDocId[d.id] = entry;
      if (nameAr) categoryByName[nameAr] = entry;
      if (nameEn) categoryByName[nameEn] = entry;
    });

    const merchantIds = [...new Set(products.map((p) => String(p.merchantId)).filter(Boolean))];
    const merchantsMap: Record<string, { name: string; city: string; logo: string }> = {};

    if (merchantIds.length > 0) {
      // 1. Try fetching by Document ID (efficient getDoc)
      await Promise.all(
        merchantIds.slice(0, 80).map(async (mid) => {
          try {
            const ref = doc(firestore, 'merchants', mid);
            const merchantSnap = await getDoc(ref);
            if (merchantSnap.exists()) {
              const data = merchantSnap.data() as Record<string, unknown>;
              merchantsMap[mid] = extractMerchantBasicInfo(data);
            }
          } catch { /* ignore */ }
        })
      );

      // 2. For any merchantIds not found by docId, try querying by the 'id' field
      const missingIds = merchantIds.filter(mid => !merchantsMap[mid]);
      if (missingIds.length > 0) {
        try {
          const { query, where, collection, getDocs } = await import('firebase/firestore');
          // Firestore 'in' query supports up to 30 values
          for (let i = 0; i < missingIds.length; i += 15) {
            const chunk = missingIds.slice(i, i + 15);
            // Include both string and number versions for the 'in' query
            const expandedChunk: (string | number)[] = [...chunk];
            chunk.forEach(id => {
              const num = parseInt(id, 10);
              if (!isNaN(num) && String(num) === id) expandedChunk.push(num);
            });

            const q = query(collection(firestore, 'merchants'), where('id', 'in', expandedChunk));
            const qSnap = await getDocs(q);
            qSnap.docs.forEach(d => {
              const data = d.data() as Record<string, unknown>;
              const internalId = data.id != null ? String(data.id) : null;
              if (internalId) {
                merchantsMap[internalId] = extractMerchantBasicInfo(data);
              }
              // Also map by docId just in case
              merchantsMap[d.id] = extractMerchantBasicInfo(data);
            });
          }
        } catch (err) {
          console.warn('[getProducts] Fallback merchant query failed:', err);
        }
      }
    }

    function extractMerchantBasicInfo(data: Record<string, unknown>) {
      const name =
        (data.storeNameAr as string) ||
        (data.storeNameEn as string) ||
        (data.storeName as string) ||
        (data.shopNameAr as string) ||
        (data.shopNameEn as string) ||
        (data.shopName as string) ||
        (data.nameAr as string) ||
        (data.nameEn as string) ||
        (data.name as string) ||
        (data.merchantName as string) ||
        '';
      const city = (data.city as string) || (data.cityAr as string) || '';
      const logo =
        (data.storeImage as string) ||
        (data.logo as string) ||
        (data.logoUrl as string) ||
        (data.avatar as string) ||
        (data.image as string) ||
        '';
      return { name, city, logo };
    }

    const mapped = products.map((p) => {
      const { nameAr: catAr, nameEn: catEn } = resolveCategoryNames(p, categoryById, categoryByDocId, categoryByName);
      const merchantId = p.merchantId != null ? String(p.merchantId) : '';
      const merchant = merchantsMap[merchantId];
      const merchantName = merchant?.name || (p.merchantName as string) || '';
      const merchantCity = merchant?.city || '';
      const merchantLogo = merchant?.logo;
      return mapFirestoreProductToAppProduct(p, catAr, catEn, merchantName, merchantCity, merchantLogo);
    });
    console.log('[getProducts] النتيجة النهائية (بعد التحويل):', mapped.length);
    mapped.slice(0, 5).forEach((p, i) => {
      console.log(`  [${i + 1}] id: ${p.id}, name: ${p.name}, category: ${p.category}, city: ${p.city}, storeId: ${p.storeId}`);
    });
    return mapped;
  } catch (e) {
    console.error('getProductsFromFirestore error:', e);
    return [];
  }
}

// ========== MERCHANTS (STORES) ==========

function parseFirestoreCoord(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/** Shape used by store profile screen (id, name, city, logo, banner, etc.) */
export interface FirestoreStore {
  id: string;
  name: string;
  username: string;
  city: string;
  cityId?: string;
  latitude?: number;
  longitude?: number;
  /** عنوان تفصيلي للعرض (من تعديل المتجر / التسجيل) */
  locationAddress?: string;
  rating: number;
  reviewCount: number;
  description: string;
  logo: string;
  banner: string;
  isOpen: boolean;
  /** false = التاجر أوقف التوصيل للعملاء */
  deliveryEnabled?: boolean;
  /** false = التاجر أوقف الاستلام من الفرع */
  pickupEnabled?: boolean;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  snapchat?: string;
  website?: string;
  chatId: string;
}

export async function getMerchantsFromFirestore(): Promise<Record<string, FirestoreStore>> {
  try {
    const db = await getDb();
    if (!db) return {};
    const { collection, getDocs } = await import('firebase/firestore');
    const firestore = db as import('firebase/firestore').Firestore;
    const snap = await getDocs(collection(firestore, 'merchants'));
    const result: Record<string, FirestoreStore> = {};
    snap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      if (data.status === 'active' || data.status == null) {
        const docId = d.id;
        const internalId = data.id != null ? String(data.id) : null;

        const name =
          (data.storeNameAr as string) ||
          (data.storeNameEn as string) ||
          (data.storeName as string) ||
          (data.shopNameAr as string) ||
          (data.shopNameEn as string) ||
          (data.shopName as string) ||
          (data.nameAr as string) ||
          (data.nameEn as string) ||
          (data.name as string) ||
          (data.merchantName as string) ||
          '';
        const city = (data.city as string) || (data.cityAr as string) || '';
        const cityId = data.cityId != null ? String(data.cityId) : undefined;
        const latitude = parseFirestoreCoord(data.latitude ?? data.lat);
        const longitude = parseFirestoreCoord(data.longitude ?? data.lng);
        const locationAddress =
          (data.formattedAddress as string) ||
          (data.formattedAddressAr as string) ||
          (data.storeAddress as string) ||
          (data.locationAddress as string) ||
          undefined;
        const logo =
          (data.storeImage as string) ||
          (data.logo as string) ||
          (data.logoUrl as string) ||
          (data.avatar as string) ||
          (data.image as string) ||
          '';

        const storeData: FirestoreStore = {
          id: docId, // Always use docId as the primary key for the object
          name,
          username: (data.username as string) || (data.phone as string) || `@${docId.slice(0, 8)}`,
          city,
          cityId,
          latitude,
          longitude,
          locationAddress,
          rating: typeof data.rating === 'number' ? data.rating : 4,
          reviewCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
          description: (data.descriptionAr as string) || (data.description as string) || '',
          logo,
          banner: (data.banner as string) || (data.bannerUrl as string) || (data.coverImage as string) || '',
          isOpen: (data.isOpen as boolean) !== false,
          deliveryEnabled: (data.deliveryEnabled as boolean) !== false,
          pickupEnabled: (data.pickupEnabled as boolean) !== false,
          instagram: data.instagram as string | undefined,
          tiktok: data.tiktok as string | undefined,
          facebook: data.facebook as string | undefined,
          twitter: data.twitter as string | undefined,
          snapchat: data.snapchat as string | undefined,
          website: data.website as string | undefined,
          chatId: (data.chatId as string) || `chat_${docId}`,
        };

        // Map by Document ID
        result[docId] = storeData;

        // Also map by internal ID if it exists and is different
        if (internalId && internalId !== docId) {
          result[internalId] = storeData;
        }
      }
    });
    return result;
  } catch (e) {
    console.error('getMerchantsFromFirestore error:', e);
    return {};
  }
}

/** Fetch a single merchant by id (e.g. when store screen opens before storesById is populated) */
export async function getMerchantById(merchantId: string): Promise<FirestoreStore | null> {
  if (!merchantId) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const { doc, getDoc, collection, query, where, getDocs, limit } = await import('firebase/firestore');
    const firestore = db as import('firebase/firestore').Firestore;

    // 1. Try Document ID lookup first
    const snap = await getDoc(doc(firestore, 'merchants', merchantId));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      return mapMerchantData(snap.id, data);
    }

    // 2. Try internal 'id' field lookup (check string and number)
    const conditions = [where('id', '==', merchantId)];
    const numericId = parseInt(merchantId, 10);
    if (!isNaN(numericId) && String(numericId) === merchantId) {
      conditions.push(where('id', '==', numericId) as any);
    }

    for (const cond of conditions) {
      const q = query(collection(firestore, 'merchants'), cond, limit(1));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const d = querySnap.docs[0];
        return mapMerchantData(d.id, d.data() as Record<string, unknown>);
      }
    }

    return null;
  } catch (e) {
    console.error('getMerchantById error:', e);
    return null;
  }
}

/** Helper to map raw merchant data to FirestoreStore */
function mapMerchantData(docId: string, data: Record<string, unknown>): FirestoreStore {
  const name =
    (data.storeNameAr as string) ||
    (data.storeNameEn as string) ||
    (data.storeName as string) ||
    (data.shopNameAr as string) ||
    (data.shopNameEn as string) ||
    (data.shopName as string) ||
    (data.nameAr as string) ||
    (data.nameEn as string) ||
    (data.name as string) ||
    (data.merchantName as string) ||
    '';
  const city = (data.city as string) || (data.cityAr as string) || '';
  const cityId = data.cityId != null ? String(data.cityId) : undefined;
  const latitude = parseFirestoreCoord(data.latitude ?? data.lat);
  const longitude = parseFirestoreCoord(data.longitude ?? data.lng);
  const locationAddress =
    (data.formattedAddress as string) ||
    (data.formattedAddressAr as string) ||
    (data.storeAddress as string) ||
    (data.locationAddress as string) ||
    undefined;
  const logo =
    (data.storeImage as string) ||
    (data.logo as string) ||
    (data.logoUrl as string) ||
    (data.avatar as string) ||
    (data.image as string) ||
    '';
  return {
    id: docId,
    name,
    username: (data.username as string) || (data.phone as string) || `@${docId.slice(0, 8)}`,
    city,
    cityId,
    latitude,
    longitude,
    locationAddress,
    rating: typeof data.rating === 'number' ? data.rating : 4,
    reviewCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
    description: (data.descriptionAr as string) || (data.description as string) || '',
    logo,
    banner: (data.banner as string) || (data.bannerUrl as string) || (data.coverImage as string) || '',
    isOpen: (data.isOpen as boolean) !== false,
    deliveryEnabled: (data.deliveryEnabled as boolean) !== false,
    pickupEnabled: (data.pickupEnabled as boolean) !== false,
    instagram: data.instagram as string | undefined,
    tiktok: data.tiktok as string | undefined,
    facebook: data.facebook as string | undefined,
    twitter: data.twitter as string | undefined,
    snapchat: data.snapchat as string | undefined,
    website: data.website as string | undefined,
    chatId: (data.chatId as string) || `chat_${docId}`,
  };
}

/** Prefer username for chat labels; then name; then phone. */
function displayNameFromUserFields(data: Record<string, unknown>): string {
  const username = (data.username as string)?.trim() || '';
  const name = (data.name as string)?.trim() || (data.fullName as string)?.trim() || '';
  const phone = (data.phone as string)?.trim() || (data.mobile as string)?.trim() || '';
  return username || name || phone;
}

/** Fetch a customer profile (chat uses Firebase UID as customerId; also supports legacy numeric ids). */
export async function getCustomerById(customerId: string | number): Promise<{ name: string; avatar?: string } | null> {
  if (!customerId) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const { doc, getDoc, collection, query, where, getDocs, limit } = await import('firebase/firestore');
    const firestore = db as import('firebase/firestore').Firestore;

    const idStr = String(customerId).trim();
    const idNum = parseInt(idStr, 10);

    const fromCustomerDoc = (data: Record<string, unknown>): { name: string; avatar?: string } => ({
      name:
        (data.username as string)?.trim() ||
        (data.name as string) ||
        (data.fullName as string) ||
        (data.mobile as string) ||
        '',
      avatar: (data.avatar as string) || (data.image as string) || '',
    });

    // 1) users/{uid} — direct chats store Firebase Auth UID as customerId
    const userByUid = await getDoc(doc(firestore, 'users', idStr));
    if (userByUid.exists()) {
      const data = userByUid.data() as Record<string, unknown>;
      const label = displayNameFromUserFields(data);
      if (label) {
        return {
          name: label,
          avatar: (data.avatar as string) || (data.image as string) || '',
        };
      }
    }

    // 2) Legacy id shape customer_<digits>: try users/{suffix}, then customers by numeric id
    if (idStr.startsWith('customer_')) {
      const suffix = idStr.slice('customer_'.length);
      const userBySuffix = await getDoc(doc(firestore, 'users', suffix));
      if (userBySuffix.exists()) {
        const data = userBySuffix.data() as Record<string, unknown>;
        const label = displayNameFromUserFields(data);
        if (label) {
          return {
            name: label,
            avatar: (data.avatar as string) || (data.image as string) || '',
          };
        }
      }
      const suffixNum = parseInt(suffix, 10);
      if (!Number.isNaN(suffixNum)) {
        const qNum = query(collection(firestore, 'customers'), where('id', '==', suffixNum), limit(1));
        const snapNum = await getDocs(qNum);
        if (!snapNum.empty) {
          const row = fromCustomerDoc(snapNum.docs[0].data() as Record<string, unknown>);
          if (row.name) return row;
        }
      }
    }

    // 3) customers where id matches string or number
    const conditions = [where('id', '==', idStr)];
    if (!Number.isNaN(idNum) && String(idNum) === idStr) {
      conditions.push(where('id', '==', idNum) as any);
    }
    for (const cond of conditions) {
      const q = query(collection(firestore, 'customers'), cond, limit(1));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const row = fromCustomerDoc(querySnap.docs[0].data() as Record<string, unknown>);
        if (row.name) return row;
      }
    }

    // 4) users where customerId == idStr (numeric or string)
    const usersByCustomerId = query(collection(firestore, 'users'), where('customerId', '==', idStr), limit(1));
    const usersSnap = await getDocs(usersByCustomerId);
    if (!usersSnap.empty) {
      const data = usersSnap.docs[0].data() as Record<string, unknown>;
      const label = displayNameFromUserFields(data);
      if (label) {
        return {
          name: label,
          avatar: (data.avatar as string) || (data.image as string) || '',
        };
      }
    }

    if (!Number.isNaN(idNum) && String(idNum) === idStr) {
      const usersByNum = query(collection(firestore, 'users'), where('customerId', '==', idNum), limit(1));
      const usersNumSnap = await getDocs(usersByNum);
      if (!usersNumSnap.empty) {
        const data = usersNumSnap.docs[0].data() as Record<string, unknown>;
        const label = displayNameFromUserFields(data);
        if (label) {
          return {
            name: label,
            avatar: (data.avatar as string) || (data.image as string) || '',
          };
        }
      }
    }

    return null;
  } catch (e) {
    console.error('getCustomerById error:', e);
    return null;
  }
}
