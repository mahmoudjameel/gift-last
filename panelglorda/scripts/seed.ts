import { db } from "../server/db";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";
import bcrypt from "bcryptjs";

const saudiCities = ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "تبوك", "أبها", "الطائف"];

const customerNames = [
  "أحمد محمد العتيبي",
  "فاطمة سعود القحطاني",
  "محمد عبدالله الغامدي",
  "نورة خالد الشمري",
  "سلطان فهد الدوسري",
  "هند إبراهيم المطيري",
  "عبدالرحمن سالم الزهراني",
  "ريم عبدالعزيز الحربي",
  "خالد ناصر العنزي",
  "سارة يوسف البلوي",
];

const flowerProducts = [
  { name: "باقة الورد الأحمر", description: "باقة رومانسية من الورد الأحمر الفاخر", price: 150, category: "flowers" },
  { name: "باقة الزنبق الأبيض", description: "باقة أنيقة من الزنبق الأبيض النقي", price: 200, category: "flowers" },
  { name: "باقة البنفسج", description: "باقة ساحرة من البنفسج الطبيعي", price: 120, category: "flowers" },
  { name: "باقة الأوركيد", description: "أوركيد فاخر للمناسبات الخاصة", price: 350, category: "flowers" },
  { name: "باقة الورد المشكل", description: "تشكيلة متنوعة من أجمل الورود", price: 180, category: "flowers" },
  { name: "باقة التوليب", description: "توليب ملون لإضافة البهجة", price: 250, category: "flowers" },
];

const giftProducts = [
  { name: "صندوق الشوكولاتة الفاخرة", description: "مجموعة فاخرة من أجود أنواع الشوكولاتة", price: 280, category: "gifts" },
  { name: "دمية دب كبيرة", description: "دمية دب ناعمة وكبيرة للهدايا", price: 150, category: "gifts" },
  { name: "طقم العطور الفاخر", description: "طقم عطور راقي للهدايا المميزة", price: 450, category: "gifts" },
  { name: "صندوق الحلويات العربية", description: "تشكيلة من أفخر الحلويات العربية", price: 200, category: "gifts" },
  { name: "سلة الفواكه الطازجة", description: "سلة فواكه موسمية طازجة", price: 180, category: "gifts" },
  { name: "صندوق البخور والعود", description: "مجموعة بخور وعود أصلي", price: 320, category: "gifts" },
];

const orderStatuses = ["pending", "processing", "shipped", "delivered", "completed", "cancelled"];
const deliveryMethods = ["delivery", "pickup"];

const messageTemplates = {
  customer: [
    "هل يمكن توصيل الطلب اليوم؟",
    "شكراً على سرعة الاستجابة",
    "هل يمكن تغيير العنوان؟",
    "متى سيتم توصيل الطلب؟",
    "أريد إضافة بطاقة تهنئة للطلب",
  ],
  merchant: [
    "تم استلام طلبك وجاري التجهيز",
    "الطلب في الطريق إليك",
    "نعتذر عن التأخير، سيصل قريباً",
    "شكراً لتعاملك معنا",
    "تم تحديث حالة طلبك",
  ],
};

async function seed() {
  console.log("🌱 بدء عملية إضافة البيانات التجريبية...");

  try {
    const existingMerchant = await db.select().from(schema.merchants).where(
      eq(schema.merchants.username, "test_merchant")
    ).limit(1);

    let merchantId: number;

    if (existingMerchant.length > 0) {
      merchantId = existingMerchant[0].id;
      console.log("✅ التاجر موجود بالفعل، تخطي الإنشاء");
    } else {
      const hashedPassword = await bcrypt.hash("password123", 10);
      const [merchant] = await db.insert(schema.merchants).values({
        ownerName: "محمد أحمد",
        storeName: "متجر الورود الفاخرة",
        username: "test_merchant",
        bio: "متجر متخصص في تقديم أجمل الورود والهدايا الفاخرة",
        email: "merchant@test.com",
        mobile: "0501234567",
        password: hashedPassword,
        storeType: "flowers",
        category: "ورود وهدايا",
        city: "الرياض",
        registrationNumber: "1234567890",
        deliveryMethod: "both",
        status: "active",
        bankName: "البنك الأهلي",
        iban: "SA1234567890123456789012",
        accountHolderName: "محمد أحمد",
        balance: 5000,
        socialLinks: {
          instagram: "https://instagram.com/flowers_store",
          twitter: "https://twitter.com/flowers_store",
        },
      }).returning();
      merchantId = merchant.id;
      console.log("✅ تم إنشاء التاجر التجريبي");
    }

    console.log("📦 إضافة العملاء...");
    const insertedCustomers: number[] = [];
    for (let i = 0; i < customerNames.length; i++) {
      try {
        const [customer] = await db.insert(schema.customers).values({
          name: customerNames[i],
          email: `customer${i + 1}@test.com`,
          mobile: `055${String(i + 1).padStart(7, "0")}`,
          city: saudiCities[i % saudiCities.length],
        }).returning();
        insertedCustomers.push(customer.id);
      } catch (e) {
        const existing = await db.select().from(schema.customers).limit(10);
        if (existing.length > 0) {
          insertedCustomers.push(...existing.map(c => c.id));
          break;
        }
      }
    }
    console.log(`✅ تم إضافة ${insertedCustomers.length} عملاء`);

    console.log("🎁 إضافة المنتجات...");
    const allProducts = [...flowerProducts, ...giftProducts];
    const insertedProducts: number[] = [];
    for (const product of allProducts) {
      try {
        const [p] = await db.insert(schema.products).values({
          merchantId,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: Math.floor(Math.random() * 50) + 10,
          productType: product.category === "flowers" ? "flowers" : "gifts",
          category: product.category,
          images: ["/placeholder-product.jpg"],
          status: "active",
        }).returning();
        insertedProducts.push(p.id);
      } catch (e) {
        console.log(`تخطي المنتج المكرر: ${product.name}`);
      }
    }
    console.log(`✅ تم إضافة ${insertedProducts.length} منتجات`);

    if (insertedProducts.length === 0) {
      const existingProducts = await db.select().from(schema.products).limit(12);
      insertedProducts.push(...existingProducts.map(p => p.id));
    }

    console.log("📋 إضافة الطلبات...");
    const insertedOrders: { id: number; customerId: number; productId: number; totalAmount: number; isPaid: boolean }[] = [];
    const orderCount = 15;
    for (let i = 0; i < orderCount; i++) {
      const customerId = insertedCustomers[i % insertedCustomers.length];
      const productId = insertedProducts[i % insertedProducts.length];
      const product = allProducts[i % allProducts.length];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const totalAmount = product.price * quantity;
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const isPaid = status === "completed" || status === "delivered" || Math.random() > 0.5;
      
      try {
        const [order] = await db.insert(schema.orders).values({
          orderNumber: `GL-${Date.now()}-${i}`,
          customerId,
          merchantId,
          productId,
          quantity,
          totalAmount,
          status,
          customerNote: i % 3 === 0 ? "يرجى التوصيل في الصباح" : null,
          deliveryAddress: `شارع الملك فهد، حي ${saudiCities[i % saudiCities.length]}`,
          deliveryMethod: deliveryMethods[i % 2],
          isPaid,
        }).returning();
        insertedOrders.push({ id: order.id, customerId, productId, totalAmount, isPaid });
      } catch (e) {
        console.log(`تخطي طلب مكرر`);
      }
    }
    console.log(`✅ تم إضافة ${insertedOrders.length} طلبات`);

    console.log("💬 إضافة الرسائل...");
    let messageCount = 0;
    for (const order of insertedOrders) {
      const messagesPerOrder = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < messagesPerOrder; j++) {
        const isCustomer = j % 2 === 0;
        const messages = isCustomer ? messageTemplates.customer : messageTemplates.merchant;
        try {
          await db.insert(schema.orderMessages).values({
            orderId: order.id,
            senderId: isCustomer ? order.customerId : merchantId,
            senderType: isCustomer ? "customer" : "merchant",
            message: messages[Math.floor(Math.random() * messages.length)],
          });
          messageCount++;
        } catch (e) {
          console.log(`تخطي رسالة مكررة`);
        }
      }
    }
    console.log(`✅ تم إضافة ${messageCount} رسائل`);

    console.log("💰 إضافة المعاملات المالية...");
    let transactionCount = 0;
    for (const order of insertedOrders.filter(o => o.isPaid)) {
      try {
        await db.insert(schema.transactions).values({
          merchantId,
          orderId: order.id,
          type: "sale",
          amount: order.totalAmount,
          status: "completed",
          description: `دخل من الطلب رقم ${order.id}`,
        });
        transactionCount++;
      } catch (e) {
        console.log(`تخطي معاملة مكررة`);
      }
    }

    const withdrawalRequests = [
      { amount: 500, status: "completed", description: "طلب سحب مكتمل" },
      { amount: 1000, status: "pending", description: "طلب سحب قيد المراجعة" },
      { amount: 750, status: "rejected", description: "طلب سحب مرفوض - رصيد غير كافي" },
    ];
    for (const withdrawal of withdrawalRequests) {
      try {
        await db.insert(schema.transactions).values({
          merchantId,
          orderId: null,
          type: "withdrawal",
          amount: withdrawal.amount,
          status: withdrawal.status,
          description: withdrawal.description,
        });
        transactionCount++;
      } catch (e) {
        console.log(`تخطي معاملة مكررة`);
      }
    }
    console.log(`✅ تم إضافة ${transactionCount} معاملات مالية`);

    console.log("👤 إضافة المدير...");
    const existingAdmin = await db.select().from(schema.admins).where(
      eq(schema.admins.email, "admin@glorda.com")
    ).limit(1);
    
    if (existingAdmin.length === 0) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      await db.insert(schema.admins).values({
        email: "admin@glorda.com",
        password: adminPassword,
        name: "مدير النظام",
      });
      console.log("✅ تم إنشاء المدير");
    } else {
      console.log("✅ المدير موجود بالفعل");
    }

    console.log("🏙️ إضافة المدن...");
    let cityCount = 0;
    for (let i = 0; i < saudiCities.length; i++) {
      try {
        await db.insert(schema.cities).values({
          name: saudiCities[i],
          nameEn: ["Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam", "Khobar", "Dhahran", "Tabuk", "Abha", "Taif"][i],
          isActive: true,
          sortOrder: i,
        });
        cityCount++;
      } catch (e) {
        console.log(`تخطي مدينة مكررة: ${saudiCities[i]}`);
      }
    }
    console.log(`✅ تم إضافة ${cityCount} مدن`);

    console.log("📂 إضافة التصنيفات...");
    const categoriesData = [
      { name: "ورود", nameEn: "Flowers", icon: "🌹" },
      { name: "هدايا", nameEn: "Gifts", icon: "🎁" },
      { name: "شوكولاتة", nameEn: "Chocolate", icon: "🍫" },
      { name: "حلويات", nameEn: "Sweets", icon: "🍬" },
      { name: "عطور", nameEn: "Perfumes", icon: "🌸" },
    ];
    let categoryCount = 0;
    for (let i = 0; i < categoriesData.length; i++) {
      try {
        await db.insert(schema.categories).values({
          name: categoriesData[i].name,
          nameEn: categoriesData[i].nameEn,
          icon: categoriesData[i].icon,
          isActive: true,
          sortOrder: i,
        });
        categoryCount++;
      } catch (e) {
        console.log(`تخطي تصنيف مكرر: ${categoriesData[i].name}`);
      }
    }
    console.log(`✅ تم إضافة ${categoryCount} تصنيفات`);

    console.log("🎉 تمت عملية إضافة البيانات التجريبية بنجاح!");
    console.log("\n📌 بيانات الدخول التجريبية:");
    console.log("   التاجر: test_merchant / password123");
    console.log("   المدير: admin@glorda.com / admin123");
  } catch (error) {
    console.error("❌ خطأ في إضافة البيانات:", error);
    throw error;
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));
