import { auth, db } from "../server/firebaseConfig";
import { FieldValue } from "firebase-admin/firestore";

type AccountSeedResult = {
  email: string;
  password: string;
  uid: string;
};

async function upsertAuthUser(email: string, password: string, displayName: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password, displayName });
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password, displayName });
    return created.uid;
  }
}

async function createOrUpdateMerchantAccount(): Promise<AccountSeedResult> {
  const email = "merchant.test@petalia.com";
  const password = "Test@123456";
  const uid = await upsertAuthUser(email, password, "تاجر تجريبي");

  await db.collection("users").doc(uid).set(
    {
      role: "merchant",
      email,
      name: "تاجر تجريبي",
      merchantId: uid,
      storeName: "متجر تجريبي - Petalia",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection("merchants").doc(uid).set(
    {
      id: uid,
      ownerName: "تاجر تجريبي",
      storeName: "متجر تجريبي - Petalia",
      storeNameAr: "متجر تجريبي - Petalia",
      storeNameEn: "Petalia Test Store",
      username: "petalia_test_merchant",
      email,
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
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { email, password, uid };
}

async function createOrUpdateCustomerAccount(): Promise<AccountSeedResult> {
  const email = "customer.test@petalia.com";
  const password = "Test@123456";
  const uid = await upsertAuthUser(email, password, "مستخدم تجريبي");
  const customerNumericId = 48480001;

  await db.collection("users").doc(uid).set(
    {
      role: "customer",
      email,
      name: "مستخدم تجريبي",
      customerId: customerNumericId,
      phone: "",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const existingCustomer = await db
    .collection("customers")
    .where("id", "==", customerNumericId)
    .limit(1)
    .get();

  if (existingCustomer.empty) {
    await db.collection("customers").add({
      id: customerNumericId,
      name: "مستخدم تجريبي",
      email,
      mobile: "",
      city: "الناصرة",
      status: "active",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await existingCustomer.docs[0].ref.set(
      {
        name: "مستخدم تجريبي",
        email,
        city: "الناصرة",
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return { email, password, uid };
}

async function run() {
  const merchant = await createOrUpdateMerchantAccount();
  const customer = await createOrUpdateCustomerAccount();

  console.log("✅ Test accounts are ready");
  console.log("Merchant:", merchant);
  console.log("Customer:", customer);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to create test accounts:", error);
    process.exit(1);
  });
