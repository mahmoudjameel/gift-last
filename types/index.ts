export type UserRole = 'customer' | 'merchant';
export type Language = 'ar' | 'he';
export type EntityType = 'individual' | 'institution' | 'company';
export type ReminderType = '10hours' | '2days' | '1week';

export type CustomerNotifType = 'order_status';
export type MerchantNotifType = 'new_order' | 'wallet_credit' | 'withdrawal_resolved' | 'product_low_stock' | 'product_out_of_stock';

export interface AppNotification {
  id: string;
  type: CustomerNotifType | MerchantNotifType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  targetRole: 'customer' | 'merchant';
  orderId?: string;
  productId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasStore: boolean;
  storeName?: string;
  avatar?: string;
  isMerchant?: boolean;
  isCustomer?: boolean;
  lastRole?: UserRole;
}

export interface ProductOption {
  type: 'multiple_choice' | 'text' | 'toggle';
  title: string;
  placeholder?: string;
  required: boolean;
  choices?: { label: string }[];
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  categoryEn: string;
  rating: number;
  reviewCount: number;
  shopName: string;
  shopImage: string;
  isFavorite: boolean;
  inStock: boolean;
  stock: number;
  isHidden: boolean;
  tags: string[];
  badge?: string;
  city?: string;
  storeId?: string;
  hasGiftCard?: boolean;
  giftCardFee?: number;
  sku?: string;
  options?: ProductOption[];
}

export interface GiftCardData {
  fromName: string;
  toName: string;
  message: string;
  hideIdentity: boolean;
  specialNotes: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  giftCard?: GiftCardData;
  selectedOptions?: Record<string, any>;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  image: string;
  count: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  productName: string;
  productImage?: string;
  items: {
    id?: string;
    name: string;
    quantity: number;
    price: number;
    originalPrice?: number;
    image?: string;
    selectedOptions?: Record<string, any>;
  }[];
  total: number;
  quantity: number;
  status: 'pending' | 'confirmed' | 'processing' | 'delivered' | 'completed' | 'cancelled' | 'notReceived' | 'not_received' | 'preparing' | 'ready';
  date: string;
  address: string;
  addressCoords?: { latitude: number; longitude: number };
  notes?: string;
  isPaid: boolean;
  storeName?: string;
  storeId?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryMethod?: 'branch' | 'delivery';
  branchName?: string;
  branchLocation?: string;
  deliveryLocation?: string;
  paymentMethod?: 'cash' | 'credit_card' | 'bank_transfer' | 'apple_pay' | 'stc_pay' | 'mada' | 'tabby';
  paymentStatus?: string;
  tapChargeId?: string;
  giftCard?: GiftCardData;
  giftCardFee?: number;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryOptionName?: string;
  city?: string;
  region?: string;
  customerId?: string;
  merchantId?: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  city: string;
  region: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  phone?: string;
  recipientName?: string;
  addressDetails?: string;
}

export interface MerchantStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
  avgRating: number;
  monthlyGrowth: number;
}

export type OccasionType = 'anniversary' | 'birthday' | 'ramadan' | 'eid' | 'love' | 'other';

export interface Occasion {
  id: string;
  name: string;
  type: OccasionType;
  date: string;
  reminder: ReminderType;
}

export interface ChatMessage {
  id: string;
  text: string;
  time: string;
  isMine: boolean;
  image?: string;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  messages?: ChatMessage[];
  storeId?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  createdAtMs?: number;
  status: 'completed' | 'pending' | 'failed';
}

/** Time windows for delivery; use from/to only. Optional name for older saved data. */
export interface DeliveryPeriod {
  from: string;
  to: string;
  name?: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  range: number;
  workDays: string[];
  periods: DeliveryPeriod[];
  isActive: boolean;
  city: string;
}

export interface Branch {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  googleMapsLink?: string;
  workDays: string;
  workHours: string;
  isActive: boolean;
}

export interface StoreInfo {
  name: string;
  username: string;
  entityType: EntityType;
  nationalIdUri?: string;
  freelanceDocUri?: string;
  freelanceDocNumber?: string;
  commercialRegNumber?: string;
  commercialRegUri?: string;
  /** اسم المدينة للعرض والفلترة (يُفضّل الاسم بالعربية ليتطابق مع Deliver to) */
  city: string;
  /** معرّف المدينة من قائمة saudiCities عند توفره */
  cityId?: string;
  /** موقع المتجر لحساب التوصيل والفلترة بالقرب مني */
  latitude?: number;
  longitude?: number;
  /** عنوان تفصيلي من الخريطة (يُعرض للتاجر وللعميل بدل اسم المدينة فقط) */
  locationAddress?: string;
  isOpen: boolean;
  /** عند false يخفي التوصيل للعملاء (يُحفظ في Firestore merchants) */
  deliveryEnabled?: boolean;
  /** عند false يخفي الاستلام من الفرع للعملاء */
  pickupEnabled?: boolean;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  balance?: number;
  bankName?: string;
  iban?: string;
  beneficiaryName?: string;
  storeImage?: string;
  bannerImage?: string;
}

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  accent: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
  overlay: string;
  shadow: string;
  inputBg: string;
  glass: string;
  glassBorder: string;
}
