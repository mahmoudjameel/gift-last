import { z } from "zod";

// ========== Merchant Types ==========
export interface Merchant {
  id: number;
  ownerName: string;
  storeName: string;
  username: string;
  bio?: string | null;
  email: string;
  mobile: string;
  password: string;
  storeType: string;
  category: string;
  city: string;
  registrationNumber: string;
  commercialRegistrationDoc?: string | null;
  nationalIdImage?: string | null;
  freelanceCertificateImage?: string | null;
  deliveryMethod: string;
  branches?: { name: string; mapLink: string }[] | null;
  status: string;
  storeImage?: string | null;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
    tiktok?: string;
    snapchat?: string;
  } | null;
  bankName?: string | null;
  iban?: string | null;
  accountHolderName?: string | null;
  balance: number;
  createdAt: Date;
}

export const insertMerchantSchema = z.object({
  ownerName: z.string(),
  storeName: z.string(),
  username: z.string().regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().optional().nullable(),
  email: z.string().email(),
  mobile: z.string().min(9),
  password: z.string().min(6),
  storeType: z.string(),
  category: z.string(),
  city: z.string(),
  registrationNumber: z.string(),
  commercialRegistrationDoc: z.string().optional().nullable(),
  nationalIdImage: z.string().optional().nullable(),
  freelanceCertificateImage: z.string().optional().nullable(),
  deliveryMethod: z.string(),
  branches: z.array(z.object({ name: z.string(), mapLink: z.string() })).optional().nullable(),
  storeImage: z.string().optional().nullable(),
  socialLinks: z.object({
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    website: z.string().optional(),
    tiktok: z.string().optional(),
    snapchat: z.string().optional(),
  }).optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  accountHolderName: z.string().optional().nullable(),
});

export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

// ========== Product Types ==========
export interface Product {
  id: number;
  merchantId: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  productType: string;
  category: string;
  promoBadge?: string | null;
  images?: string[] | null;
  status: string;
  createdAt: Date;
}

export const insertProductSchema = z.object({
  merchantId: z.number(),
  name: z.string(),
  description: z.string().optional().nullable(),
  price: z.number(),
  stock: z.number().default(0),
  productType: z.string().default("gifts"),
  category: z.string(),
  promoBadge: z.string().optional().nullable(),
  images: z.array(z.string()).optional().default([]),
  status: z.string().default("active"),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

// ========== Customer Types ==========
export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  mobile: string;
  city?: string | null;
  createdAt: Date;
}

export const insertCustomerSchema = z.object({
  name: z.string(),
  email: z.string().email().optional().nullable(),
  mobile: z.string(),
  city: z.string().optional().nullable(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// ========== Order Types ==========
export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  merchantId: number;
  productId: number;
  quantity: number;
  totalAmount: number;
  status: string;
  customerNote?: string | null;
  deliveryAddress?: string | null;
  deliveryMethod: string;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const insertOrderSchema = z.object({
  orderNumber: z.string(),
  customerId: z.number(),
  merchantId: z.number(),
  productId: z.number(),
  quantity: z.number().default(1),
  totalAmount: z.number(),
  status: z.string().default("pending"),
  customerNote: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryMethod: z.string(),
  isPaid: z.boolean().default(false),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

// ========== Order Message Types ==========
export interface OrderMessage {
  id: number;
  orderId: number;
  senderId: number;
  senderType: string;
  message: string;
  createdAt: Date;
}

export const insertOrderMessageSchema = z.object({
  orderId: z.number(),
  senderId: z.number(),
  senderType: z.string(),
  message: z.string(),
});

export type InsertOrderMessage = z.infer<typeof insertOrderMessageSchema>;

// ========== Review Types ==========
export interface Review {
  id: number;
  orderId: number;
  customerId: number;
  productId: number;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

export const insertReviewSchema = z.object({
  orderId: z.number(),
  customerId: z.number(),
  productId: z.number(),
  rating: z.number(),
  comment: z.string().optional().nullable(),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;

// ========== Transaction Types ==========
export interface Transaction {
  id: number;
  merchantId: number;
  orderId?: number | null;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: Date;
}

export const insertTransactionSchema = z.object({
  merchantId: z.number(),
  orderId: z.number().optional().nullable(),
  type: z.string(),
  amount: z.number(),
  status: z.string().default("completed"),
  description: z.string(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// ========== Admin Types ==========
export interface Admin {
  id: number;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

export const insertAdminSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;

// ========== Banner Types ==========
export interface Banner {
  id: number;
  title: string;
  image: string;
  link?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export const insertBannerSchema = z.object({
  title: z.string(),
  image: z.string(),
  link: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;

// ========== Category Types ==========
export interface Category {
  id: number;
  name: string;
  nameEn?: string | null;
  icon?: string | null;
  image?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export const insertCategorySchema = z.object({
  name: z.string(),
  nameEn: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;

// ========== City Types ==========
export interface City {
  id: number;
  name: string;
  nameEn?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export const insertCitySchema = z.object({
  name: z.string(),
  nameEn: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export type InsertCity = z.infer<typeof insertCitySchema>;

// ========== App Setting Types ==========
export interface AppSetting {
  id: number;
  key: string;
  value?: string | null;
  valueJson?: any;
  updatedAt: Date;
}

export const insertAppSettingSchema = z.object({
  key: z.string(),
  value: z.string().optional().nullable(),
  valueJson: z.any().optional(),
});

export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// ========== Notification Types ==========
export interface Notification {
  id: number;
  recipientType: string;
  recipientId?: number | null;
  title: string;
  body: string;
  actionType: string;
  actionRef?: Record<string, any> | null;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date | null;
}

export const insertNotificationSchema = z.object({
  recipientType: z.string(),
  recipientId: z.number().optional().nullable(),
  title: z.string(),
  body: z.string(),
  actionType: z.string(),
  actionRef: z.record(z.any()).optional().nullable(),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// ========== Product Option Types ==========
export interface ProductOption {
  id: number;
  productId: number;
  type: string;
  title: string;
  placeholder?: string | null;
  required: boolean;
  sortOrder: number;
}

export const insertProductOptionSchema = z.object({
  productId: z.number(),
  type: z.string(),
  title: z.string(),
  placeholder: z.string().optional().nullable(),
  required: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export type InsertProductOption = z.infer<typeof insertProductOptionSchema>;

// ========== Product Option Choice Types ==========
export interface ProductOptionChoice {
  id: number;
  optionId: number;
  label: string;
  sortOrder: number;
}

export const insertProductOptionChoiceSchema = z.object({
  optionId: z.number(),
  label: z.string(),
  sortOrder: z.number().default(0),
});

export type InsertProductOptionChoice = z.infer<typeof insertProductOptionChoiceSchema>;

// ========== Order Option Selection Types ==========
export interface OrderOptionSelection {
  id: number;
  orderId: number;
  optionId: number;
  choiceId?: number | null;
  textValue?: string | null;
  booleanValue?: boolean | null;
}

export const insertOrderOptionSelectionSchema = z.object({
  orderId: z.number(),
  optionId: z.number(),
  choiceId: z.number().optional().nullable(),
  textValue: z.string().optional().nullable(),
  booleanValue: z.boolean().optional().nullable(),
});

export type InsertOrderOptionSelection = z.infer<typeof insertOrderOptionSelectionSchema>;

// ========== Discount Code Types ==========
export interface DiscountCode {
  id: number;
  code: string;
  type: string;
  value: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
}

export const insertDiscountCodeSchema = z.object({
  code: z.string(),
  type: z.string(),
  value: z.number(),
  minOrderAmount: z.number().optional().nullable(),
  maxUses: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
  expiresAt: z.date().optional().nullable(),
});

export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
