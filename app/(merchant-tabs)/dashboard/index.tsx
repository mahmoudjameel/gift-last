import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BadgeDollarSign,
  Wallet,
  Boxes,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

const statusColors: Record<string, { bg: string; text: string; labelAr: string; labelEn: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF', labelAr: 'قيد التجهيز', labelEn: 'Confirmed' },
  delivered: { bg: '#D1FAE5', text: '#065F46', labelAr: 'تم التسليم', labelEn: 'Delivered' },
  completed: { bg: '#A7F3D0', text: '#047857', labelAr: 'مكتمل', labelEn: 'Completed' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', labelAr: 'ملغي', labelEn: 'Cancelled' },
};

export default function DashboardScreen() {
  const { colors, t, user, storeInfo, language, isRTL, merchantOrders, walletBalance, merchantProducts, merchantStatus } = useApp();
  const router = useRouter();
  const recentOrders = useMemo(() => merchantOrders.slice(0, 5), [merchantOrders]);

  const liveStats = useMemo(() => {
    const totalOrders = merchantOrders.length;
    const pendingOrders = merchantOrders.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'confirmed').length;
    const completedOrders = merchantOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const totalRevenue = merchantOrders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
    const totalProducts = merchantProducts.length;
    return { totalOrders, pendingOrders, completedOrders, totalRevenue, totalProducts };
  }, [merchantOrders, merchantProducts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (language === 'ar') {
      return hour < 12 ? 'صباح الخير' : 'مساء الخير';
    }
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [language]);

  const shortenOrderId = (oid: string) => {
    if (!oid) return '';
    const cleanId = oid.replace(/[^a-zA-Z0-9]/g, '');
    return cleanId.slice(-5).toUpperCase();
  };

  const storeName = storeInfo?.name ?? user?.storeName ?? (language === 'ar' ? 'متجرك' : 'Your Store');

  const statsCards = useMemo(() => [
    {
      icon: BadgeDollarSign,
      iconBg: 'rgba(217,21,104,0.1)',
      iconColor: '#D91568',
      title: t('totalSales'),
      value: `${liveStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('sar')}`,
      subtitle: t('totalSalesCompleted'),
    },
    {
      icon: Wallet,
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      title: t('currentBalance'),
      value: `${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('sar')}`,
      subtitle: t('availableForWithdraw'),
    },
    {
      icon: Boxes,
      iconBg: '#F0FDF4',
      iconColor: '#10B981',
      title: t('totalProducts'),
      value: `${liveStats.totalProducts}`,
      subtitle: t('productsInStore'),
    },
    {
      icon: ShoppingBag,
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B',
      title: t('totalOrders'),
      value: `${liveStats.totalOrders}`,
      subtitle: `${liveStats.pendingOrders} ${t('pendingOrdersCount')}`,
    },
  ], [t, walletBalance, liveStats]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerRight}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting} 👋</Text>
            <Text style={[styles.userName, { color: colors.primary }]}>{storeName}</Text>
          </View>
        </View>

        {merchantStatus === 'pending' && (
          <View style={[styles.pendingBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <View style={styles.pendingIconRow}>
              <Clock size={20} color="#92400E" />
              <Text style={styles.pendingTitle}>
                {language === 'ar' ? 'طلبك قيد المراجعة' : 'Your request is under review'}
              </Text>
            </View>
            <Text style={styles.pendingSubtitle}>
              {language === 'ar' 
                ? 'يتم مراجعة بيانات متجرك حالياً. بمجرد الموافقة، ستظهر منتجاتك للعملاء.' 
                : 'Your store data is being reviewed. Once approved, your products will be visible to customers.'}
            </Text>
          </View>
        )}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <TrendingUp size={20} color={colors.primary} />
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('overviewTitle')}</Text>
          </View>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('overviewSubtitle')}</Text>
        </View>

        <View style={styles.statsGrid}>
          {statsCards.map((card, index) => {
            const IconComp = card.icon;
            return (
              <View
                key={index}
                style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
              >
                <View style={[styles.statIconWrap, { backgroundColor: card.iconBg }]}>
                  <IconComp size={20} color={card.iconColor} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{card.title}</Text>
                <Text style={[styles.statSubtitle, { color: colors.textMuted }]}>{card.subtitle}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.ordersSection, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <View style={styles.ordersSectionHeader}>
            <View style={styles.ordersTitleWrap}>
              <Text style={[styles.ordersTitle, { color: colors.text }]}>{t('latestOrders')}</Text>
              <Text style={[styles.ordersSubtitle, { color: colors.textSecondary }]}>{t('latestOrdersSubtitle')}</Text>
            </View>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/(merchant-tabs)/orders' as any)}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('viewAll')}</Text>
              {isRTL ? <ChevronLeft size={16} color={colors.primary} /> : <ChevronRight size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <ShoppingBag size={32} color={colors.textMuted} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textMuted }}>{t('noOrders')}</Text>
            </View>
          ) : recentOrders.map((order, index) => {
            const statusStyle = statusColors[order.status] || statusColors.pending;
            return (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.orderItem,
                  index < recentOrders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                ]}
                activeOpacity={0.7}
                onPress={() => router.push(`/(merchant-tabs)/orders/${order.id}` as any)}
              >
                <View style={[styles.orderIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <ShoppingBag size={18} color={colors.primary} />
                </View>
                <View style={styles.orderItemRight}>
                  <View style={styles.orderNumberRow}>
                    <Text style={[styles.orderLabel, { color: colors.textSecondary }]}>طلب #-</Text>
                    <Text style={[styles.orderNumber, { color: colors.text }]}>{shortenOrderId(order.orderNumber)}</Text>
                  </View>
                  <Text style={[styles.orderDate, { color: colors.textMuted }]}>{order.date}</Text>
                </View>
                <View style={styles.orderItemLeft}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{language === 'ar' ? statusStyle.labelAr : statusStyle.labelEn}</Text>
                  </View>
                  <Text style={[styles.orderPrice, { color: colors.text }]}>{order.total.toFixed(2)}</Text>
                  <Text style={[styles.orderCurrency, { color: colors.textMuted }]}>{t('sar')}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerRight: { alignItems: 'flex-start' },
  greeting: { fontSize: 13 },
  userName: { fontSize: 20, fontWeight: '700' as const, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20 },
  titleSection: {
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    width: '48.5%' as any,
    alignItems: 'flex-start',
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  statSubtitle: {
    fontSize: 11,
    fontWeight: '400' as const,
    marginTop: 2,
  },
  ordersSection: {
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
  },
  ordersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ordersTitleWrap: {
    alignItems: 'flex-start',
    flex: 1,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  ordersSubtitle: {
    fontSize: 12,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  seeAllText: { fontSize: 14, fontWeight: '500' as const },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  orderItemLeft: {
    alignItems: 'flex-start',
    minWidth: 90,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  orderPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  orderCurrency: {
    fontSize: 11,
    fontWeight: '400' as const,
  },
  orderItemRight: {
    flex: 1,
    alignItems: 'flex-start',
    marginHorizontal: 10,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  orderLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  orderDate: {
    fontSize: 11,
    marginTop: 4,
  },
  orderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  pendingIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingSubtitle: {
    fontSize: 13,
    color: '#92400E',
    opacity: 0.8,
    lineHeight: 18,
    textAlign: 'left',
  },
});
