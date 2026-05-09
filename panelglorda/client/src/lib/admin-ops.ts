import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  increment,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

const mapDocs = <T = DocumentData>(snap: any): T[] =>
  snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];

// Admin management (list admins only; creation handled manually if needed)
export async function getAdmins() {
  const snap = await getDocs(collection(db, "admins"));
  return mapDocs<{ id: string; email: string; name?: string }>(snap);
}

export async function addAdmin(data: { email: string; name?: string }) {
  const ref = await addDoc(collection(db, "admins"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteAdmin(id: string) {
  await deleteDoc(doc(db, "admins", id));
}

// Merchants
export async function getMerchantsByStatus(status?: string) {
  const col = collection(db, "merchants");
  const snap = status
    ? await getDocs(query(col, where("status", "==", status)))
    : await getDocs(col);
  return mapDocs<any>(snap);
}

// Notification types
import { addNotification } from "./notifications";

// ...

export async function updateMerchantStatus(id: string, status: string) {
  await updateDoc(doc(db, "merchants", id), { status, updatedAt: serverTimestamp() });

  // Notify merchant
  if (status === "active") {
    await addNotification(
      id,
      "merchant",
      "تم تفعيل حسابك",
      "تم تفعيل حساب التاجر الخاص بك بنجاح. يمكنك الآن البدء في استخدام لوحة التحكم.",
      "system",
      "/dashboard"
    );
  } else if (status === "rejected") {
    await addNotification(
      id,
      "merchant",
      "تم رفض طلب التسجيل",
      "عذراً، تم رفض طلب تسجيل حساب التاجر الخاص بك. يرجى التواصل مع الإدارة للمزيد من التفاصيل.",
      "system"
    );
  }
}

// ...

export async function updateWithdrawalStatus(id: string, status: "completed" | "rejected") {
  // Withdrawals are stored in transactions collection with type="withdrawal"
  const withdrawalRef = doc(db, "transactions", id);
  const wDoc = await getDoc(withdrawalRef);

  if (!wDoc.exists()) {
    throw new Error("Transaction not found");
  }

  const data = wDoc.data();

  const wasPending = data.status === "pending";

  // If completing a withdrawal, deduct from merchant balance
  if (status === "completed" && wasPending) {
    const merchantId = data.merchantId;
    const amount = Math.abs(data.amount); // amount is stored as negative in transaction

    if (merchantId && amount > 0) {
      const merchantRef = doc(db, "merchants", merchantId.toString());
      await updateDoc(merchantRef, {
        balance: increment(-amount),
        updatedAt: serverTimestamp()
      });
      console.log(`Deducted ${amount} from merchant ${merchantId} balance due to withdrawal completion`);
    }
  }

  // If rejecting a pending withdrawal, return amount to merchant balance
  if (status === "rejected" && wasPending) {
    const merchantId = data.merchantId;
    const amount = Math.abs(data.amount);

    if (merchantId && amount > 0) {
      const merchantRef = doc(db, "merchants", merchantId.toString());
      await updateDoc(merchantRef, {
        balance: increment(amount),
        updatedAt: serverTimestamp(),
      });
      console.log(`Refunded ${amount} to merchant ${merchantId} balance due to withdrawal rejection`);
    }
  }

  await updateDoc(withdrawalRef, { status, updatedAt: serverTimestamp() });

  // Get withdrawal details to notify merchant
  const title = status === "completed" ? "تم الموافقة على السحب" : "تم رفض طلب السحب";
  const body = status === "completed"
    ? `تم تحويل مبلغ ${Math.abs(data.amount)} ر.س إلى حسابك البنكي بنجاح.`
    : `تم رفض طلب سحب مبلغ ${Math.abs(data.amount)} ر.س وتمت إعادة المبلغ إلى محفظتك.`;

  await addNotification(
    data.merchantId,
    "merchant",
    title,
    body,
    "withdrawal",
    "/dashboard/wallet"
  );
}

// Helper function to convert Firestore Timestamp to Date
const getDateFromTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date(0);

  // Firestore Timestamp object
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }

  // Firestore Timestamp with toDate method
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Regular Date or string
  return new Date(timestamp);
};

// Withdrawals
export async function getWithdrawals() {
  const q = query(
    collection(db, "transactions"),
    where("type", "==", "withdrawal"),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  const withdrawals = mapDocs<any>(snap);

  // Sort by createdAt descending (no index required - sorted in memory)
  return withdrawals.sort((a, b) => {
    const aDate = getDateFromTimestamp(a.createdAt);
    const bDate = getDateFromTimestamp(b.createdAt);
    return bDate.getTime() - aDate.getTime();
  });
}

// Customers
export async function getCustomers() {
  const snap = await getDocs(collection(db, "customers"));
  const customers = mapDocs<any>(snap);

  // Sort by createdAt descending (no index required - sorted in memory)
  return customers.sort((a, b) => {
    const aDate = getDateFromTimestamp(a.createdAt);
    const bDate = getDateFromTimestamp(b.createdAt);
    return bDate.getTime() - aDate.getTime();
  });
}

// Orders
export async function getAllOrders() {
  const snap = await getDocs(collection(db, "orders"));
  const orders = mapDocs<any>(snap);

  // Sort by createdAt descending (no index required - sorted in memory)
  return orders.sort((a, b) => {
    const aDate = getDateFromTimestamp(a.createdAt);
    const bDate = getDateFromTimestamp(b.createdAt);
    return bDate.getTime() - aDate.getTime();
  });
}

// Transactions
export async function getTransactions() {
  const snap = await getDocs(collection(db, "transactions"));
  return mapDocs<any>(snap);
}

// Settings key/value
export async function getSetting(key: string) {
  // First try to get by document ID (most common case)
  try {
    const settingDoc = await getDoc(doc(db, "settings", key));
    if (settingDoc.exists()) {
      return { id: settingDoc.id, ...settingDoc.data() } as any;
    }
  } catch (error) {
    console.error("Error getting setting by ID:", error);
  }

  // If not found by ID, try querying by key field (fallback)
  try {
    const snap = await getDocs(query(collection(db, "settings"), where("key", "==", key)));
    if (snap.docs.length > 0) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as any;
    }
  } catch (error) {
    console.error("Error getting setting by query:", error);
  }

  return null;
}

export async function setSetting(key: string, value: any) {
  // Use doc id = key for simplicity
  // Use setDoc with merge to ensure the document is created/updated correctly
  const settingRef = doc(db, "settings", key);
  const existingDoc = await getDoc(settingRef);

  // Ensure value is a string (convert null/undefined to empty string)
  const stringValue = value !== null && value !== undefined ? String(value) : "";

  if (existingDoc.exists()) {
    // Update existing document - ensure key field is also updated
    await updateDoc(settingRef, {
      key,
      value: stringValue,
      updatedAt: serverTimestamp()
    });
  } else {
    // Create new document with doc ID = key
    await setDoc(settingRef, {
      key,
      value: stringValue,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  console.log(`✅ [setSetting] Saved setting: ${key}`, {
    valueLength: stringValue.length,
    valuePreview: stringValue.substring(0, 50) + (stringValue.length > 50 ? '...' : '')
  });
}
