import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC5A1TP8eJ_Ss3mjEe30ve3cPYWunt1yDA",
  authDomain: "petalia-383ec.firebaseapp.com",
  projectId: "petalia-383ec",
  storageBucket: "petalia-383ec.firebasestorage.app",
  messagingSenderId: "945449483673",
  appId: "1:945449483673:web:ed4280d24beb4f34aea708",
  measurementId: "G-B1JS6HJ739",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const merchantEmail = "merchant.test@petalia.com";
const merchantPassword = "Test@123456";

async function ensureMerchantProfile(uid: string) {
  await setDoc(
    doc(db, "merchants", uid),
    {
      id: uid,
      ownerName: "تاجر تجريبي",
      storeName: "متجر تجريبي - Petalia",
      storeNameAr: "متجر تجريبي - Petalia",
      storeNameEn: "Petalia Test Store",
      username: "petalia_test_merchant",
      email: merchantEmail,
      phone: "0500000010",
      mobile: "0500000010",
      city: "الناصرة",
      cityAr: "الناصرة",
      status: "active",
      isOpen: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      category: "flowers",
      descriptionAr: "متجر تجريبي متكامل للتجربة الواقعية في التطبيق.",
      description: "متجر تجريبي متكامل للتجربة الواقعية في التطبيق.",
      storeImage: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
      banner: "https://images.pexels.com/photos/1070860/pexels-photo-1070860.jpeg",
      bankName: "Bank Hapoalim",
      iban: "IL620108000000099999999",
      beneficiaryName: "Petalia Test Merchant",
      balance: 0,
      rating: 4.7,
      reviewsCount: 18,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", uid),
    {
      role: "merchant",
      email: merchantEmail,
      name: "تاجر تجريبي",
      merchantId: uid,
      storeName: "متجر تجريبي - Petalia",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function seedDeliveryOptions(uid: string) {
  const options = [
    {
      name: "توصيل سريع - الناصرة",
      nameEn: "משלוח מהיר - נצרת",
      city: "الناصرة",
      price: 18,
      range: 20,
      workDays: ["sun", "mon", "tue", "wed", "thu"],
      periods: [
        { from: "09:00", to: "13:00" },
        { from: "14:00", to: "18:00" },
      ],
      isActive: true,
    },
    {
      name: "توصيل مسائي - المثلث",
      nameEn: "משלוח ערב - המשולש",
      city: "أم الفحم",
      price: 25,
      range: 35,
      workDays: ["sun", "mon", "tue", "wed", "thu", "fri"],
      periods: [{ from: "16:00", to: "21:00" }],
      isActive: true,
    },
  ];

  for (const option of options) {
    const existing = await getDocs(
      query(
        collection(db, "deliveryOptions"),
        where("merchantId", "==", uid),
        where("name", "==", option.name)
      )
    );
    if (!existing.empty) continue;
    await addDoc(collection(db, "deliveryOptions"), {
      ...option,
      merchantId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function seedBranches(uid: string) {
  const branches = [
    {
      name: "فرع الناصرة الرئيسي",
      nameEn: "סניף נצרת ראשי",
      city: "الناصرة",
      address: "شارع بولس السادس، الناصرة",
      googleMapsLink: "https://maps.google.com/?q=32.6996,35.3035",
      latitude: 32.6996,
      longitude: 35.3035,
      workDays: "يومياً",
      workHours: "09:00 - 22:00",
      isActive: true,
    },
    {
      name: "فرع أم الفحم",
      nameEn: "סניף אום אל-פחם",
      city: "أم الفحم",
      address: "الشارع الرئيسي، أم الفحم",
      googleMapsLink: "https://maps.google.com/?q=32.5173,35.1535",
      latitude: 32.5173,
      longitude: 35.1535,
      workDays: "الأحد - الاثنين - الثلاثاء - الأربعاء - الخميس - الجمعة",
      workHours: "10:00 - 21:00",
      isActive: true,
    },
  ];

  for (const branch of branches) {
    const existing = await getDocs(
      query(
        collection(db, "branches"),
        where("merchantId", "==", uid),
        where("name", "==", branch.name)
      )
    );
    if (!existing.empty) continue;
    await addDoc(collection(db, "branches"), {
      ...branch,
      merchantId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function seedProducts(uid: string) {
  const products = [
    {
      id: "merchant_test_flower_box",
      name: "بوكس ورد فاخر",
      nameAr: "بوكس ورد فاخر",
      nameEn: "קופסת פרחים יוקרתית",
      description: "بوكس ورد فاخر مناسب للهدايا والمناسبات الخاصة.",
      descriptionAr: "بوكس ورد فاخر مناسب للهدايا والمناسبات الخاصة.",
      category: "flowers",
      categoryId: "flowers",
      price: 220,
      originalPrice: 260,
      stock: 40,
      images: [
        "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
        "https://images.pexels.com/photos/265856/pexels-photo-265856.jpeg",
      ],
      status: "active",
      isHidden: false,
      inStock: true,
      allowsGiftCard: true,
      giftCardFee: 8,
      tags: ["هدية", "زهور", "مناسبات"],
    },
    {
      id: "merchant_test_choco_cake",
      name: "كيك شوكولاتة مناسبات",
      nameAr: "كيك شوكولاتة مناسبات",
      nameEn: "עוגת שוקולד לאירועים",
      description: "كيك شوكولاتة بطبقات كريمة غنيّة.",
      descriptionAr: "كيك شوكولاتة بطبقات كريمة غنيّة.",
      category: "cakes",
      categoryId: "cakes",
      price: 180,
      stock: 24,
      images: [
        "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg",
      ],
      status: "active",
      isHidden: false,
      inStock: true,
      allowsGiftCard: false,
      tags: ["كيك", "شوكولاتة"],
    },
    {
      id: "merchant_test_perfume_oud",
      name: "عطر عود شرقي مركز",
      nameAr: "عطر عود شرقي مركز",
      nameEn: "בושם עוד מזרחי מרוכז",
      description: "رائحة عود شرقي ثابتة تدوم طويلاً.",
      descriptionAr: "رائحة عود شرقي ثابتة تدوم طويلاً.",
      category: "perfumes",
      categoryId: "perfumes",
      price: 295,
      stock: 30,
      images: [
        "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg",
      ],
      status: "active",
      isHidden: false,
      inStock: true,
      allowsGiftCard: true,
      giftCardFee: 10,
      tags: ["عطور", "عود"],
    },
    {
      id: "merchant_test_skincare_set",
      name: "طقم عناية بالبشرة",
      nameAr: "طقم عناية بالبشرة",
      nameEn: "ערכת טיפוח לעור",
      description: "مجموعة تنظيف وترطيب مناسبة للاستعمال اليومي.",
      descriptionAr: "مجموعة تنظيف وترطيب مناسبة للاستعمال اليومي.",
      category: "cosmetics",
      categoryId: "cosmetics",
      price: 159,
      stock: 45,
      images: [
        "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg",
      ],
      status: "active",
      isHidden: false,
      inStock: true,
      allowsGiftCard: false,
      tags: ["كوزمتكس", "عناية"],
    },
  ];

  for (const product of products) {
    const existing = await getDocs(
      query(
        collection(db, "products"),
        where("merchantId", "==", uid),
        where("id", "==", product.id)
      )
    );
    if (!existing.empty) continue;
    await addDoc(collection(db, "products"), {
      ...product,
      merchantId: uid,
      image: product.images[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function run() {
  const cred = await signInWithEmailAndPassword(auth, merchantEmail, merchantPassword);
  const uid = cred.user.uid;

  await ensureMerchantProfile(uid);
  await seedDeliveryOptions(uid);
  await seedBranches(uid);
  await seedProducts(uid);

  console.log("✅ Merchant seeded successfully");
  console.log("merchantUid:", uid);
  console.log("email:", merchantEmail);
}

run().catch((e) => {
  console.error("❌ Merchant seed failed:", e);
  process.exit(1);
});
