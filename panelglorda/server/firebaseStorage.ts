import { db, auth, firebaseAdmin } from './firebaseConfig';
import type {
    Merchant,
    InsertMerchant,
    Product,
    InsertProduct,
    Transaction,
    InsertTransaction,
    Admin,
    InsertAdmin,
    Customer,
    InsertCustomer,
    Order,
    InsertOrder,
    OrderMessage,
    InsertOrderMessage,
    Review,
    InsertReview,
    Banner,
    InsertBanner,
    Category,
    InsertCategory,
    City,
    InsertCity,
    AppSetting,
    InsertAppSetting,
    Notification,
    InsertNotification,
    ProductOption,
    InsertProductOption,
    ProductOptionChoice,
    InsertProductOptionChoice,
    OrderOptionSelection,
    InsertOrderOptionSelection,
    DiscountCode,
    InsertDiscountCode
} from '@shared/schema';
import type { IStorage } from './storage';
import { FieldValue } from 'firebase-admin/firestore';

export class FirebaseStorage implements IStorage {
    // ========== Merchants ==========
    async getMerchant(id: number): Promise<Merchant | undefined> {
        const doc = await db.collection('merchants').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Merchant;
    }

    async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
        const snapshot = await db.collection('merchants').where('email', '==', email).limit(1).get();
        if (snapshot.empty) return undefined;
        const doc = snapshot.docs[0];
        return { id: parseInt(doc.id), ...doc.data() } as Merchant;
    }

    async getMerchantByPhone(phone: string): Promise<Merchant | undefined> {
        const snapshot = await db.collection('merchants').where('mobile', '==', phone).limit(1).get();
        if (snapshot.empty) return undefined;
        const doc = snapshot.docs[0];
        return { id: parseInt(doc.id), ...doc.data() } as Merchant;
    }

    async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
        const docRef = db.collection('merchants').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36); // Generate numeric ID from Firestore ID
        const data = {
            ...merchant,
            id,
            balance: 0,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Merchant;
    }

    async updateMerchant(id: number, data: Partial<Merchant>): Promise<void> {
        await db.collection('merchants').doc(id.toString()).update(data);
    }

    async updateMerchantStatus(id: number, status: string): Promise<void> {
        await db.collection('merchants').doc(id.toString()).update({ status });
    }

    async updateMerchantBalance(id: number, amount: number): Promise<void> {
        await db.collection('merchants').doc(id.toString()).update({ balance: amount });
    }

    async getAllMerchants(): Promise<Merchant[]> {
        const snapshot = await db.collection('merchants').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Merchant));
    }

    // ========== Products ==========
    async getProduct(id: number): Promise<Product | undefined> {
        const doc = await db.collection('products').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Product;
    }

    async getProductsByMerchant(merchantId: number): Promise<Product[]> {
        const snapshot = await db.collection('products')
            .where('merchantId', '==', merchantId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Product));
    }

    async createProduct(product: InsertProduct): Promise<Product> {
        const docRef = db.collection('products').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...product,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Product;
    }

    async updateProduct(id: number, product: Partial<InsertProduct>): Promise<void> {
        await db.collection('products').doc(id.toString()).update(product);
    }

    async deleteProduct(id: number): Promise<void> {
        await db.collection('products').doc(id.toString()).delete();
    }

    // ========== Customers ==========
    async getCustomer(id: number): Promise<Customer | undefined> {
        const doc = await db.collection('customers').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Customer;
    }

    async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
        const snapshot = await db.collection('customers').where('mobile', '==', phone).limit(1).get();
        if (snapshot.empty) return undefined;
        const doc = snapshot.docs[0];
        return { id: parseInt(doc.id), ...doc.data() } as Customer;
    }

    async getAllCustomers(): Promise<Customer[]> {
        const snapshot = await db.collection('customers').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Customer));
    }

    async createCustomer(customer: InsertCustomer): Promise<Customer> {
        const docRef = db.collection('customers').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...customer,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Customer;
    }

    // ========== Orders ==========
    async getOrder(id: number): Promise<Order | undefined> {
        const doc = await db.collection('orders').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Order;
    }

    async getOrdersByMerchant(merchantId: number): Promise<Order[]> {
        const snapshot = await db.collection('orders')
            .where('merchantId', '==', merchantId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Order));
    }

    async getOrdersByCustomer(customerId: number): Promise<Order[]> {
        const snapshot = await db.collection('orders')
            .where('customerId', '==', customerId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Order));
    }

    async getAllOrders(): Promise<Order[]> {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Order));
    }

    async createOrder(order: InsertOrder): Promise<Order> {
        const docRef = db.collection('orders').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...order,
            id,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date(), updatedAt: new Date() } as Order;
    }

    async updateOrderStatus(id: number, status: string): Promise<void> {
        await db.collection('orders').doc(id.toString()).update({
            status,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    async updateOrderPaid(id: number, isPaid: boolean): Promise<void> {
        await db.collection('orders').doc(id.toString()).update({
            isPaid,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    // ========== Order Messages ==========
    async getMessagesByOrder(orderId: number): Promise<OrderMessage[]> {
        const snapshot = await db.collection('orders')
            .doc(orderId.toString())
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as OrderMessage));
    }

    async createMessage(message: InsertOrderMessage): Promise<OrderMessage> {
        const docRef = db.collection('orders')
            .doc(message.orderId.toString())
            .collection('messages')
            .doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...message,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as OrderMessage;
    }

    // ========== Reviews ==========
    async getReviewsByProduct(productId: number): Promise<Review[]> {
        const snapshot = await db.collection('reviews')
            .where('productId', '==', productId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Review));
    }

    async getReviewsByMerchant(merchantId: number): Promise<Review[]> {
        // First get all products by this merchant
        const products = await this.getProductsByMerchant(merchantId);
        const productIds = products.map(p => p.id);

        if (productIds.length === 0) return [];

        // Firestore has limit of 10 items in 'in' query, so we batch
        const reviews: Review[] = [];
        for (let i = 0; i < productIds.length; i += 10) {
            const batch = productIds.slice(i, i + 10);
            const snapshot = await db.collection('reviews')
                .where('productId', 'in', batch)
                .get();
            reviews.push(...snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Review)));
        }

        return reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async createReview(review: InsertReview): Promise<Review> {
        const docRef = db.collection('reviews').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...review,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Review;
    }

    // ========== Transactions ==========
    async getTransactionById(id: number): Promise<Transaction | undefined> {
        const doc = await db.collection('transactions').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Transaction;
    }

    async getTransactionsByMerchant(merchantId: number): Promise<Transaction[]> {
        const snapshot = await db.collection('transactions')
            .where('merchantId', '==', merchantId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Transaction));
    }

    async getAllTransactions(): Promise<Transaction[]> {
        const snapshot = await db.collection('transactions').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Transaction));
    }

    async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
        const docRef = db.collection('transactions').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...transaction,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Transaction;
    }

    async updateTransactionStatus(id: number, status: string): Promise<void> {
        await db.collection('transactions').doc(id.toString()).update({ status });
    }

    async getPendingWithdrawals(): Promise<Transaction[]> {
        const snapshot = await db.collection('transactions')
            .where('type', '==', 'withdrawal')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Transaction));
    }

    // ========== Admins ==========
    async getAdmin(id: number): Promise<Admin | undefined> {
        const doc = await db.collection('admins').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Admin;
    }

    async getAdminByEmail(email: string): Promise<Admin | undefined> {
        const snapshot = await db.collection('admins').where('email', '==', email).limit(1).get();
        if (snapshot.empty) return undefined;
        const doc = snapshot.docs[0];
        return { id: parseInt(doc.id), ...doc.data() } as Admin;
    }

    async getAllAdmins(): Promise<Admin[]> {
        const snapshot = await db.collection('admins').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Admin));
    }

    async createAdmin(admin: InsertAdmin): Promise<Admin> {
        const docRef = db.collection('admins').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...admin,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Admin;
    }

    async deleteAdmin(id: number): Promise<void> {
        await db.collection('admins').doc(id.toString()).delete();
    }

    async updateAdminPassword(id: number, password: string): Promise<void> {
        await db.collection('admins').doc(id.toString()).update({ password });
    }

    // ========== Banners ==========
    async getBanner(id: number): Promise<Banner | undefined> {
        const doc = await db.collection('banners').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Banner;
    }

    async getAllBanners(): Promise<Banner[]> {
        const snapshot = await db.collection('banners').orderBy('sortOrder', 'asc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Banner));
    }

    async getActiveBanners(): Promise<Banner[]> {
        const snapshot = await db.collection('banners')
            .where('isActive', '==', true)
            .orderBy('sortOrder', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Banner));
    }

    async createBanner(banner: InsertBanner): Promise<Banner> {
        const docRef = db.collection('banners').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...banner,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Banner;
    }

    async updateBanner(id: number, banner: Partial<InsertBanner>): Promise<void> {
        await db.collection('banners').doc(id.toString()).update(banner);
    }

    async deleteBanner(id: number): Promise<void> {
        await db.collection('banners').doc(id.toString()).delete();
    }

    // ========== Categories ==========
    async getCategory(id: number): Promise<Category | undefined> {
        const doc = await db.collection('categories').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Category;
    }

    async getAllCategories(): Promise<Category[]> {
        const snapshot = await db.collection('categories').orderBy('sortOrder', 'asc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Category));
    }

    async getActiveCategories(): Promise<Category[]> {
        const snapshot = await db.collection('categories')
            .where('isActive', '==', true)
            .orderBy('sortOrder', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Category));
    }

    async createCategory(category: InsertCategory): Promise<Category> {
        const docRef = db.collection('categories').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...category,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Category;
    }

    async updateCategory(id: number, category: Partial<InsertCategory>): Promise<void> {
        await db.collection('categories').doc(id.toString()).update(category);
    }

    async deleteCategory(id: number): Promise<void> {
        await db.collection('categories').doc(id.toString()).delete();
    }

    // ========== Cities ==========
    async getCity(id: number): Promise<City | undefined> {
        const doc = await db.collection('cities').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as City;
    }

    async getAllCities(): Promise<City[]> {
        const snapshot = await db.collection('cities').orderBy('sortOrder', 'asc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as City));
    }

    async getActiveCities(): Promise<City[]> {
        const snapshot = await db.collection('cities')
            .where('isActive', '==', true)
            .orderBy('sortOrder', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as City));
    }

    async createCity(city: InsertCity): Promise<City> {
        const docRef = db.collection('cities').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...city,
            id,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as City;
    }

    async updateCity(id: number, city: Partial<InsertCity>): Promise<void> {
        await db.collection('cities').doc(id.toString()).update(city);
    }

    async deleteCity(id: number): Promise<void> {
        await db.collection('cities').doc(id.toString()).delete();
    }

    // ========== App Settings ==========
    async getSetting(key: string): Promise<AppSetting | undefined> {
        const doc = await db.collection('settings').doc(key).get();
        if (!doc.exists) return undefined;
        return { id: 0, key, ...doc.data() } as AppSetting;
    }

    async getAllSettings(): Promise<AppSetting[]> {
        const snapshot = await db.collection('settings').get();
        return snapshot.docs.map((doc, idx) => ({ id: idx, key: doc.id, ...doc.data() } as AppSetting));
    }

    async setSetting(key: string, value?: string, valueJson?: any): Promise<AppSetting> {
        const data = {
            value,
            valueJson,
            updatedAt: FieldValue.serverTimestamp(),
        };
        await db.collection('settings').doc(key).set(data, { merge: true });
        return { id: 0, key, ...data, updatedAt: new Date() } as AppSetting;
    }

    // ========== Notifications ==========
    async createNotification(notification: InsertNotification): Promise<Notification> {
        const docRef = db.collection('notifications').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...notification,
            id,
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, isRead: false, createdAt: new Date() } as Notification;
    }

    async getNotificationsForMerchant(merchantId: number): Promise<Notification[]> {
        // Fetch all notifications and filter/sort in memory to avoid index requirement
        const snapshot = await db.collection('notifications').get();
        let notifications = snapshot.docs
            .map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Notification))
            .filter((notif: any) =>
                notif.recipientType === 'merchant' &&
                notif.recipientId === merchantId
            );

        // Sort by createdAt descending in memory
        notifications.sort((a: any, b: any) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate.getTime() - aDate.getTime();
        });

        // Apply limit after sorting
        return notifications.slice(0, 50);
    }

    async getNotificationsForAdmin(): Promise<Notification[]> {
        // Fetch all notifications and filter/sort in memory to avoid index requirement
        const snapshot = await db.collection('notifications').get();
        let notifications = snapshot.docs
            .map(doc => ({ id: parseInt(doc.id), ...doc.data() } as Notification))
            .filter((notif: any) => notif.recipientType === 'admin');

        // Sort by createdAt descending in memory
        notifications.sort((a: any, b: any) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate.getTime() - aDate.getTime();
        });

        // Apply limit after sorting
        return notifications.slice(0, 50);
    }

    async getUnreadCountForMerchant(merchantId: number): Promise<number> {
        // Fetch all notifications and filter in memory to avoid index requirement
        const snapshot = await db.collection('notifications').get();
        const unreadCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.recipientType === 'merchant' &&
                data.recipientId === merchantId &&
                data.isRead === false;
        }).length;
        return unreadCount;
    }

    async getUnreadCountForAdmin(): Promise<number> {
        // Fetch all notifications and filter in memory to avoid index requirement
        const snapshot = await db.collection('notifications').get();
        const unreadCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.recipientType === 'admin' && data.isRead === false;
        }).length;
        return unreadCount;
    }

    async markNotificationRead(id: number): Promise<void> {
        await db.collection('notifications').doc(id.toString()).update({
            isRead: true,
            readAt: FieldValue.serverTimestamp(),
        });
    }

    async markAllNotificationsRead(recipientType: string, recipientId?: number): Promise<void> {
        let query = db.collection('notifications')
            .where('recipientType', '==', recipientType)
            .where('isRead', '==', false);

        if (recipientId) {
            query = query.where('recipientId', '==', recipientId);
        }

        const snapshot = await query.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true, readAt: FieldValue.serverTimestamp() });
        });
        await batch.commit();
    }

    // ========== Product Options ==========
    async getProductOption(id: number): Promise<ProductOption | undefined> {
        // Search across all products' options subcollections
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const optionDoc = await productDoc.ref.collection('options').doc(id.toString()).get();
            if (optionDoc.exists) {
                return { id: parseInt(optionDoc.id), ...optionDoc.data() } as ProductOption;
            }
        }
        return undefined;
    }

    async getProductOptions(productId: number): Promise<ProductOption[]> {
        const snapshot = await db.collection('products')
            .doc(productId.toString())
            .collection('options')
            .orderBy('sortOrder', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as ProductOption));
    }

    async getProductOptionChoices(optionId: number): Promise<ProductOptionChoice[]> {
        // Find the option first to get the product
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const optionDoc = productDoc.ref.collection('options').doc(optionId.toString());
            const choicesSnapshot = await optionDoc.collection('choices').orderBy('sortOrder', 'asc').get();
            if (!choicesSnapshot.empty) {
                return choicesSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as ProductOptionChoice));
            }
        }
        return [];
    }

    async createProductOption(option: InsertProductOption): Promise<ProductOption> {
        const docRef = db.collection('products')
            .doc(option.productId.toString())
            .collection('options')
            .doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = { ...option, id };
        await docRef.set(data);
        return data as ProductOption;
    }

    async updateProductOption(id: number, option: Partial<InsertProductOption>): Promise<void> {
        // Find and update the option
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const optionRef = productDoc.ref.collection('options').doc(id.toString());
            const optionDoc = await optionRef.get();
            if (optionDoc.exists) {
                await optionRef.update(option);
                return;
            }
        }
    }

    async deleteProductOption(id: number): Promise<void> {
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const optionRef = productDoc.ref.collection('options').doc(id.toString());
            const optionDoc = await optionRef.get();
            if (optionDoc.exists) {
                await optionRef.delete();
                return;
            }
        }
    }

    async createProductOptionChoice(choice: InsertProductOptionChoice): Promise<ProductOptionChoice> {
        // Find the product containing this option
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const optionRef = productDoc.ref.collection('options').doc(choice.optionId.toString());
            const optionDoc = await optionRef.get();
            if (optionDoc.exists) {
                const choiceRef = optionRef.collection('choices').doc();
                const id = parseInt(choiceRef.id.slice(0, 10), 36);
                const data = { ...choice, id };
                await choiceRef.set(data);
                return data as ProductOptionChoice;
            }
        }
        throw new Error('Option not found');
    }

    async deleteProductOptionChoices(optionId: number): Promise<void> {
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const optionRef = productDoc.ref.collection('options').doc(optionId.toString());
            const choicesSnapshot = await optionRef.collection('choices').get();
            if (!choicesSnapshot.empty) {
                const batch = db.batch();
                choicesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                return;
            }
        }
    }

    async deleteAllProductOptions(productId: number): Promise<void> {
        const optionsSnapshot = await db.collection('products')
            .doc(productId.toString())
            .collection('options')
            .get();

        const batch = db.batch();
        for (const optionDoc of optionsSnapshot.docs) {
            // Delete all choices first
            const choicesSnapshot = await optionDoc.ref.collection('choices').get();
            choicesSnapshot.docs.forEach(choiceDoc => batch.delete(choiceDoc.ref));
            // Then delete the option
            batch.delete(optionDoc.ref);
        }
        await batch.commit();
    }

    // ========== Order Option Selections ==========
    async getOrderOptionSelections(orderId: number): Promise<OrderOptionSelection[]> {
        const snapshot = await db.collection('orders')
            .doc(orderId.toString())
            .collection('optionSelections')
            .get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as OrderOptionSelection));
    }

    async createOrderOptionSelection(selection: InsertOrderOptionSelection): Promise<OrderOptionSelection> {
        const docRef = db.collection('orders')
            .doc(selection.orderId.toString())
            .collection('optionSelections')
            .doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = { ...selection, id };
        await docRef.set(data);
        return data as OrderOptionSelection;
    }

    // ========== Discount Codes ==========
    async getDiscountCode(id: number): Promise<DiscountCode | undefined> {
        const doc = await db.collection('discountCodes').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as DiscountCode;
    }

    async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
        const snapshot = await db.collection('discountCodes')
            .where('code', '==', code.toUpperCase())
            .limit(1)
            .get();
        if (snapshot.empty) return undefined;
        const doc = snapshot.docs[0];
        return { id: parseInt(doc.id), ...doc.data() } as DiscountCode;
    }

    async getAllDiscountCodes(): Promise<DiscountCode[]> {
        const snapshot = await db.collection('discountCodes').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() } as DiscountCode));
    }

    async createDiscountCode(discountCode: InsertDiscountCode): Promise<DiscountCode> {
        const docRef = db.collection('discountCodes').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...discountCode,
            id,
            code: discountCode.code.toUpperCase(),
            usedCount: 0,
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as DiscountCode;
    }

    async updateDiscountCode(id: number, discountCode: Partial<InsertDiscountCode>): Promise<void> {
        const updateData: any = { ...discountCode };
        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
        }
        await db.collection('discountCodes').doc(id.toString()).update(updateData);
    }

    async deleteDiscountCode(id: number): Promise<void> {
        await db.collection('discountCodes').doc(id.toString()).delete();
    }

    async incrementDiscountCodeUsage(id: number): Promise<void> {
        await db.collection('discountCodes').doc(id.toString()).update({
            usedCount: FieldValue.increment(1),
        });
    }
}

export const firebaseStorage = new FirebaseStorage();
