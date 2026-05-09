// Storage interface and Firebase implementation
import { firebaseStorage } from './firebaseStorage';
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

export interface IStorage {
  // Merchants
  getMerchant(id: number): Promise<Merchant | undefined>;
  getMerchantByEmail(email: string): Promise<Merchant | undefined>;
  getMerchantByPhone(phone: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: number, data: Partial<Merchant>): Promise<void>;
  updateMerchantStatus(id: number, status: string): Promise<void>;
  updateMerchantBalance(id: number, amount: number): Promise<void>;
  getAllMerchants(): Promise<Merchant[]>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByMerchant(merchantId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<void>;
  deleteProduct(id: number): Promise<void>;

  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByMerchant(merchantId: number): Promise<Order[]>;
  getOrdersByCustomer(customerId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<void>;
  updateOrderPaid(id: number, isPaid: boolean): Promise<void>;

  // Order Messages
  getMessagesByOrder(orderId: number): Promise<OrderMessage[]>;
  createMessage(message: InsertOrderMessage): Promise<OrderMessage>;

  // Reviews
  getReviewsByProduct(productId: number): Promise<Review[]>;
  getReviewsByMerchant(merchantId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Transactions
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getTransactionsByMerchant(merchantId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<void>;
  getPendingWithdrawals(): Promise<Transaction[]>;

  // Admins
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAllAdmins(): Promise<Admin[]>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  deleteAdmin(id: number): Promise<void>;
  updateAdminPassword(id: number, password: string): Promise<void>;

  // Banners
  getBanner(id: number): Promise<Banner | undefined>;
  getAllBanners(): Promise<Banner[]>;
  getActiveBanners(): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number, banner: Partial<InsertBanner>): Promise<void>;
  deleteBanner(id: number): Promise<void>;

  // Categories
  getCategory(id: number): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  getActiveCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<void>;
  deleteCategory(id: number): Promise<void>;

  // Cities
  getCity(id: number): Promise<City | undefined>;
  getAllCities(): Promise<City[]>;
  getActiveCities(): Promise<City[]>;
  createCity(city: InsertCity): Promise<City>;
  updateCity(id: number, city: Partial<InsertCity>): Promise<void>;
  deleteCity(id: number): Promise<void>;

  // App Settings
  getSetting(key: string): Promise<AppSetting | undefined>;
  getAllSettings(): Promise<AppSetting[]>;
  setSetting(key: string, value?: string, valueJson?: any): Promise<AppSetting>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsForMerchant(merchantId: number): Promise<Notification[]>;
  getNotificationsForAdmin(): Promise<Notification[]>;
  getUnreadCountForMerchant(merchantId: number): Promise<number>;
  getUnreadCountForAdmin(): Promise<number>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(recipientType: string, recipientId?: number): Promise<void>;

  // Product Options
  getProductOption(id: number): Promise<ProductOption | undefined>;
  getProductOptions(productId: number): Promise<ProductOption[]>;
  getProductOptionChoices(optionId: number): Promise<ProductOptionChoice[]>;
  createProductOption(option: InsertProductOption): Promise<ProductOption>;
  updateProductOption(id: number, option: Partial<InsertProductOption>): Promise<void>;
  deleteProductOption(id: number): Promise<void>;
  createProductOptionChoice(choice: InsertProductOptionChoice): Promise<ProductOptionChoice>;
  deleteProductOptionChoices(optionId: number): Promise<void>;
  deleteAllProductOptions(productId: number): Promise<void>;

  // Order Option Selections
  getOrderOptionSelections(orderId: number): Promise<OrderOptionSelection[]>;
  createOrderOptionSelection(selection: InsertOrderOptionSelection): Promise<OrderOptionSelection>;

  // Discount Codes
  getDiscountCode(id: number): Promise<DiscountCode | undefined>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  getAllDiscountCodes(): Promise<DiscountCode[]>;
  createDiscountCode(discountCode: InsertDiscountCode): Promise<DiscountCode>;
  updateDiscountCode(id: number, discountCode: Partial<InsertDiscountCode>): Promise<void>;
  deleteDiscountCode(id: number): Promise<void>;
  incrementDiscountCodeUsage(id: number): Promise<void>;
}

// Export Firebase storage as the default storage implementation
export const storage = firebaseStorage;
