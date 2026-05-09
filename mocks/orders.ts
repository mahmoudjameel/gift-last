import { Order, MerchantStats } from '@/types';

export const orders: Order[] = [];

export const customerOrders: Order[] = [];

export const merchantStats: MerchantStats = {
  totalRevenue: 0,
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  avgRating: 0,
  totalProducts: 0,
  monthlyGrowth: 0,
};
