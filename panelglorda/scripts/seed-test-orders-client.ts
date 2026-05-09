import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  where,
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
const customerEmail = "customer.test@petalia.com";
const customerPassword = "Test@123456";

async function getUidByEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

async function run() {
  const merchantUid = await getUidByEmail(merchantEmail, merchantPassword);
  const customerUid = await getUidByEmail(customerEmail, customerPassword);

  const customerUserSnap = await getDoc(doc(db, "users", customerUid));
  const customerName = (customerUserSnap.data()?.name as string) || "مستخدم تجريبي";

  const productsSnap = await getDocs(
    query(collection(db, "products"), where("merchantId", "==", merchantUid))
  );
  if (productsSnap.empty) {
    throw new Error("No merchant products found. Seed products first.");
  }

  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<any>;
  const p1 = products[0];
  const p2 = products[1] || products[0];
  const p3 = products[2] || products[0];

  const orderSeeds = [
    {
      orderNumber: `PTL-${Date.now().toString().slice(-6)}-01`,
      product: p1,
      quantity: 1,
      status: "pending",
      paymentMethod: "cash",
      isPaid: false,
      deliveryMethod: "delivery",
      deliveryAddress: "حي الصفافرة، الناصرة",
      recipientCity: "الناصرة",
      recipientRegion: "الجليل",
      recipientName: customerName,
      recipientPhone: "0501111111",
      customerNote: "يرجى الاتصال قبل التوصيل.",
    },
    {
      orderNumber: `PTL-${Date.now().toString().slice(-6)}-02`,
      product: p2,
      quantity: 2,
      status: "confirmed",
      paymentMethod: "tabby",
      isPaid: true,
      paymentStatus: "AUTHORIZED",
      deliveryMethod: "delivery",
      deliveryAddress: "شارع المدينة، أم الفحم",
      recipientCity: "أم الفحم",
      recipientRegion: "المثلث",
      recipientName: customerName,
      recipientPhone: "0502222222",
      customerNote: "تغليف هدية من فضلك.",
    },
    {
      orderNumber: `PTL-${Date.now().toString().slice(-6)}-03`,
      product: p3,
      quantity: 1,
      status: "completed",
      paymentMethod: "credit_card",
      isPaid: true,
      paymentStatus: "CAPTURED",
      deliveryMethod: "branch",
      branchName: "فرع الناصرة الرئيسي",
      branchLocation: "شارع بولس السادس، الناصرة",
      deliveryAddress: "استلام من الفرع",
      recipientCity: "الناصرة",
      recipientRegion: "الجليل",
      recipientName: customerName,
      recipientPhone: "0503333333",
      customerNote: "سأستلم الطلب مساءً.",
    },
    {
      orderNumber: `PTL-${Date.now().toString().slice(-6)}-04`,
      product: p1,
      quantity: 1,
      status: "processing",
      paymentMethod: "cash",
      isPaid: false,
      deliveryMethod: "delivery",
      deliveryAddress: "الحي الغربي، سخنين",
      recipientCity: "سخنين",
      recipientRegion: "الجليل",
      recipientName: customerName,
      recipientPhone: "0504444444",
      customerNote: "التوصيل بين 4-6 مساءً.",
    },
    {
      orderNumber: `PTL-${Date.now().toString().slice(-6)}-05`,
      product: p2,
      quantity: 1,
      status: "cancelled",
      paymentMethod: "cash",
      isPaid: false,
      deliveryMethod: "delivery",
      deliveryAddress: "المنطقة الشرقية، الطيبة",
      recipientCity: "الطيبة",
      recipientRegion: "المثلث",
      recipientName: customerName,
      recipientPhone: "0505555555",
      customerNote: "تم الإلغاء من العميل.",
    },
  ];

  let created = 0;
  for (const seed of orderSeeds) {
    const unitPrice = Number(seed.product.price || 0);
    const totalAmount = unitPrice * seed.quantity;
    await addDoc(collection(db, "orders"), {
      orderNumber: seed.orderNumber,
      merchantId: merchantUid,
      customerId: customerUid,
      customerName,
      customerPhone: seed.recipientPhone,
      customerEmail,
      productId: seed.product.id,
      items: [
        {
          productId: seed.product.id,
          name: seed.product.nameAr || seed.product.name || "",
          quantity: seed.quantity,
          price: unitPrice,
          image: Array.isArray(seed.product.images) ? seed.product.images[0] : "",
        },
      ],
      quantity: seed.quantity,
      totalAmount,
      status: seed.status,
      deliveryAddress: seed.deliveryAddress,
      deliveryMethod: seed.deliveryMethod,
      recipientName: seed.recipientName,
      recipientPhone: seed.recipientPhone,
      recipientCity: seed.recipientCity,
      recipientRegion: seed.recipientRegion,
      branchName: seed.branchName || null,
      branchLocation: seed.branchLocation || null,
      customerNote: seed.customerNote,
      paymentMethod: seed.paymentMethod,
      isPaid: seed.isPaid,
      paymentStatus: seed.paymentStatus || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    created++;
  }

  console.log("✅ Test orders created:", created);
  console.log("merchantUid:", merchantUid);
  console.log("customerUid:", customerUid);
}

run().catch((e) => {
  console.error("❌ Failed seeding orders:", e);
  process.exit(1);
});
