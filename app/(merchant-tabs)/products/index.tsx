import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Search, PenLine, EyeOff, Eye, Trash2, PackageOpen, X, Package, TrendingUp, EyeOffIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Product } from '@/types';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import SuccessToast from '@/components/SuccessToast';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

export default function MerchantProductsScreen() {
  const { colors, t, language, isRTL, merchantProducts, categories, updateProduct: ctxUpdateProduct, deleteProduct: ctxDeleteProduct } = useApp();
  const router = useRouter();
  const [productList, setProductList] = useState<Product[]>(merchantProducts);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setProductList(merchantProducts);
  }, [merchantProducts]);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'confirm', message: '' });
  const dismissAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMsg, setSuccessToastMsg] = useState('');

  const filteredProducts = useMemo(() => {
    let result = productList;
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory || p.categoryEn === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q));
    }
    return result;
  }, [productList, searchQuery, selectedCategory]);

  const toggleVisibility = useCallback((id: string) => {
    const product = productList.find(p => p.id === id);
    const willHide = product && !product.isHidden;
    setAlertConfig({
      visible: true,
      type: 'confirm',
      title: willHide ? t('hideProduct') : t('showProduct'),
      message: language === 'ar'
        ? (willHide ? 'هل أنت متأكد من إخفاء هذا المنتج؟' : 'هل أنت متأكد من إظهار هذا المنتج؟')
        : (willHide ? 'Are you sure you want to hide this product?' : 'Are you sure you want to show this product?'),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'default',
          onPress: () => {
            ctxUpdateProduct(id, { isHidden: !product?.isHidden });
            setSuccessToastMsg(willHide ? t('productHidden') : t('productShown'));
            setShowSuccessToast(true);
          },
        },
      ],
    });
  }, [productList, t, language]);

  const deleteProduct = useCallback((id: string) => {
    setAlertConfig({
      visible: true,
      type: 'confirm',
      title: t('deleteProduct'),
      message: language === 'ar' ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?',
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            ctxDeleteProduct(id);
            setSuccessToastMsg(t('productDeleted'));
            setShowSuccessToast(true);
          },
        },
      ],
    });
  }, [t, language]);

  const catFilters = useMemo(() => {
    const systemCats = categories
      .filter(c => c.id !== '0')
      .map(c => language === 'ar' ? c.name : c.nameEn);
    return [{ key: 'all', label: language === 'ar' ? 'الكل' : 'All' }, ...systemCats.map(c => ({ key: c, label: c }))];
  }, [categories, language]);

  const stats = useMemo(() => {
    const total = productList.length;
    const active = productList.filter(p => !p.isHidden).length;
    const hidden = productList.filter(p => p.isHidden).length;
    return { total, active, hidden };
  }, [productList]);

  const getStockColor = (stock: number) => {
    if (stock > 10) return '#10B981';
    if (stock > 0) return '#F59E0B';
    return '#EF4444';
  };

  const getStockLabel = (stock: number) => {
    if (stock > 10) return language === 'ar' ? 'متوفر' : 'In Stock';
    if (stock > 0) return language === 'ar' ? 'كمية قليلة' : 'Low Stock';
    return language === 'ar' ? 'نفذ' : 'Out of Stock';
  };

  const renderProduct = useCallback(({ item }: { item: Product }) => {
    const displayName = language === 'ar' ? item.name : item.nameEn;
    const stockColor = getStockColor(item.stock);

    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.card, width: CARD_WIDTH }]}
        activeOpacity={0.85}
        onPress={() => router.push(`/(merchant-tabs)/products/edit-product?productId=${item.id}` as any)}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} contentFit="cover" />
          {item.isHidden && (
            <View style={styles.hiddenOverlay}>
              <EyeOff size={20} color="#FFF" />
            </View>
          )}
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
            <View style={[styles.stockDotBig, { backgroundColor: stockColor }]} />
            <Text style={[styles.stockBadgeText, { color: stockColor }]}>{getStockLabel(item.stock)}</Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
          <View style={styles.priceRow}>
            <View style={[styles.qtyBadge, { backgroundColor: colors.borderLight }]}>
              <Text style={[styles.qtyText, { color: colors.textSecondary }]}>{item.stock}</Text>
            </View>
            <Text style={[styles.productPrice, { color: colors.primary }]}>{item.price} {t('sar')}</Text>
          </View>
        </View>

        <View style={[styles.actionBar, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity style={styles.actionBtnItem} onPress={() => deleteProduct(item.id)}>
            <Trash2 size={15} color="#EF4444" />
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity style={styles.actionBtnItem} onPress={() => toggleVisibility(item.id)}>
            {item.isHidden ? <Eye size={15} color={colors.text} /> : <EyeOff size={15} color={colors.textMuted} />}
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity
            style={styles.actionBtnItem}
            onPress={() => router.push(`/(merchant-tabs)/products/edit-product?productId=${item.id}` as any)}
          >
            <PenLine size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors, t, language, toggleVisibility, deleteProduct, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }} />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderProduct}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerRight}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('products')}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                testID="add-product-btn"
                onPress={() => router.push('/(merchant-tabs)/products/add-product' as any)}
              >
                <LinearGradient
                  colors={['#E88AAE', '#D4709A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addButtonGradient}
                >
                  <Plus size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconWrap, { backgroundColor: '#3B82F610' }]}>
                  <Package size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('all')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconWrap, { backgroundColor: '#10B98110' }]}>
                  <TrendingUp size={16} color="#10B981" />
                </View>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('active')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconWrap, { backgroundColor: '#F59E0B10' }]}>
                  <EyeOff size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.hidden}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('hidden')}</Text>
              </View>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('searchProducts')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlign={isRTL ? 'right' : 'left'}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catFilterList}
            >
              {catFilters.map((item) => {
                const isActive = selectedCategory === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setSelectedCategory(item.key)}
                    style={[
                      styles.catChip,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.card, borderColor: colors.borderLight, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.catChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.borderLight }]}>
              <PackageOpen size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              {language === 'ar' ? 'أضف منتجك الأول للبدء' : 'Add your first product to get started'}
            </Text>
          </View>
        }
      />
      <GlassAlert {...alertConfig} onDismiss={dismissAlert} />
      <SuccessToast
        visible={showSuccessToast}
        message={successToastMsg}
        onDismiss={() => setShowSuccessToast(false)}
        autoDismissMs={2000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerRight: { alignItems: 'flex-start' },
  headerTitle: { fontSize: 24, fontWeight: '800' as const },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800' as const },
  statLabel: { fontSize: 11, fontWeight: '500' as const },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  catFilterList: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catChipText: { fontSize: 13, fontWeight: '600' as const },
  listContent: { padding: 20, paddingBottom: 110 },
  productRow: { gap: 12, marginBottom: 12 },
  productCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 1,
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%' },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockDotBig: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  productInfo: { padding: 12 },
  productName: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: { fontSize: 16, fontWeight: '800' as const },
  qtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtnItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
  },
});
