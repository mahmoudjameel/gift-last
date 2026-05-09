import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

const mapDocs = <T = DocumentData>(snap: any): T[] =>
  snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];

export async function getBanners() {
  const snap = await getDocs(collection(db, "banners"));
  return mapDocs<Banners>(snap);
}

export async function addBanner(data: Partial<Banners>) {
  const ref = await addDoc(collection(db, "banners"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBanner(id: string, data: Partial<Banners>) {
  await updateDoc(doc(db, "banners", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBanner(id: string) {
  await deleteDoc(doc(db, "banners", id));
}

export async function getCategories() {
  const snap = await getDocs(collection(db, "categories"));
  return mapDocs<Categories>(snap);
}

export async function addCategory(data: Partial<Categories>) {
  const ref = await addDoc(collection(db, "categories"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id: string, data: Partial<Categories>) {
  await updateDoc(doc(db, "categories", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}

export async function getCities() {
  const snap = await getDocs(collection(db, "cities"));
  return mapDocs<Cities>(snap);
}

export async function addCity(data: Partial<Cities>) {
  const ref = await addDoc(collection(db, "cities"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCity(id: string, data: Partial<Cities>) {
  await updateDoc(doc(db, "cities", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCity(id: string) {
  await deleteDoc(doc(db, "cities", id));
}

export async function getDiscountCodes() {
  const snap = await getDocs(collection(db, "discountCodes"));
  return mapDocs<DiscountCodes>(snap);
}

export async function addDiscountCode(data: Partial<DiscountCodes>) {
  const ref = await addDoc(collection(db, "discountCodes"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    usedCount: 0,
  });
  return ref.id;
}

export async function updateDiscountCode(id: string, data: Partial<DiscountCodes>) {
  await updateDoc(doc(db, "discountCodes", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDiscountCode(id: string) {
  await deleteDoc(doc(db, "discountCodes", id));
}

// Local types for admin settings
export interface Banners {
  id: string;
  title: string;
  image: string;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
}

export interface Categories {
  id: string;
  name: string;
  nameEn?: string | null;
  icon?: string | null;
  image?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
}

export interface Cities {
  id: string;
  name: string;
  nameEn?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
}

export interface DiscountCodes {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  usedCount?: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt?: any;
}

// Promotional ads (إعلانات ترويجية) — عنوان ونص وترتيب، تُرسل كبوش نوتيفيكيشن
export interface PromotionalAd {
  id: string;
  title: string;
  body: string;
  order: number;
  isActive: boolean;
  sentAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export async function getPromotionalAds(): Promise<PromotionalAd[]> {
  const snap = await getDocs(collection(db, "promotionalAds"));
  const ads = mapDocs<PromotionalAd>(snap);
  return ads.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function addPromotionalAd(data: Partial<PromotionalAd>) {
  const ref = await addDoc(collection(db, "promotionalAds"), {
    title: data.title ?? "",
    body: data.body ?? "",
    order: data.order ?? 0,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePromotionalAd(id: string, data: Partial<PromotionalAd>) {
  const { sentAt, ...rest } = data as PromotionalAd & { sentAt?: any };
  await updateDoc(doc(db, "promotionalAds", id), {
    ...rest,
    ...(sentAt !== undefined && { sentAt }),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePromotionalAd(id: string) {
  await deleteDoc(doc(db, "promotionalAds", id));
}

// Seed realistic demo catalog data for Petalia
export async function seedPetaliaDemoData() {
  const now = serverTimestamp();
  const batch = writeBatch(db);

  const categories = [
    {
      docId: "cat_flowers",
      id: "flowers",
      name: "زهور",
      nameAr: "زهور",
      nameEn: "פרחים",
      icon: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
      image: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
      color: "#E88AAE",
      sortOrder: 1,
    },
    {
      docId: "cat_cosmetics",
      id: "cosmetics",
      name: "كوزمتكس",
      nameAr: "كوزمتكس",
      nameEn: "קוסמטיקה",
      icon: "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg",
      image: "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg",
      color: "#D4709A",
      sortOrder: 2,
    },
    {
      docId: "cat_cakes",
      id: "cakes",
      name: "كيك",
      nameAr: "كيك",
      nameEn: "עוגות",
      icon: "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
      image: "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
      color: "#A8C3A0",
      sortOrder: 3,
    },
    {
      docId: "cat_perfumes",
      id: "perfumes",
      name: "عطور",
      nameAr: "عطور",
      nameEn: "בשמים",
      icon: "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg",
      image: "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg",
      color: "#B8909A",
      sortOrder: 4,
    },
  ];

  const merchants = [
    {
      docId: "m_petalia_roses",
      id: "m_petalia_roses",
      username: "petalia_roses",
      ownerName: "سارة الحربي",
      storeName: "بيتاليا روزز",
      storeNameAr: "بيتاليا روزز",
      storeNameEn: "פטליה רוזס",
      email: "roses@petalia.com",
      phone: "0500000001",
      city: "الناصرة",
      category: "flowers",
      status: "active",
      isOpen: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      rating: 4.8,
      reviewsCount: 132,
      balance: 0,
      storeImage: "https://images.pexels.com/photos/1070860/pexels-photo-1070860.jpeg",
      banner: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
      descriptionAr: "متجر متخصص بترتيبات الزهور الطبيعية وباقات المناسبات في الداخل الفلسطيني.",
      descriptionEn: "חנות לפרחים טבעיים וזרים לאירועים בחברה הערבית בפנים.",
    },
    {
      docId: "m_petalia_beauty",
      id: "m_petalia_beauty",
      username: "petalia_beauty",
      ownerName: "نورة اغبارية",
      storeName: "بيتاليا بيوتي",
      storeNameAr: "بيتاليا بيوتي",
      storeNameEn: "פטליה ביוטי",
      email: "beauty@petalia.com",
      phone: "0500000002",
      city: "أم الفحم",
      category: "cosmetics",
      status: "active",
      isOpen: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      rating: 4.7,
      reviewsCount: 94,
      balance: 0,
      storeImage: "https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg",
      banner: "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg",
      descriptionAr: "منتجات تجميل أصلية وعناية بالبشرة ملائمة لذوق المجتمع العربي المحلي.",
      descriptionEn: "מוצרי קוסמטיקה וטיפוח מקוריים המותאמים לקהל הערבי המקומי.",
    },
    {
      docId: "m_petalia_cakes",
      id: "m_petalia_cakes",
      username: "petalia_cakes",
      ownerName: "عبدالرحمن زعبي",
      storeName: "بيتاليا كيك",
      storeNameAr: "بيتاليا كيك",
      storeNameEn: "פטליה עוגות",
      email: "cakes@petalia.com",
      phone: "0500000003",
      city: "سخنين",
      category: "cakes",
      status: "active",
      isOpen: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      rating: 4.9,
      reviewsCount: 167,
      balance: 0,
      storeImage: "https://images.pexels.com/photos/3771110/pexels-photo-3771110.jpeg",
      banner: "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
      descriptionAr: "كيكات مناسبات يومية وأعياد بطابع عربي حديث ونكهات غنية.",
      descriptionEn: "עוגות טריות לימי הולדת ואירועים בסגנון ערבי מודרני.",
    },
    {
      docId: "m_petalia_perfumes",
      id: "m_petalia_perfumes",
      username: "petalia_perfumes",
      ownerName: "خالد جبارين",
      storeName: "بيتاليا للعطور",
      storeNameAr: "بيتاليا للعطور",
      storeNameEn: "פטליה בשמים",
      email: "perfumes@petalia.com",
      phone: "0500000004",
      city: "الطيبة",
      category: "perfumes",
      status: "active",
      isOpen: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      rating: 4.6,
      reviewsCount: 81,
      balance: 0,
      storeImage: "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg",
      banner: "https://images.pexels.com/photos/1961792/pexels-photo-1961792.jpeg",
      descriptionAr: "عطور شرقية وفرنسية أصلية مع تغليف هدايا أنيق للمناسبات المحلية.",
      descriptionEn: "בשמים מזרחיים וצרפתיים עם אריזות מתנה לאירועים מקומיים.",
    },
  ];

  const products = [
    {
      docId: "p_flower_rose_box",
      id: "p_flower_rose_box",
      merchantId: "m_petalia_roses",
      category: "flowers",
      categoryId: "flowers",
      name: "صندوق ورد جوري فاخر",
      nameAr: "صندوق ورد جوري فاخر",
      nameEn: "קופסת ורדים יוקרתית",
      description: "تنسيق فاخر من الورد الجوري مع تغليف أنيق مناسب للهدايا.",
      descriptionAr: "تنسيق فاخر من الورد الجوري مع تغليف أنيق مناسب للهدايا.",
      price: 249,
      originalPrice: 289,
      stock: 45,
      status: "active",
      rating: 4.8,
      reviewsCount: 52,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
        "https://images.pexels.com/photos/265856/pexels-photo-265856.jpeg",
      ],
    },
    {
      docId: "p_flower_tulip_mix",
      id: "p_flower_tulip_mix",
      merchantId: "m_petalia_roses",
      category: "flowers",
      categoryId: "flowers",
      name: "باقة توليب ملونة",
      nameAr: "باقة توليب ملونة",
      nameEn: "זר צבעונים צבעוני",
      description: "باقة توليب منعشة مناسبة للزيارات والمناسبات السعيدة.",
      descriptionAr: "باقة توليب منعشة مناسبة للزيارات والمناسبات السعيدة.",
      price: 179,
      stock: 60,
      status: "active",
      rating: 4.7,
      reviewsCount: 31,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/1070860/pexels-photo-1070860.jpeg",
      ],
    },
    {
      docId: "p_cosmetics_skin_set",
      id: "p_cosmetics_skin_set",
      merchantId: "m_petalia_beauty",
      category: "cosmetics",
      categoryId: "cosmetics",
      name: "طقم عناية بالبشرة يومي",
      nameAr: "طقم عناية بالبشرة يومي",
      nameEn: "ערכת טיפוח יומיומית",
      description: "مجموعة كاملة للتنظيف والترطيب تناسب الاستخدام اليومي.",
      descriptionAr: "مجموعة كاملة للتنظيف والترطيب تناسب الاستخدام اليومي.",
      price: 219,
      originalPrice: 260,
      stock: 38,
      status: "active",
      rating: 4.6,
      reviewsCount: 27,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg",
      ],
    },
    {
      docId: "p_cosmetics_lip_kit",
      id: "p_cosmetics_lip_kit",
      merchantId: "m_petalia_beauty",
      category: "cosmetics",
      categoryId: "cosmetics",
      name: "مجموعة أرواج كلاسيكية",
      nameAr: "مجموعة أرواج كلاسيكية",
      nameEn: "ערכת שפתונים קלאסית",
      description: "درجات متنوعة ثابتة مناسبة للإطلالات اليومية والمساء.",
      descriptionAr: "درجات متنوعة ثابتة مناسبة للإطلالات اليومية والمساء.",
      price: 149,
      stock: 52,
      status: "active",
      rating: 4.5,
      reviewsCount: 19,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg",
      ],
    },
    {
      docId: "p_cake_choco",
      id: "p_cake_choco",
      merchantId: "m_petalia_cakes",
      category: "cakes",
      categoryId: "cakes",
      name: "كيك شوكولاتة طبقات",
      nameAr: "كيك شوكولاتة طبقات",
      nameEn: "עוגת שוקולד שכבות",
      description: "كيك غني بالشوكولاتة الداكنة مناسب للحفلات العائلية.",
      descriptionAr: "كيك غني بالشوكولاتة الداكنة مناسب للحفلات العائلية.",
      price: 199,
      stock: 26,
      status: "active",
      rating: 4.9,
      reviewsCount: 64,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
      ],
    },
    {
      docId: "p_cake_red_velvet",
      id: "p_cake_red_velvet",
      merchantId: "m_petalia_cakes",
      category: "cakes",
      categoryId: "cakes",
      name: "ريد فلفت كيك",
      nameAr: "ريد فلفت كيك",
      nameEn: "עוגת רד ולווט",
      description: "كيكة ريد فلفت مع تغطية كريمية بتقديم فاخر.",
      descriptionAr: "كيكة ريد فلفت مع تغطية كريمية بتقديم فاخر.",
      price: 229,
      originalPrice: 259,
      stock: 22,
      status: "active",
      rating: 4.8,
      reviewsCount: 43,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/3771110/pexels-photo-3771110.jpeg",
      ],
    },
    {
      docId: "p_perfume_oud",
      id: "p_perfume_oud",
      merchantId: "m_petalia_perfumes",
      category: "perfumes",
      categoryId: "perfumes",
      name: "عطر عود شرقي",
      nameAr: "عطر عود شرقي",
      nameEn: "בושם עוד מזרחי",
      description: "تركيبة شرقية دافئة بثبات طويل مناسبة للمساء.",
      descriptionAr: "تركيبة شرقية دافئة بثبات طويل مناسبة للمساء.",
      price: 319,
      stock: 30,
      status: "active",
      rating: 4.7,
      reviewsCount: 36,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg",
      ],
    },
    {
      docId: "p_perfume_floral",
      id: "p_perfume_floral",
      merchantId: "m_petalia_perfumes",
      category: "perfumes",
      categoryId: "perfumes",
      name: "عطر زهري يومي",
      nameAr: "عطر زهري يومي",
      nameEn: "בושם פרחוני יומי",
      description: "عطر زهري ناعم مناسب للاستخدام اليومي والعمل.",
      descriptionAr: "عطر زهري ناعم مناسب للاستخدام اليومي والعمل.",
      price: 179,
      stock: 48,
      status: "active",
      rating: 4.6,
      reviewsCount: 22,
      inStock: true,
      images: [
        "https://images.pexels.com/photos/1961792/pexels-photo-1961792.jpeg",
      ],
    },
  ];

  const cities = [
    { docId: "city_nazareth", name: "الناصرة", nameEn: "נצרת", sortOrder: 1 },
    { docId: "city_umm_al_fahm", name: "أم الفحم", nameEn: "אום אל-פחם", sortOrder: 2 },
    { docId: "city_sakhnin", name: "سخنين", nameEn: "סח'נין", sortOrder: 3 },
    { docId: "city_tayibe", name: "الطيبة", nameEn: "טייבה", sortOrder: 4 },
    { docId: "city_baqa", name: "باقة الغربية", nameEn: "באקה אל-גרבייה", sortOrder: 5 },
    { docId: "city_shefa_amr", name: "شفا عمرو", nameEn: "שפרעם", sortOrder: 6 },
  ];

  for (const city of cities) {
    batch.set(
      doc(db, "cities", city.docId),
      {
        name: city.name,
        nameEn: city.nameEn,
        isActive: true,
        sortOrder: city.sortOrder,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  }

  for (const category of categories) {
    batch.set(
      doc(db, "categories", category.docId),
      {
        id: category.id,
        name: category.name,
        nameAr: category.nameAr,
        nameEn: category.nameEn,
        icon: category.icon,
        image: category.image,
        color: category.color,
        isActive: true,
        sortOrder: category.sortOrder,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  }

  for (const merchant of merchants) {
    batch.set(
      doc(db, "merchants", merchant.docId),
      {
        ...merchant,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  }

  for (const product of products) {
    batch.set(
      doc(db, "products", product.docId),
      {
        ...product,
        image: product.images[0],
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  }

  batch.set(
    doc(db, "settings", "seed_demo_catalog"),
    {
      value: "Petalia realistic demo data",
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  return {
    categories: categories.length,
    merchants: merchants.length,
    products: products.length,
    cities: cities.length,
  };
}






