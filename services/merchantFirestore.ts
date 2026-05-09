/**
 * Merchant Firestore service — handles all merchant-side Firebase operations.
 * Mirrors the old panel's merchant-data.ts logic adapted for React Native.
 */
import type { Product, StoreInfo, Order, WalletTransaction, User } from '@/types';

async function getDb(): Promise<import('firebase/firestore').Firestore | null> {
  const mod = await import('@/services/firebase');
  let result = await mod.getFirebase();
  if (result.db) return result.db as import('firebase/firestore').Firestore;
  await new Promise((r) => setTimeout(r, 600));
  result = await mod.getFirebase();
  return result.db as import('firebase/firestore').Firestore | null;
}

async function getStorage(): Promise<import('firebase/storage').FirebaseStorage | null> {
  const mod = await import('@/services/firebase');
  const result = await mod.getFirebase();
  return result.storage as import('firebase/storage').FirebaseStorage | null;
}

async function getAuth(): Promise<import('firebase/auth').Auth | null> {
  const mod = await import('@/services/firebase');
  const result = await mod.getFirebase();
  return result.auth as import('firebase/auth').Auth | null;
}

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ========== IMAGE UPLOAD ==========

export async function uploadImageToStorage(
  localUri: string,
  folder: string
): Promise<string> {
  const storage = await getStorage();
  if (!storage) throw new Error('Firebase Storage not initialized');

  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

  const response = await fetch(localUri);
  const blob = await response.blob();

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const extension = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const filename = `${folder}/${timestamp}-${randomStr}.${extension}`;

  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob, { contentType: `image/${extension}` });
  return await getDownloadURL(storageRef);
}

export async function uploadMultipleImages(
  uris: string[],
  folder: string
): Promise<string[]> {
  return Promise.all(uris.map((uri) => uploadImageToStorage(uri, folder)));
}

// ========== MERCHANT REGISTRATION ==========

export async function registerMerchantInFirestore(
  info: StoreInfo,
  currentUser: User
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const auth = await getAuth();
  const uid = auth?.currentUser?.uid || currentUser.id;
  if (!uid) throw new Error('No authenticated user');

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

  let nationalIdUrl: string | undefined;
  let freelanceDocUrl: string | undefined;
  let commercialRegUrl: string | undefined;

  if (info.nationalIdUri && !info.nationalIdUri.startsWith('http')) {
    nationalIdUrl = await uploadImageToStorage(info.nationalIdUri, 'documents');
  } else {
    nationalIdUrl = info.nationalIdUri;
  }

  if (info.freelanceDocUri && !info.freelanceDocUri.startsWith('http')) {
    freelanceDocUrl = await uploadImageToStorage(info.freelanceDocUri, 'documents');
  } else {
    freelanceDocUrl = info.freelanceDocUri;
  }

  if (info.commercialRegUri && !info.commercialRegUri.startsWith('http')) {
    commercialRegUrl = await uploadImageToStorage(info.commercialRegUri, 'documents');
  } else {
    commercialRegUrl = info.commercialRegUri;
  }

  const entityToStoreType = (et: string) => {
    if (et === 'individual') return 'individual';
    if (et === 'institution') return 'institution';
    return 'company';
  };

  const registrationNumber =
    info.entityType === 'individual'
      ? (info.freelanceDocNumber || '')
      : (info.commercialRegNumber || '');

  const merchantData = removeUndefined({
    storeName: info.name,
    storeNameAr: info.name,
    ownerName: currentUser.name || '',
    username: info.username,
    storeType: entityToStoreType(info.entityType),
    entityType: info.entityType,
    city: info.city,
    cityAr: info.city,
    cityId: info.cityId,
    latitude: info.latitude,
    longitude: info.longitude,
    formattedAddress: info.locationAddress,
    formattedAddressAr: info.locationAddress,
    storeAddress: info.locationAddress,
    locationAddress: info.locationAddress,
    isOpen: info.isOpen ?? true,
    status: 'pending',
    balance: 0,
    category: 'all',
    mobile: currentUser.phone || info.phone || '',
    phone: currentUser.phone || info.phone || '',
    email: currentUser.email || info.email || '',
    description: info.description || '',
    bio: info.description || '',
    registrationNumber,
    deliveryMethod: 'all',
    branches: [],
    nationalIdImage: nationalIdUrl || '',
    nationalIdUrl: nationalIdUrl || '',
    freelanceCertificateImage: freelanceDocUrl || '',
    freelanceDocUrl: freelanceDocUrl || '',
    freelanceDocNumber: info.freelanceDocNumber || '',
    commercialRegistrationDoc: commercialRegUrl || '',
    commercialRegUrl: commercialRegUrl || '',
    commercialRegNumber: info.commercialRegNumber || '',
    bankName: info.bankName || '',
    iban: info.iban || '',
    beneficiaryName: info.beneficiaryName || '',
    accountHolderName: info.beneficiaryName || '',
    storeImage: info.storeImage || '',
    banner: info.bannerImage || '',
    website: info.website || '',
    socialLinks: removeUndefined({
      website: info.website || undefined,
    }),
    rating: 0,
    reviewsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'merchants', uid), merchantData);

  await setDoc(doc(db, 'users', uid), removeUndefined({
    name: currentUser.name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    storeName: info.name,
    role: 'merchant',
    merchantId: uid,
    updatedAt: serverTimestamp(),
  }), { merge: true });

  return uid;
}

// ========== MERCHANT STATUS ==========

export type MerchantStatusValue = 'pending' | 'active' | 'rejected' | 'suspended';

export async function getMerchantStatus(merchantId: string): Promise<MerchantStatusValue | null> {
  const db = await getDb();
  if (!db || !merchantId) return null;

  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'merchants', merchantId));
  if (!snap.exists()) return null;

  const status = snap.data()?.status as string | undefined;
  if (status === 'active' || status === 'rejected' || status === 'suspended') return status;
  return 'pending';
}

// ========== MERCHANT PROFILE ==========

export async function getMerchantProfile(merchantId: string): Promise<StoreInfo | null> {
  const db = await getDb();
  if (!db || !merchantId) return null;

  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'merchants', merchantId));
  if (!snap.exists()) return null;

  const d = snap.data() as Record<string, unknown>;
  const toNum = (v: unknown): number | undefined => {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    return undefined;
  };
  return {
    name: (d.storeNameAr as string) || (d.storeName as string) || (d.name as string) || '',
    username: (d.username as string) || '',
    entityType: ((d.entityType || d.storeType) as StoreInfo['entityType']) || 'individual',
    city: (d.city as string) || (d.cityAr as string) || '',
    cityId: d.cityId != null ? String(d.cityId) : undefined,
    latitude: toNum(d.latitude ?? d.lat),
    longitude: toNum(d.longitude ?? d.lng),
    isOpen: (d.isOpen as boolean) !== false,
    deliveryEnabled: (d.deliveryEnabled as boolean) !== false,
    pickupEnabled: (d.pickupEnabled as boolean) !== false,
    description: (d.descriptionAr as string) || (d.description as string) || (d.bio as string) || '',
    phone: (d.phone as string) || (d.mobile as string) || '',
    email: (d.email as string) || '',
    balance: toNum(d.balance) ?? 0,
    storeImage: (d.storeImage as string) || (d.logo as string) || '',
    bannerImage: (d.banner as string) || (d.bannerUrl as string) || '',
    website: (d.website as string) || (d.socialLinks as any)?.website || '',
    bankName: (d.bankName as string) || '',
    iban: (d.iban as string) || '',
    beneficiaryName: (d.beneficiaryName as string) || (d.accountHolderName as string) || '',
    nationalIdUri: (d.nationalIdUrl as string) || (d.nationalIdImage as string) || '',
    freelanceDocUri: (d.freelanceDocUrl as string) || (d.freelanceCertificateImage as string) || '',
    freelanceDocNumber: (d.freelanceDocNumber as string) || (d.registrationNumber as string) || '',
    commercialRegNumber: (d.commercialRegNumber as string) || (d.registrationNumber as string) || '',
    commercialRegUri: (d.commercialRegUrl as string) || (d.commercialRegistrationDoc as string) || '',
  };
}

export async function updateMerchantInFirestore(
  merchantId: string,
  data: Partial<StoreInfo>,
  currentUser?: { name?: string; email?: string; phone?: string }
): Promise<void> {
  const db = await getDb();
  if (!db || !merchantId) return;

  const { doc, updateDoc, setDoc, serverTimestamp, deleteField } = await import('firebase/firestore');

  let storeImageUrl = data.storeImage;
  let bannerImageUrl = data.bannerImage;

  if (storeImageUrl && !storeImageUrl.startsWith('http')) {
    storeImageUrl = await uploadImageToStorage(storeImageUrl, 'stores');
  }
  if (bannerImageUrl && !bannerImageUrl.startsWith('http')) {
    bannerImageUrl = await uploadImageToStorage(bannerImageUrl, 'stores');
  }

  let nationalIdUrl: string | undefined;
  let freelanceDocUrl: string | undefined;
  let commercialRegUrl: string | undefined;

  if (data.nationalIdUri) {
    nationalIdUrl = data.nationalIdUri.startsWith('http')
      ? data.nationalIdUri
      : await uploadImageToStorage(data.nationalIdUri, 'documents');
  }
  if (data.freelanceDocUri) {
    freelanceDocUrl = data.freelanceDocUri.startsWith('http')
      ? data.freelanceDocUri
      : await uploadImageToStorage(data.freelanceDocUri, 'documents');
  }
  if (data.commercialRegUri) {
    commercialRegUrl = data.commercialRegUri.startsWith('http')
      ? data.commercialRegUri
      : await uploadImageToStorage(data.commercialRegUri, 'documents');
  }

  const registrationNumber =
    data.entityType === 'individual'
      ? (data.freelanceDocNumber || undefined)
      : (data.commercialRegNumber || undefined);

  const socialLinks: Record<string, string> = {};
  if (data.website) socialLinks.website = data.website;

  const firestoreData = removeUndefined({
    storeNameAr: data.name,
    storeName: data.name,
    username: data.username,
    entityType: data.entityType,
    storeType: data.entityType,
    city: data.city,
    cityAr: data.city,
    cityId: data.cityId,
    latitude: data.latitude,
    longitude: data.longitude,
    formattedAddress: data.locationAddress,
    formattedAddressAr: data.locationAddress,
    storeAddress: data.locationAddress,
    locationAddress: data.locationAddress,
    isOpen: data.isOpen,
    description: data.description,
    bio: data.description,
    phone: data.phone,
    mobile: data.phone,
    email: data.email,
    storeImage: storeImageUrl,
    banner: bannerImageUrl,
    website: data.website,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    bankName: data.bankName,
    iban: data.iban,
    beneficiaryName: data.beneficiaryName,
    accountHolderName: data.beneficiaryName,
    nationalIdImage: nationalIdUrl,
    nationalIdUrl: nationalIdUrl,
    freelanceCertificateImage: freelanceDocUrl,
    freelanceDocUrl: freelanceDocUrl,
    freelanceDocNumber: data.freelanceDocNumber,
    commercialRegistrationDoc: commercialRegUrl,
    commercialRegUrl: commercialRegUrl,
    commercialRegNumber: data.commercialRegNumber,
    registrationNumber,
    updatedAt: serverTimestamp(),
  });

  if ('website' in data && data.website === '') {
    firestoreData.website = deleteField();
    (firestoreData as Record<string, unknown>)['socialLinks.website'] = deleteField();
  }

  await updateDoc(doc(db, 'merchants', merchantId), firestoreData);

  const userData = removeUndefined({
    role: 'merchant',
    email: data.email || currentUser?.email,
    name: currentUser?.name,
    storeName: data.name,
    merchantId,
  });
  if (Object.keys(userData).length > 1) {
    await setDoc(doc(db, 'users', merchantId), {
      ...userData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

/** persist the last chosen role to Firestore */
export async function updateUserLastRole(uid: string, role: string): Promise<void> {
  const db = await getDb();
  if (!db || !uid) return;
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), {
    lastRole: role,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function toggleMerchantOpen(
  merchantId: string,
  isOpen: boolean
): Promise<void> {
  const db = await getDb();
  if (!db || !merchantId) return;
  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  await updateDoc(doc(db, 'merchants', merchantId), {
    isOpen,
    updatedAt: serverTimestamp(),
  });
}

/** تفعيل/إيقاف التوصيل والاستلام من الفرع (يظهر للعملاء في السلة) */
export async function updateMerchantFulfillmentFlags(
  merchantId: string,
  flags: { deliveryEnabled?: boolean; pickupEnabled?: boolean }
): Promise<void> {
  const db = await getDb();
  if (!db || !merchantId) return;
  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  await updateDoc(doc(db, 'merchants', merchantId), {
    ...flags,
    updatedAt: serverTimestamp(),
  });
}

// ========== PRODUCTS ==========

export async function addProductToFirestore(
  product: Product,
  merchantId: string
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

  let imageUrls: string[] = [];
  if (product.images && product.images.length > 0) {
    imageUrls = await Promise.all(
      product.images.map(async (img) => {
        if (img && !img.startsWith('http')) {
          return await uploadImageToStorage(img, 'products');
        }
        return img;
      })
    );
  }

  const productData = removeUndefined({
    merchantId,
    name: product.name,
    nameAr: product.name,
    nameEn: product.nameEn || product.name,
    description: product.description || '',
    descriptionAr: product.description || '',
    price: product.price,
    originalPrice: product.originalPrice,
    stock: product.stock ?? 99,
    category: product.category,
    categoryId: product.category,
    images: imageUrls.length > 0 ? imageUrls : (product.image ? [product.image] : []),
    status: 'active',
    isHidden: product.isHidden ?? false,
    inStock: product.inStock !== false,
    allowsGiftCard: product.hasGiftCard ?? false,
    giftCardFee: product.giftCardFee,
    tags: product.tags || [],
    promoBadge: product.badge || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(db, 'products'), productData);
  return docRef.id;
}

export async function updateProductInFirestore(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  const db = await getDb();
  if (!db || !productId) return;

  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

  let imageUrls = updates.images;
  if (imageUrls && imageUrls.length > 0) {
    imageUrls = await Promise.all(
      imageUrls.map(async (img) => {
        if (img && !img.startsWith('http')) {
          return await uploadImageToStorage(img, 'products');
        }
        return img;
      })
    );
  }

  const firestoreUpdates = removeUndefined({
    name: updates.name,
    nameAr: updates.name,
    nameEn: updates.nameEn,
    description: updates.description,
    descriptionAr: updates.description,
    price: updates.price,
    originalPrice: updates.originalPrice,
    stock: updates.stock,
    category: updates.category,
    categoryId: updates.category,
    images: imageUrls,
    isHidden: updates.isHidden,
    inStock: updates.inStock,
    status: updates.isHidden === true ? 'hidden' : (updates.isHidden === false ? 'active' : undefined),
    allowsGiftCard: updates.hasGiftCard,
    giftCardFee: updates.giftCardFee,
    tags: updates.tags,
    promoBadge: updates.badge,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'products', productId), firestoreUpdates);
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const db = await getDb();
  if (!db || !productId) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'products', productId));
}

export async function getMerchantProducts(merchantId: string): Promise<Product[]> {
  const db = await getDb();
  if (!db || !merchantId) return [];

  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
  const q = query(
    collection(db, 'products'),
    where('merchantId', '==', merchantId),
    orderBy('createdAt', 'desc')
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const images = Array.isArray(data.images) ? (data.images as string[]) : [];
      const image = images[0] || (data.image as string) || '';
      return {
        id: d.id,
        name: (data.nameAr as string) || (data.name as string) || '',
        nameEn: (data.nameEn as string) || (data.name as string) || '',
        description: (data.descriptionAr as string) || (data.description as string) || '',
        price: typeof data.price === 'number' ? data.price : 0,
        originalPrice: typeof data.originalPrice === 'number' ? data.originalPrice : undefined,
        image,
        images: images.length > 0 ? images : (image ? [image] : []),
        category: (data.category as string) || '',
        categoryEn: (data.categoryEn as string) || (data.category as string) || '',
        rating: typeof data.rating === 'number' ? data.rating : 0,
        reviewCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
        shopName: '',
        shopImage: '',
        isFavorite: false,
        inStock: (data.inStock as boolean) !== false,
        stock: typeof data.stock === 'number' ? data.stock : 99,
        isHidden: (data.isHidden as boolean) === true || data.status === 'hidden',
        tags: (data.tags as string[]) || [],
        badge: (data.promoBadge as string) || undefined,
        storeId: merchantId,
        hasGiftCard: (data.allowsGiftCard as boolean) === true,
        giftCardFee: typeof data.giftCardFee === 'number' ? data.giftCardFee : undefined,
      } as Product;
    });
  } catch {
    const qFallback = query(
      collection(db, 'products'),
      where('merchantId', '==', merchantId)
    );
    const snap = await getDocs(qFallback);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const images = Array.isArray(data.images) ? (data.images as string[]) : [];
      const image = images[0] || (data.image as string) || '';
      return {
        id: d.id,
        name: (data.nameAr as string) || (data.name as string) || '',
        nameEn: (data.nameEn as string) || (data.name as string) || '',
        description: (data.descriptionAr as string) || (data.description as string) || '',
        price: typeof data.price === 'number' ? data.price : 0,
        originalPrice: typeof data.originalPrice === 'number' ? data.originalPrice : undefined,
        image,
        images: images.length > 0 ? images : (image ? [image] : []),
        category: (data.category as string) || '',
        categoryEn: (data.categoryEn as string) || (data.category as string) || '',
        rating: 0,
        reviewCount: 0,
        shopName: '',
        shopImage: '',
        isFavorite: false,
        inStock: (data.inStock as boolean) !== false,
        stock: typeof data.stock === 'number' ? data.stock : 99,
        isHidden: (data.isHidden as boolean) === true || data.status === 'hidden',
        tags: (data.tags as string[]) || [],
        storeId: merchantId,
        hasGiftCard: (data.allowsGiftCard as boolean) === true,
        giftCardFee: typeof data.giftCardFee === 'number' ? data.giftCardFee : undefined,
      } as Product;
    });
  }
}

// ========== ORDERS ==========

export async function getMerchantOrders(merchantId: string): Promise<Order[]> {
  const db = await getDb();
  if (!db || !merchantId) return [];

  const { collection, query, where, getDocs, orderBy, doc, getDoc } = await import('firebase/firestore');

  let snap;
  try {
    const q = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );
    snap = await getDocs(q);
  } catch {
    const q = query(
      collection(db, 'orders'),
      where('merchantId', '==', merchantId)
    );
    snap = await getDocs(q);
  }

  const orders: Order[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;

    let customerName = (data.customerName as string) || '';
    let customerPhone = (data.customerPhone as string) || '';
    let customerEmail = '';
    if (data.customerId) {
      try {
        const custSnap = await getDoc(doc(db, 'customers', data.customerId as string));
        if (custSnap.exists()) {
          const cust = custSnap.data() as Record<string, unknown>;
          customerName = customerName || (cust.name as string) || '';
          customerPhone = customerPhone || (cust.mobile as string) || (cust.phone as string) || '';
          customerEmail = (cust.email as string) || '';
        }
      } catch { /* ignore */ }
    }

    let productName = '';
    let productImage = '';
    const items: Order['items'] = [];

    if (data.productId) {
      try {
        const prodSnap = await getDoc(doc(db, 'products', data.productId as string));
        if (prodSnap.exists()) {
          const prod = prodSnap.data() as Record<string, unknown>;
          productName = (prod.nameAr as string) || (prod.name as string) || '';
          const prodImages = Array.isArray(prod.images) ? prod.images : [];
          productImage = (prodImages[0] as string) || (prod.image as string) || '';
        }
      } catch { /* ignore */ }
      items.push({
        id: data.productId as string,
        name: productName,
        quantity: (data.quantity as number) || 1,
        price: (data.totalAmount as number) || 0,
        image: productImage,
      });
    }

    const createdAt = data.createdAt as { seconds?: number } | undefined;
    const date = createdAt?.seconds
      ? new Date(createdAt.seconds * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    orders.push({
      id: d.id,
      orderNumber: (data.orderNumber as string) || d.id.slice(0, 8),
      customerName,
      customerPhone,
      customerEmail,
      productName,
      productImage,
      items,
      total: (data.totalAmount as number) || 0,
      quantity: (data.quantity as number) || 1,
      status: ((data.status as string) || 'pending') as Order['status'],
      date,
      address: (data.deliveryAddress as string) || '',
      notes: (data.customerNote as string) || undefined,
      isPaid: (data.isPaid as boolean) === true || data.paymentStatus === 'paid',
      storeName: '',
      storeId: merchantId,
      merchantId,
      customerId: (data.customerId as string) || undefined,
      recipientName: (data.recipientName as string) || undefined,
      recipientPhone: (data.recipientPhone as string) || undefined,
      deliveryMethod: (data.deliveryMethod as 'branch' | 'delivery') || 'delivery',
      paymentMethod: (data.paymentMethod as Order['paymentMethod']) || undefined,
      giftCard: data.giftCard as Order['giftCard'],
      giftCardFee: typeof data.giftCardFee === 'number' ? data.giftCardFee : undefined,
      deliveryDate: (data.deliveryDate as string) || undefined,
      deliveryTimeSlot: (data.deliveryTime as string) || undefined,
      deliveryOptionName: (data.deliveryOptionName as string) || undefined,
      city: (data.recipientCity as string) || undefined,
      region: (data.recipientRegion as string) || (data.region as string) || undefined,
      branchName: (data.branchName as string) || undefined,
      branchLocation: (data.branchLocation as string) || undefined,
      addressCoords: (data.addressCoords as Order['addressCoords']) || 
                    (data.latitude && data.longitude ? { latitude: Number(data.latitude), longitude: Number(data.longitude) } : undefined),
    });
  }

  return orders;
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  newStatus: string,
  merchantId?: string
): Promise<void> {
  const db = await getDb();
  if (!db || !orderId) return;

  const { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection, increment } = await import('firebase/firestore');
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);

  if (orderSnap.exists()) {
    const orderData = orderSnap.data() as Record<string, unknown>;

    // Match panelglorda: credit the merchant only when the order becomes completed.
    if (newStatus === 'completed' && orderData.status !== 'completed') {
      const resolvedMerchantId = String(orderData.merchantId || merchantId || '');
      const amount = typeof orderData.totalAmount === 'number'
        ? orderData.totalAmount
        : Number(orderData.totalAmount || 0);

      if (resolvedMerchantId && amount > 0) {
        await addDoc(collection(db, 'transactions'), {
          merchantId: resolvedMerchantId,
          amount,
          type: 'credit',
          description: `إيداع ربح الطلب #${(orderData.orderNumber as string) || orderId}`,
          status: 'completed',
          createdAt: serverTimestamp(),
          orderId,
        });

        await updateDoc(doc(db, 'merchants', resolvedMerchantId), {
          balance: increment(amount),
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

// ========== WALLET / TRANSACTIONS ==========

export async function getMerchantTransactions(merchantId: string): Promise<WalletTransaction[]> {
  const db = await getDb();
  if (!db || !merchantId) return [];

  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');

  let snap;
  try {
    const q = query(
      collection(db, 'transactions'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );
    snap = await getDocs(q);
  } catch {
    const q = query(
      collection(db, 'transactions'),
      where('merchantId', '==', merchantId)
    );
    snap = await getDocs(q);
  }

  return snap.docs
    .map((d) => {
    const data = d.data() as Record<string, unknown>;
    const createdAt = data.createdAt as { seconds?: number } | undefined;
    const rawAmount = typeof data.amount === 'number' ? data.amount : Number(data.amount || 0);
    const rawType = (data.type as string) || 'credit';
    const normalizedType =
      rawType === 'debit' ? 'withdrawal' : (rawType as WalletTransaction['type']);
    const rawStatus = (data.status as string) || 'completed';
    const normalizedStatus =
      rawStatus === 'rejected' ? 'failed' : (rawStatus as WalletTransaction['status']);
    const createdAtMs = createdAt?.seconds
      ? createdAt.seconds * 1000
      : Date.now();

    return {
      id: d.id,
      type: normalizedType,
      amount: normalizedType === 'credit' ? rawAmount : Math.abs(rawAmount),
      description: (data.description as string) || '',
      date: createdAt?.seconds
        ? new Date(createdAt.seconds * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      createdAtMs,
      status: normalizedStatus,
    };
  })
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

export async function requestWithdrawalInFirestore(
  merchantId: string,
  amount: number,
  bankInfo?: { bankName?: string; iban?: string; beneficiaryName?: string }
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const { collection, addDoc, serverTimestamp, doc, getDoc } = await import('firebase/firestore');

  const merchantRef = doc(db, 'merchants', merchantId);
  const merchantSnap = await getDoc(merchantRef);
  if (!merchantSnap.exists()) {
    throw new Error('Merchant not found');
  }

  const currentBalance = Number(merchantSnap.data()?.balance || 0);
  if (currentBalance < amount) {
    throw new Error('رصيد المحفظة غير كافي');
  }

  const docRef = await addDoc(collection(db, 'withdrawals'), removeUndefined({
    merchantId,
    amount,
    status: 'pending',
    bankName: bankInfo?.bankName,
    iban: bankInfo?.iban,
    beneficiaryName: bankInfo?.beneficiaryName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  await addDoc(collection(db, 'transactions'), removeUndefined({
    merchantId,
    type: 'withdrawal',
    amount: -amount,
    description: `طلب سحب رصيد #${docRef.id.slice(0, 8)}`,
    status: 'pending',
    withdrawalId: docRef.id,
    createdAt: serverTimestamp(),
  }));

  return docRef.id;
}

// ========== CUSTOMER ORDERS (load from Firestore) ==========

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  const db = await getDb();
  if (!db || !customerId) return [];

  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');

  let snap;
  try {
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    snap = await getDocs(q);
  } catch {
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId)
    );
    snap = await getDocs(q);
  }

  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const createdAt = data.createdAt as { seconds?: number } | undefined;
    const date = createdAt?.seconds
      ? new Date(createdAt.seconds * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const items: Order['items'] = [];
    if (Array.isArray(data.items)) {
      (data.items as Array<Record<string, unknown>>).forEach((item) => {
        items.push({
          id: (item.productId as string) || '',
          name: (item.name as string) || '',
          quantity: (item.quantity as number) || 1,
          price: (item.price as number) || 0,
          image: (item.image as string) || undefined,
        });
      });
    }

    return {
      id: d.id,
      orderNumber: (data.orderNumber as string) || d.id.slice(0, 8),
      customerName: (data.customerName as string) || '',
      customerPhone: (data.customerPhone as string) || '',
      customerEmail: (data.customerEmail as string) || '',
      productName: items.map((i) => i.name).join(', '),
      productImage: items[0]?.image || '',
      items,
      total: (data.totalAmount as number) || 0,
      quantity: (data.quantity as number) || 1,
      status: ((data.status as string) || 'pending') as Order['status'],
      date,
      address: (data.deliveryAddress as string) || '',
      notes: (data.customerNote as string) || undefined,
      isPaid: (data.isPaid as boolean) === true,
      storeName: '',
      storeId: (data.merchantId as string) || (data.storeId as string) || '',
      merchantId: (data.merchantId as string) || (data.storeId as string) || '',
      customerId,
      recipientName: (data.recipientName as string) || undefined,
      recipientPhone: (data.recipientPhone as string) || undefined,
      deliveryMethod: (data.deliveryMethod as 'branch' | 'delivery') || 'delivery',
      paymentMethod: (data.paymentMethod as Order['paymentMethod']) || undefined,
      giftCard: data.giftCard as Order['giftCard'],
      giftCardFee: typeof data.giftCardFee === 'number' ? data.giftCardFee : undefined,
      deliveryDate: (data.deliveryDate as string) || undefined,
      deliveryTimeSlot: (data.deliveryTime as string) || undefined,
      deliveryOptionName: (data.deliveryOptionName as string) || undefined,
      city: (data.recipientCity as string) || undefined,
      region: (data.recipientRegion as string) || (data.region as string) || undefined,
      branchName: (data.branchName as string) || undefined,
      branchLocation: (data.branchLocation as string) || undefined,
      addressCoords: (data.addressCoords as Order['addressCoords']) || 
                    (data.latitude && data.longitude ? { latitude: Number(data.latitude), longitude: Number(data.longitude) } : undefined),
    };
  });
}

// ========== PLACE ORDER (Customer side) ==========

export async function placeOrderInFirestore(orderData: {
  orderNumber: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productId?: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
    selectedOptions?: Record<string, string>;
  }>;
  totalAmount: number;
  quantity: number;
  status: string;
  deliveryAddress: string;
  deliveryMethod: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryOptionName?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientCity?: string;
  recipientRegion?: string;
  addressCoords?: { latitude: number; longitude: number };
  branchName?: string;
  branchLocation?: string;
  customerNote?: string;
  paymentMethod?: string;
  isPaid: boolean;
  giftCard?: { fromName: string; toName: string; message: string; hideSenderIdentity: boolean };
  giftCardFee?: number;
  paymentStatus?: string;
  tapChargeId?: string;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

  const docRef = await addDoc(collection(db, 'orders'), removeUndefined({
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  return docRef.id;
}

// ========== HELPER: Get current merchant ID ==========

export async function getCurrentMerchantId(fallbackUserId?: string): Promise<string | null> {
  const auth = await getAuth();
  return auth?.currentUser?.uid || fallbackUserId || null;
}

/**
 * حفظ توكن إشعارات Expo Push في Firestore لاستخدامه من Cloud Functions (مثل panelglorda/functions).
 * يُحدّث users/{uid} و merchants/{uid} للتاجر حتى تصل الدوال لنفس التوكن من أي مسار.
 */
export async function saveExpoPushToken(
  uid: string,
  token: string,
  role: 'customer' | 'merchant',
  platform: 'ios' | 'android' | 'web' | 'unknown'
): Promise<void> {
  const db = await getDb();
  if (!db || !uid || !token) return;

  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const payload = removeUndefined({
    expoPushToken: token,
    expoPushTokenUpdatedAt: serverTimestamp(),
    pushNotificationPlatform: platform,
    lastPushAppRole: role,
  });

  await setDoc(doc(db, 'users', uid), payload, { merge: true });

  if (role === 'merchant') {
    await setDoc(
      doc(db, 'merchants', uid),
      removeUndefined({
        expoPushToken: token,
        expoPushTokenUpdatedAt: serverTimestamp(),
        pushNotificationPlatform: platform,
      }),
      { merge: true }
    );
  }
}

// ========== REVIEWS ==========

export interface FirestoreReview {
  id: string;
  customerName: string;
  customerAvatar: string;
  rating: number;
  comment: string;
  date: string;
  productName: string;
  helpful: number;
  reply?: string;
  productId?: string;
  orderId?: string;
}

export async function getMerchantReviews(merchantId: string): Promise<FirestoreReview[]> {
  const db = await getDb();
  if (!db || !merchantId) return [];

  const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
  try {
    const q = query(
      collection(db, 'reviews'),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        customerName: (data.customerName as string) || (data.name as string) || '',
        customerAvatar: (data.customerAvatar as string) || (data.avatar as string) || '',
        rating: typeof data.rating === 'number' ? data.rating : 5,
        comment: (data.comment as string) || (data.text as string) || '',
        date: data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
        productName: (data.productName as string) || '',
        helpful: typeof data.helpful === 'number' ? data.helpful : 0,
        reply: (data.reply as string) || undefined,
        productId: (data.productId as string) || undefined,
        orderId: (data.orderId as string) || undefined,
      };
    });
  } catch (e) {
    console.warn('[getMerchantReviews] error:', e);
    return [];
  }
}

export async function replyToReview(reviewId: string, replyText: string): Promise<void> {
  const db = await getDb();
  if (!db || !reviewId) return;

  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  await updateDoc(doc(db, 'reviews', reviewId), {
    reply: replyText,
    repliedAt: serverTimestamp(),
  });
}

export async function reviewExistsForOrderProduct(
  customerId: string,
  orderId: string,
  productId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db || !customerId || !orderId || !productId) return false;
  const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
  const dedupeKey = `${customerId}_${orderId}_${productId}`;
  try {
    const q = query(collection(db, 'reviews'), where('dedupeKey', '==', dedupeKey), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    console.warn('[reviewExistsForOrderProduct]', e);
    return false;
  }
}

export async function getProductReviewsFromFirestore(productId: string): Promise<FirestoreReview[]> {
  const db = await getDb();
  if (!db || !productId) return [];
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        customerName: (data.customerName as string) || (data.name as string) || '',
        customerAvatar: (data.customerAvatar as string) || (data.avatar as string) || '',
        rating: typeof data.rating === 'number' ? data.rating : 5,
        comment: (data.comment as string) || (data.text as string) || '',
        date: data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
        productName: (data.productName as string) || '',
        helpful: typeof data.helpful === 'number' ? data.helpful : 0,
        reply: (data.reply as string) || undefined,
        productId: (data.productId as string) || productId,
        orderId: (data.orderId as string) || undefined,
      } as FirestoreReview;
    });
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    return list;
  } catch (e) {
    console.warn('[getProductReviewsFromFirestore]', e);
    return [];
  }
}

export async function submitProductReviewToFirestore(params: {
  merchantId: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  orderId: string;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const exists = await reviewExistsForOrderProduct(
    params.customerId,
    params.orderId,
    params.productId
  );
  if (exists) throw new Error('already_reviewed');

  const { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
  const rating = Math.min(5, Math.max(1, Math.round(params.rating)));
  const dedupeKey = `${params.customerId}_${params.orderId}_${params.productId}`;

  const reviewPayload = removeUndefined({
    merchantId: params.merchantId,
    productId: params.productId,
    productName: params.productName,
    customerId: params.customerId,
    customerName: params.customerName,
    customerAvatar: params.customerAvatar || '',
    rating,
    comment: (params.comment || '').trim(),
    orderId: params.orderId,
    dedupeKey,
    helpful: 0,
    createdAt: serverTimestamp(),
  });

  const ref = await addDoc(collection(db, 'reviews'), reviewPayload);

  try {
    const pRef = doc(db, 'products', params.productId);
    const pSnap = await getDoc(pRef);
    if (pSnap.exists()) {
      const d = pSnap.data() as Record<string, unknown>;
      const oldCount = typeof d.reviewsCount === 'number' ? d.reviewsCount : 0;
      const oldRating = typeof d.rating === 'number' ? d.rating : 0;
      const n = oldCount + 1;
      const newRating = oldCount <= 0 ? rating : (oldRating * oldCount + rating) / n;
      await updateDoc(pRef, {
        rating: newRating,
        reviewsCount: n,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn('[submitProductReviewToFirestore] product aggregate:', e);
  }

  try {
    const mRef = doc(db, 'merchants', params.merchantId);
    const mSnap = await getDoc(mRef);
    if (mSnap.exists()) {
      const d = mSnap.data() as Record<string, unknown>;
      const oldCount = typeof d.reviewsCount === 'number' ? d.reviewsCount : 0;
      const oldRating = typeof d.rating === 'number' ? d.rating : 0;
      const n = oldCount + 1;
      const newRating = oldCount <= 0 ? rating : (oldRating * oldCount + rating) / n;
      await updateDoc(mRef, {
        rating: newRating,
        reviewsCount: n,
      });
    }
  } catch (e) {
    console.warn('[submitProductReviewToFirestore] merchant aggregate:', e);
  }

  return ref.id;
}

// ========== DELIVERY OPTIONS & BRANCHES ==========

function normalizeDeliveryPeriods(raw: unknown): import('@/types').DeliveryPeriod[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      return {
        from: String(o.from ?? ''),
        to: String(o.to ?? ''),
        ...(typeof o.name === 'string' && o.name.trim() ? { name: o.name.trim() } : {}),
      };
    }
    return { from: '', to: '' };
  });
}

export async function getMerchantDeliveryOptions(merchantId: string): Promise<import('@/types').DeliveryOption[]> {
  const db = await getDb();
  if (!db || !merchantId) return [];

  const { collection, query, where, getDocs } = await import('firebase/firestore');
  try {
    const q = query(collection(db, 'deliveryOptions'), where('merchantId', '==', merchantId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) || '',
        nameEn: (data.nameEn as string) || '',
        price: typeof data.price === 'number' ? data.price : 0,
        range: typeof data.range === 'number' ? data.range : 25,
        workDays: Array.isArray(data.workDays) ? data.workDays : [],
        periods: normalizeDeliveryPeriods(data.periods),
        isActive: data.isActive !== false,
        city: (data.city as string) || '',
      };
    });
  } catch {
    return [];
  }
}

export async function getMerchantBranches(merchantId: string): Promise<import('@/types').Branch[]> {
  const db = await getDb();
  if (!db || !merchantId) return [];

  const { collection, query, where, getDocs } = await import('firebase/firestore');
  try {
    const q = query(collection(db, 'branches'), where('merchantId', '==', merchantId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) || '',
        nameEn: (data.nameEn as string) || '',
        address: (data.address as string) || '',
        city: (data.city as string) || '',
        latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
        longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
        googleMapsLink: (data.googleMapsLink as string) || '',
        workDays: (data.workDays as string) || '',
        workHours: (data.workHours as string) || '',
        isActive: data.isActive !== false,
      };
    });
  } catch {
    return [];
  }
}

export async function saveDeliveryOption(merchantId: string, option: import('@/types').DeliveryOption): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const periodsForStore = (option.periods || []).map((p) =>
    removeUndefined({
      from: (p.from || '').trim(),
      to: (p.to || '').trim(),
    })
  );
  const { id: _omitId, ...rest } = option;
  const docRef = await addDoc(
    collection(db, 'deliveryOptions'),
    removeUndefined({
      ...rest,
      periods: periodsForStore,
      merchantId,
      createdAt: serverTimestamp(),
    })
  );
  return docRef.id;
}

export async function saveBranch(merchantId: string, branch: import('@/types').Branch): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const { id: _omitId, ...rest } = branch;
  const docRef = await addDoc(
    collection(db, 'branches'),
    removeUndefined({
      ...rest,
      merchantId,
      createdAt: serverTimestamp(),
    }) as Record<string, unknown>
  );
  return docRef.id;
}

export async function updateDeliveryOption(
  optionId: string,
  merchantId: string,
  option: import('@/types').DeliveryOption
): Promise<void> {
  const db = await getDb();
  if (!db || !optionId) throw new Error('Firestore not initialized');

  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  const periodsForStore = (option.periods || []).map((p) =>
    removeUndefined({
      from: (p.from || '').trim(),
      to: (p.to || '').trim(),
    })
  );
  await updateDoc(
    doc(db, 'deliveryOptions', optionId),
    removeUndefined({
      name: option.name,
      nameEn: option.nameEn,
      price: option.price,
      range: option.range,
      workDays: option.workDays,
      periods: periodsForStore,
      city: option.city,
      isActive: option.isActive,
      merchantId,
      updatedAt: serverTimestamp(),
    }) as Record<string, unknown>
  );
}

export async function updateBranch(
  branchId: string,
  merchantId: string,
  branch: import('@/types').Branch
): Promise<void> {
  const db = await getDb();
  if (!db || !branchId) throw new Error('Firestore not initialized');

  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  const { id: _omit, ...rest } = branch;
  await updateDoc(
    doc(db, 'branches', branchId),
    removeUndefined({
      ...rest,
      merchantId,
      updatedAt: serverTimestamp(),
    }) as Record<string, unknown>
  );
}

export async function deleteDeliveryOption(optionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'deliveryOptions', optionId));
}

export async function deleteBranch(branchId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'branches', branchId));
}
