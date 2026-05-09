import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ShoppingBag,
  PackageCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Order } from '@/types';

type OrderTab = 'current' | 'completed' | 'cancelled';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return '#22C55E';
    case 'completed': return '#10B981';
    case 'cancelled': return '#EF4444';
    case 'not_received': return '#F97316';
    case 'pending': return '#F59E0B';
    case 'processing': return '#3B82F6';
    case 'preparing': return '#8B5CF6';
    case 'ready': return '#EC4899';
    default: return '#9CA3AF';
  }
};

const CURRENT_STATUSES = ['pending', 'processing', 'preparing', 'ready', 'confirmed', 'delivered', 'not_received'];

export default function MerchantOrdersScreen() {
  const { colors, t, language, merchantOrders, refreshMerchantData, getStatusLabel } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OrderTab>('current');

  React.useEffect(() => {
    refreshMerchantData();
  }, []);

  const getStatusText = useCallback((status: string) => {
    return getStatusLabel(status as any, language);
  }, [getStatusLabel, language]);

  const shortenOrderId = (oid: string) => {
    if (!oid) return '';
    const cleanId = oid.replace(/[^a-zA-Z0-9]/g, '');
    return cleanId.slice(-5).toUpperCase();
  };

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'current':
        return merchantOrders.filter(o => CURRENT_STATUSES.includes(o.status));
      case 'completed':
        return merchantOrders.filter(o => o.status === 'completed');
      case 'cancelled':
        return merchantOrders.filter(o => o.status === 'cancelled');
      default:
        return merchantOrders;
    }
  }, [activeTab, merchantOrders]);

  const tabCounts = useMemo(() => ({
    current: merchantOrders.filter(o => CURRENT_STATUSES.includes(o.status)).length,
    completed: merchantOrders.filter(o => o.status === 'completed').length,
    cancelled: merchantOrders.filter(o => o.status === 'cancelled').length,
  }), [merchantOrders]);

  const keyExtractor = useCallback((item: Order) => item.id, []);

  const tabs = useMemo<{ key: OrderTab; label: string; count: number }[]>(() => [
    { key: 'current', label: t('currentOrders'), count: tabCounts.current },
    { key: 'completed', label: t('completedOrders'), count: tabCounts.completed },
    { key: 'cancelled', label: t('cancelledOrders'), count: tabCounts.cancelled },
  ], [t, tabCounts]);

  const renderOrder = useCallback(({ item }: { item: Order }) => {
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => router.push(`/(merchant-tabs)/orders/${item.id}` as any)}
      >
        <View style={[styles.orderCardBg, { backgroundColor: getStatusColor(item.status) }]}>
          <View style={styles.orderCardOverlay} />
          <View style={styles.orderCardContent}>
            <View style={styles.orderCardImageWrap}>
              {item.productImage ? (
                <Image source={{ uri: item.productImage }} style={styles.orderCardImage} contentFit="cover" />
              ) : (
                <View style={[styles.orderCardImage, { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }]}>
                  <ShoppingBag size={24} color="#FFF" />
                </View>
              )}
            </View>
            <View style={styles.orderCardInfo}>
              <View style={styles.orderCardTopRow}>
                <View style={[styles.orderStatusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.orderStatus, { color: '#FFF' }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
                <Text style={styles.orderCardNumber}>{shortenOrderId(item.orderNumber)}</Text>
              </View>
              <Text style={styles.orderCardProduct} numberOfLines={1}>{item.productName}</Text>
              <View style={styles.orderCardBottom}>
                <Text style={styles.orderCardDate}>{item.date}</Text>
                <Text style={styles.orderCardPrice}>{item.total} {t('sar')}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, t, router, getStatusText]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }} />

      <FlatList
        data={filteredOrders}
        keyExtractor={keyExtractor}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('orders')}</Text>
            </View>
            <View style={styles.tabsContainer}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[
                      styles.tabItem,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderLight },
                    ]}
                  >
                    <Text style={[
                      styles.tabLabel,
                      { color: isActive ? '#FFF' : colors.textMuted },
                    ]}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 && (
                      <View style={[styles.tabBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.borderLight }]}>
                        <Text style={[styles.tabBadgeText, { color: isActive ? '#FFF' : colors.textMuted }]}>{tab.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.borderLight }]}>
              <PackageCheck size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noOrders')}</Text>
          </View>
        }
      />
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
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' as const },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabLabel: { fontSize: 14, fontWeight: '600' as const },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700' as const },
  listContent: { padding: 20, paddingBottom: 110 },
  orderCard: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  orderCardBg: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  orderCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 18,
  },
  orderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  orderCardImageWrap: {},
  orderCardImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  orderCardInfo: {
    flex: 1,
    gap: 6,
  },
  orderCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatus: { fontSize: 11, fontWeight: '600' },
  orderCardProduct: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  orderCardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 16 },
});
