import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MapPinned, ShoppingBag, ChevronDown, Search, ArrowRight, ArrowLeft, Crosshair, Package } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { categoryImages } from '@/mocks/categories';
import ProductCard from '@/components/ProductCard';
import {
  getCurrentLocation,
  reverseGeocodeToCity,
  reverseGeocodeToAddress,
  searchPlaces,
  getDistance,
  findNearestMajorCity,
  formatAddressAsAreaOnly,
  reverseGeocodeToAreaLabel,
  LocationCoords,
} from '@/utils/location';
import MapView, { Marker, Region } from 'react-native-maps';
import { getNativeMapProvider } from '@/utils/nativeMapProvider';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import { useMapUserLocationEnabled } from '@/hooks/useMapUserLocationEnabled';
import { JanaSearchPopup } from '@/components/JanaCharacter';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48 - 12) / 2;
/** عرض صفحة البانر = عرض الشاشة حتى يتطابق التمرير مع بطاقة واحدة في المنتصف */
const BANNER_PAGE_WIDTH = width;
const BANNER_CARD_WIDTH = width - 40;

const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function CustomerHome() {
  const { filteredProductsByCity, categories, banners, toggleFavorite, colors, t, language, isRTL, cartCount, selectedCity, setSelectedCity, deliveryDisplayLabel, isDetectingLocation, locationCity, userLocation, storesList } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [selectedCategory, setSelectedCategory] = useState<string>('0');
  const [activeBanner, setActiveBanner] = useState<number>(0);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const showUserLocationOnMap = useMapUserLocationEnabled(showMapPicker);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const bannerScrollRef = useRef<ScrollView>(null);

  const headerScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });
  const headerPaddingV = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [10, 4],
    extrapolate: 'clamp',
  });
  const searchBarHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [40, 34],
    extrapolate: 'clamp',
  });
  const searchBarMarginV = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [4, 2],
    extrapolate: 'clamp',
  });
  const categoryIconSize = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [40, 0],
    extrapolate: 'clamp',
  });
  const categoryIconOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const categoryIconMargin = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });

  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [markerCoord, setMarkerCoord] = useState<LocationCoords>({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
  const [mapAddress, setMapAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<Array<{ name: string; nameAr: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCityName = useMemo(() => {
    if (deliveryDisplayLabel) {
      const area = formatAddressAsAreaOnly(deliveryDisplayLabel, 36);
      return area || deliveryDisplayLabel;
    }
    if (selectedCity === 'all') {
      if (locationCity) return locationCity;
      return 'جدة';
    }
    return selectedCity;
  }, [deliveryDisplayLabel, selectedCity, locationCity]);

  /** مدينة الفلترة لروابط تصفح المدينة (ليست نص العنوان الطويل). */
  const browseFilterCity = useMemo(() => {
    if (selectedCity !== 'all') return selectedCity;
    if (locationCity) return locationCity;
    return 'جدة';
  }, [selectedCity, locationCity]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (activeBanner >= banners.length) setActiveBanner(0);
  }, [banners.length, activeBanner]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBanner((prev) => {
        const next = (prev + 1) % banners.length;
        // يجب أن يطابق عرض صفحة pagingEnabled (BANNER_PAGE_WIDTH) — لا تستخدم width - 40
        bannerScrollRef.current?.scrollTo({ x: next * BANNER_PAGE_WIDTH, y: 0, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const filteredProducts = useMemo(() => {
    let filtered = filteredProductsByCity;
    if (selectedCategory !== '0') {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        filtered = filtered.filter(p => p.category === cat.name || p.categoryEn === cat.nameEn);
      }
    }
    return filtered;
  }, [filteredProductsByCity, selectedCategory, categories]);

  const cityTrendingProducts = useMemo(() => filteredProductsByCity.slice(0, 10), [filteredProductsByCity]);

  const trendingCategoryProducts = useMemo(() => {
    let filtered = filteredProductsByCity;
    if (selectedCategory !== '0') {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        filtered = filtered.filter(p => p.category === cat.name || p.categoryEn === cat.nameEn);
      }
    }
    return filtered.slice(0, 10);
  }, [filteredProductsByCity, selectedCategory, categories]);

  const trendingCategoryTitle = useMemo(() => {
    if (selectedCategory !== '0') {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        return language === 'ar'
          ? `الأكثر مبيعاً من ${cat.name} في ${currentCityName}`
          : `${cat.nameEn} הנמכרים ביותר ב${currentCityName}`;
      }
    }
    return language === 'ar'
      ? `الأكثر مبيعاً في ${currentCityName}`
      : `הנמכרים ביותר ב${currentCityName}`;
  }, [selectedCategory, language, categories, currentCityName]);

  const mixedProductsSectionTitle = useMemo(() => {
    if (selectedCategory !== '0') {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        return language === 'ar' ? `${cat.name} في ${currentCityName}` : `${cat.nameEn} in ${currentCityName}`;
      }
    }
    return language === 'ar' ? `منتجات منوعة في ${currentCityName}` : `Mixed Products in ${currentCityName}`;
  }, [selectedCategory, currentCityName, language, categories]);

  const mixedCityProducts = useMemo(() => {
    let filtered = filteredProductsByCity;
    if (selectedCategory !== '0') {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        filtered = filtered.filter(p => p.category === cat.name || p.categoryEn === cat.nameEn);
      }
    }
    return filtered.slice(0, 20);
  }, [filteredProductsByCity, selectedCategory, categories]);

  const cityStores = useMemo(() => {
    const base = [...storesList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const list = base.map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo,
      image: s.banner || s.logo,
      city: s.city,
      rating: s.rating,
      reviewCount: s.reviewCount,
      isOpen: s.isOpen,
      categories:
        formatAddressAsAreaOnly(s.locationAddress || '', 40) ||
        s.description ||
        s.city,
    }));
    return list.slice(0, 8);
  }, [storesList]);

  const handleToggleFavorite = useCallback(
    (id: string) => toggleFavorite(id),
    [toggleFavorite]
  );

  const handleBannerScroll = useCallback((event: any) => {
    if (banners.length === 0) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.min(
      banners.length - 1,
      Math.max(0, Math.round(offsetX / BANNER_PAGE_WIDTH))
    );
    setActiveBanner(index);
  }, [banners.length]);

  const getCityLabel = useCallback(() => {
    if (isDetectingLocation && selectedCity === 'all') return t('detectingLocation');
    if (deliveryDisplayLabel) {
      const area = formatAddressAsAreaOnly(deliveryDisplayLabel, 34);
      return area || deliveryDisplayLabel;
    }
    if (selectedCity === 'all') {
      if (locationCity) return locationCity;
      return t('allCities');
    }
    return selectedCity;
  }, [isDetectingLocation, selectedCity, locationCity, deliveryDisplayLabel, t]);

  const openMapPicker = useCallback(() => {
    if (userLocation) {
      const region: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(region);
      setMarkerCoord({ latitude: userLocation.latitude, longitude: userLocation.longitude });
    }
    setMapAddress('');
    setMapSearchQuery('');
    setMapSearchResults([]);
    setShowSearchResults(false);
    setShowMapPicker(true);

    if (userLocation) {
      fetchAddress({ latitude: userLocation.latitude, longitude: userLocation.longitude });
    }
  }, [userLocation]);

  const fetchAddress = useCallback(async (coords: LocationCoords) => {
    setIsLoadingAddress(true);
    try {
      const langUi = language === 'ar' ? 'ar' : 'he';
      const address = await reverseGeocodeToAddress(coords, langUi);
      setMapAddress(address);
    } catch (e) {
      setMapAddress('');
    } finally {
      setIsLoadingAddress(false);
    }
  }, [language]);

  const handleMapPress = useCallback((e: any) => {
    const coord = e.nativeEvent.coordinate;
    if (coord) {
      setMarkerCoord({ latitude: coord.latitude, longitude: coord.longitude });
      setShowSearchResults(false);
      fetchAddress({ latitude: coord.latitude, longitude: coord.longitude });
    }
  }, [fetchAddress]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  const handleMyLocation = useCallback(async () => {
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        const region: Region = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
        setMarkerCoord(coords);
        mapRef.current?.animateToRegion(region, 500);
        fetchAddress(coords);
      }
    } catch (e) {
      // silently fail
    }
  }, [fetchAddress]);

  const handleMapSearch = useCallback((query: string) => {
    setMapSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setMapSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setShowSearchResults(true);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(query);
        setMapSearchResults(results);
      } catch (e) {
        // silently fail
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectSearchResult = useCallback((result: { name: string; nameAr: string; lat: number; lng: number }) => {
    const region: Region = {
      latitude: result.lat,
      longitude: result.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(region);
    setMarkerCoord({ latitude: result.lat, longitude: result.lng });
    mapRef.current?.animateToRegion(region, 500);
    setShowSearchResults(false);
    setMapSearchQuery(result.nameAr || result.name);
    fetchAddress({ latitude: result.lat, longitude: result.lng });
  }, [fetchAddress]);

  const handleConfirmAddress = useCallback(async () => {
    const majorCity = findNearestMajorCity(markerCoord, language);
    const langUi = language === 'ar' ? 'ar' : 'he';
    let label = formatAddressAsAreaOnly(mapAddress, 36);
    if (!label) {
      try {
        label = await reverseGeocodeToAreaLabel(markerCoord, langUi);
      } catch {
        label = '';
      }
    }
    if (!label) label = majorCity;
    await setSelectedCity(majorCity, markerCoord, label);
    setShowMapPicker(false);
  }, [markerCoord, setSelectedCity, language, mapAddress]);

  const handleSearchPress = useCallback(() => {
    setShowSearchPopup(true);
  }, []);

  const handleSearchTypeSelect = useCallback((type: 'product' | 'store') => {
    setShowSearchPopup(false);
    router.push(`/search?type=${type}` as any);
  }, [router]);

  const handleJanaProductPress = useCallback((id: string) => {
    setShowSearchPopup(false);
    router.push(`/product/${id}` as any);
  }, [router]);

  const handleOccasionPress = useCallback(() => {
    router.push('/(customer-tabs)/my-list?tab=occasions' as any);
  }, [router]);

  const handleCityProductsMore = useCallback(() => {
    const cat = categories.find(c => c.id === selectedCategory);
    const categoryParam = cat && selectedCategory !== '0' ? `&category=${encodeURIComponent(cat.nameEn)}` : '';
    router.push(`/city-browse?city=${encodeURIComponent(browseFilterCity)}&tab=products${categoryParam}` as any);
  }, [router, browseFilterCity, selectedCategory]);

  const handleCityStoresMore = useCallback(() => {
    router.push(`/city-browse?city=${encodeURIComponent(browseFilterCity)}&tab=stores` as any);
  }, [router, browseFilterCity]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <Animated.View style={[styles.header, { backgroundColor: colors.card, transform: [{ scale: headerScale }], paddingVertical: headerPaddingV, flexDirection: 'row' }]}>
          <TouchableOpacity style={[styles.locationRow, { flexDirection: 'row' }]} onPress={openMapPicker}>
            <Text style={[styles.deliverLabel, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('deliverTo')}</Text>
            <MapPinned size={14} color={colors.primary} />
            <Text
              style={[styles.locationLabel, { color: colors.primary, fontWeight: '600' as const, writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {getCityLabel()}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cartBtn, { backgroundColor: colors.primary }]}
            testID="cart-btn"
            onPress={() => router.push('/cart' as any)}
          >
            <ShoppingBag size={20} color="#FFF" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.searchContainer, { paddingBottom: searchBarMarginV, paddingTop: searchBarMarginV }]}>
          <TouchableOpacity onPress={handleSearchPress} activeOpacity={0.7}>
            <Animated.View style={[styles.searchBar, { backgroundColor: colors.card, height: searchBarHeight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Search size={15} color={colors.textMuted} />
              <View style={styles.searchPlaceholderWrap}>
                <Text
                  style={[styles.searchPlaceholder, { color: colors.textMuted }]}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {language === 'ar' ? 'ابحث' : 'Search'}
                </Text>
              </View>
              <View style={{ width: 15 }} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((item) => {
            const isSelected = selectedCategory === item.id;
            const catImageLocal = categoryImages[item.id];
            const catImageUri = typeof item.image === 'string' && (item.image.startsWith('http') || item.image.startsWith('data:')) ? item.image : null;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedCategory(item.id)}
                style={styles.categoryItem}
              >
                <Animated.View style={{ width: categoryIconSize, height: categoryIconSize, opacity: categoryIconOpacity, marginBottom: categoryIconMargin, overflow: 'hidden' }}>
                  {item.id === '0' ? (
                    <View style={[styles.categoryAllIcon, { backgroundColor: colors.card }]}>
                      <View style={styles.gridIcon}>
                        <View style={[styles.gridSquare, { backgroundColor: colors.primary }]} />
                        <View style={[styles.gridSquare, { backgroundColor: colors.primary }]} />
                        <View style={[styles.gridSquare, { backgroundColor: colors.primary }]} />
                        <View style={[styles.gridSquare, { backgroundColor: colors.primary }]} />
                      </View>
                    </View>
                  ) : catImageUri ? (
                    <Image source={{ uri: catImageUri }} style={styles.categoryIcon} contentFit="contain" />
                  ) : catImageLocal ? (
                    <Image source={catImageLocal} style={styles.categoryIcon} contentFit="contain" />
                  ) : (
                    <View style={[styles.categoryAllIcon, { backgroundColor: (item.color || colors.primary) + '20' }]}>
                      <Package size={18} color={item.color || colors.primary} />
                    </View>
                  )}
                </Animated.View>
                <Text style={[
                  styles.categoryName,
                  { color: isSelected ? colors.text : colors.textSecondary },
                  isSelected && styles.categoryNameActive,
                ]}>
                  {language === 'ar' ? item.name : item.nameEn}
                </Text>
                {isSelected ? <View style={[styles.categoryUnderline, { backgroundColor: colors.text }]} /> : <View style={styles.categoryUnderlinePlaceholder} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {banners.length > 0 && (
            <View style={styles.bannerSection}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerScroll}
                decelerationRate="fast"
                nestedScrollEnabled
              >
                {banners.map((item) => (
                  <View key={item.id} style={styles.bannerPage}>
                    <View style={styles.bannerCard}>
                      <Image source={{ uri: item.image }} style={styles.bannerImage} contentFit="cover" />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        width: activeBanner === i ? 20 : 6,
                        opacity: activeBanner === i ? 1 : 0.3,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                onPress={handleCityProductsMore}
                activeOpacity={0.7}
                style={styles.sectionTitleWrap}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      textAlign: isRTL ? 'left' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  {trendingCategoryTitle}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seeAllRow} onPress={handleCityProductsMore}>
                {isRTL ? <ArrowLeft size={16} color={colors.primary} /> : <ArrowRight size={16} color={colors.primary} />}
              </TouchableOpacity>
            </View>
            {trendingCategoryProducts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalProducts}>
                {trendingCategoryProducts.map((product) => (
                  <View key={product.id} style={{ width: PRODUCT_WIDTH }}>
                    <ProductCard product={product} onToggleFavorite={handleToggleFavorite} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySection}>
                <Package size={32} color={colors.textMuted} />
                <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>{language === 'ar' ? 'لا توجد منتجات حالياً' : 'No products available'}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                onPress={handleCityStoresMore}
                activeOpacity={0.7}
                style={styles.sectionTitleWrap}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, textAlign: isRTL ? 'left' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  ]}
                >
                  {language === 'ar' ? 'المتاجر الرائجة' : 'חנויות פופולריות'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seeAllRow} onPress={handleCityStoresMore}>
                {isRTL ? <ArrowLeft size={16} color={colors.primary} /> : <ArrowRight size={16} color={colors.primary} />}
              </TouchableOpacity>
            </View>
            {cityStores.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalStores}>
                {cityStores.map((store) => (
                  <TouchableOpacity
                    key={store.id}
                    style={[styles.storeCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/store/${store.id}` as any)}
                  >
                    <Image source={{ uri: store.image }} style={styles.storeImage} contentFit="cover" />
                    <View style={styles.storeInfo}>
                      <View style={[styles.storeTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.storeTextWrap}>
                          <Text style={[styles.storeName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{store.name}</Text>
                          <Text style={[styles.storeCategories, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{store.categories}</Text>
                        </View>
                        <Image source={{ uri: store.logo }} style={styles.storeLogo} contentFit="cover" />
                      </View>
                      <View style={[styles.storeTagsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.storeTag, { backgroundColor: colors.successLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[styles.storeTagText, { color: colors.success }]}>
                            {store.isOpen ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
                          </Text>
                        </View>
                        <View style={[styles.storeTag, { backgroundColor: colors.warningLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[styles.storeTagText, { color: colors.warning }]}>⭐ {store.rating}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySection}>
                <Package size={32} color={colors.textMuted} />
                <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>{language === 'ar' ? 'لا توجد متاجر حالياً' : 'No stores available'}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.occasionBanner, { backgroundColor: colors.primary }]}
            onPress={handleOccasionPress}
          >
            <Text style={styles.occasionBannerText}>{t('occasionBanner')}</Text>
            {isRTL ? <ArrowLeft size={20} color="#FFF" /> : <ArrowRight size={20} color="#FFF" />}
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                onPress={handleCityProductsMore}
                activeOpacity={0.7}
                style={styles.sectionTitleWrap}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: colors.text,
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  {mixedProductsSectionTitle}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seeAllRow} onPress={handleCityProductsMore}>
                {isRTL ? <ArrowLeft size={16} color={colors.primary} /> : <ArrowRight size={16} color={colors.primary} />}
              </TouchableOpacity>
            </View>
            {mixedCityProducts.length > 0 ? (
              <View style={styles.mixedProductsGrid}>
                {mixedCityProducts.map((product, index) => {
                  const isLarge = index % 5 === 0;
                  return (
                    <View key={product.id} style={isLarge ? styles.mixedProductLarge : styles.mixedProductSmall}>
                      <ProductCard product={product} onToggleFavorite={handleToggleFavorite} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptySection}>
                <Package size={32} color={colors.textMuted} />
                <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>{language === 'ar' ? 'لا توجد منتجات حالياً' : 'No products available'}</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>
      </Animated.View>

      <JanaSearchPopup
        visible={showSearchPopup}
        onClose={() => setShowSearchPopup(false)}
        onSelectType={handleSearchTypeSelect}
        products={filteredProductsByCity}
        selectedCity={selectedCity}
        colors={colors}
        t={t}
        onProductPress={handleJanaProductPress}
      />

      <Modal visible={showMapPicker} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.mapHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.mapBackBtn}
              onPress={() => setShowMapPicker(false)}
            >
              {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
            </TouchableOpacity>
            <Text style={[styles.mapHeaderTitle, { color: colors.text }]}>{t('chooseFromMap')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.mapSearchContainer}>
            <View style={[styles.mapSearchBar, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.mapSearchInput, { color: colors.text }]}
                placeholder={t('searchLocation')}
                placeholderTextColor={colors.textMuted}
                value={mapSearchQuery}
                onChangeText={handleMapSearch}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {showSearchResults && mapSearchResults.length > 0 && (
              <View style={[styles.searchResultsList, { backgroundColor: colors.card }]}>
                {mapSearchResults.map((result, index) => (
                  <TouchableOpacity
                    key={`${result.lat}-${result.lng}-${index}`}
                    style={[styles.searchResultItem, index < mapSearchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                    onPress={() => handleSelectSearchResult(result)}
                  >
                    <MapPinned size={16} color={colors.primary} />
                    <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={2}>
                      {result.nameAr || result.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showSearchResults && isSearching && (
              <View style={[styles.searchResultsList, { backgroundColor: colors.card, padding: 16, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>

          <View style={styles.mapWrapper}>
            {Platform.OS !== 'web' ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={getNativeMapProvider()}
                region={mapRegion}
                onPress={handleMapPress}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation={showUserLocationOnMap}
                showsMyLocationButton={false}
                mapType="standard"
              >
                <Marker
                  coordinate={markerCoord}
                  pinColor={colors.primary}
                />
              </MapView>
            ) : (
              <GoogleMapWeb
                latitude={markerCoord.latitude}
                longitude={markerCoord.longitude}
                zoom={14}
                onPress={(coords) => {
                  setMarkerCoord(coords);
                  setShowSearchResults(false);
                  fetchAddress(coords);
                }}
                onRegionChange={handleRegionChangeComplete}
                style={styles.map}
                radiusKm={75}
              />
            )}

            <TouchableOpacity
              style={[styles.myLocationBtn, { backgroundColor: colors.card }]}
              onPress={handleMyLocation}
              activeOpacity={0.8}
            >
              <Crosshair size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.mapBottomSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.bottomSheetHandle} />

            <Text style={[styles.addressHint, { color: colors.textSecondary }]}>
              {t('selectDeliveryAddress')}
            </Text>

            {isLoadingAddress ? (
              <View style={styles.addressLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : mapAddress ? (
              <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
                {formatAddressAsAreaOnly(mapAddress, 80) || mapAddress}
              </Text>
            ) : (
              <Text style={[styles.addressText, { color: colors.textMuted }]}>
                {language === 'ar' ? 'اضغط على الخريطة لتحديد الموقع' : 'Tap on the map to select location'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.confirmAddressBtn, { backgroundColor: colors.primary, opacity: isLoadingAddress ? 0.5 : 1 }]}
              onPress={handleConfirmAddress}
              disabled={isLoadingAddress}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmAddressBtnText}>{t('confirmAddress')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' as const },
  locationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    marginEnd: 8,
  },
  deliverLabel: { fontSize: 14, fontWeight: '500' as const, flexShrink: 0 },
  locationLabel: { fontSize: 14, flexShrink: 1, minWidth: 0 },
  searchContainer: { paddingHorizontal: 16 },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 22,
    paddingHorizontal: 16,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  searchPlaceholderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 24,
  },
  searchPlaceholder: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingTop: Platform.OS === 'ios' ? 1 : 0,
  },
  categoryList: { paddingHorizontal: 12, gap: 0, paddingTop: 6, paddingBottom: 4 },
  categoryItem: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4, minWidth: 70 },
  categoryIcon: { width: 40, height: 40 },
  categoryAllIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIcon: {
    width: 22,
    height: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  categoryName: { fontSize: 11, fontWeight: '500' as const },
  categoryNameActive: { fontWeight: '700' as const },
  categoryUnderline: { height: 3, width: 22, borderRadius: 1.5, marginTop: 5 },
  categoryUnderlinePlaceholder: { height: 3, width: 22, marginTop: 5 },
  scrollContent: { paddingTop: 4 },
  bannerSection: { marginTop: 8, marginBottom: 6 },
  bannerPage: {
    width: BANNER_PAGE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCard: {
    width: BANNER_CARD_WIDTH,
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.12)',
    elevation: 4,
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  dot: { height: 6, borderRadius: 3 },
  section: { marginTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const },
  sectionTitleWrap: { flex: 1, marginEnd: 8 },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  seeAllText: { fontSize: 14, fontWeight: '600' as const },
  horizontalProducts: { paddingHorizontal: 20, gap: 12 },
  horizontalStores: { paddingHorizontal: 20, gap: 12 },
  storeCard: {
    width: width - 60,
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  storeImage: {
    width: '100%',
    height: 140,
  },
  storeInfo: {
    padding: 14,
  },
  storeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  storeTextWrap: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: '700' as const },
  storeCategories: { fontSize: 12, marginTop: 2 },
  storeTagsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  storeTagText: { fontSize: 11, fontWeight: '600' as const },
  occasionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  occasionBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
    flex: 1,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  mixedProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  mixedProductLarge: {
    width: '100%',
  },
  mixedProductSmall: {
    width: (width - 50) / 2,
  },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 16 },
  emptySection: { alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 32, gap: 8 },
  emptySectionText: { fontSize: 14, fontWeight: '500' as const },
  bottomSpacer: { height: 110 },
  mapContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mapBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  mapSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  mapSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    height: 50,
    borderWidth: 1.5,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchResultsList: {
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
    elevation: 6,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  webMapText: {
    fontSize: 14,
    marginTop: 12,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  mapBottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  addressHint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  addressLoadingRow: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    minHeight: 48,
  },
  confirmAddressBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAddressBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
