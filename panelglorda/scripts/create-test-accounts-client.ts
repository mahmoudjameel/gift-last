import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

async function ensureUser(email: string, password: string, displayName: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
    }
    return cred.user;
  } catch (e: any) {
    if (e?.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    }
    throw e;
  }
}

async function main() {
  const merchantEmail = "merchant.test@petalia.com";
  const customerEmail = "customer.test@petalia.com";
  const password = "Test@123456";

  const merchant = await ensureUser(merchantEmail, password, "تاجر تجريبي");
  await setDoc(
    doc(db, "users", merchant.uid),
    {
      role: "merchant",
      email: merchantEmail,
      name: "تاجر تجريبي",
      merchantId: merchant.uid,
      storeName: "متجر تجريبي - Petalia",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  await setDoc(
    doc(db, "merchants", merchant.uid),
    {
      id: merchant.uid,
      ownerName: "تاجر تجريبي",
      storeName: "متجر تجريبي - Petalia",
      storeNameAr: "متجر تجريبي - Petalia",
      storeNameEn: "Petalia Test Store",
      username: "petalia_test_merchant",
      email: merchantEmail,
      phone: "0500000010",
      city: "الناصرة",
      category: "flowers",
      status: "active",
      isOpen: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      balance: 0,
      rating: 4.7,
      reviewsCount: 12,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  const customer = await ensureUser(customerEmail, password, "مستخدم تجريبي");
  const customerNumericId = 48480001;
  await setDoc(
    doc(db, "users", customer.uid),
    {
      role: "customer",
      email: customerEmail,
      name: "مستخدم تجريبي",
      customerId: customerNumericId,
      phone: "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  await setDoc(
    doc(db, "customers", "customer_test_48480001"),
    {
      id: customerNumericId,
      name: "مستخدم تجريبي",
      email: customerEmail,
      mobile: "",
      city: "الناصرة",
      status: "active",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  const merchantDoc = await getDoc(doc(db, "merchants", merchant.uid));
  const userMerchantDoc = await getDoc(doc(db, "users", merchant.uid));
  const userCustomerDoc = await getDoc(doc(db, "users", customer.uid));

  console.log("✅ Accounts ready");
  console.log("merchantEmail:", merchantEmail);
  console.log("customerEmail:", customerEmail);
  console.log("password:", password);
  console.log("merchantDocExists:", merchantDoc.exists());
  console.log("userMerchantDocExists:", userMerchantDoc.exists());
  console.log("userCustomerDocExists:", userCustomerDoc.exists());
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
