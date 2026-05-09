import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowRight, ArrowLeft, MapPin, MapPinned, ChevronDown, Search, Crosshair } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import ProductCard from '@/components/ProductCard';
import {
  getCurrentLocation,
  reverseGeocodeToAddress,
  searchPlaces,
  findNearestMajorCity,
  formatAddressAsAreaOnly,
  reverseGeocodeToAreaLabel,
  LocationCoords,
  productMatchesCity,
} from '@/utils/location';
import MapView, { Marker, Region } from 'react-native-maps';
import { getNativeMapProvider } from '@/utils/nativeMapProvider';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import { useMapUserLocationEnabled } from '@/hooks/useMapUserLocationEnabled';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48 - 12) / 2;

const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function CityBrowseScreen() {
  const { colors, t, language, products, filteredProductsByCity, categories, toggleFavorite, setSelectedCity, selectedCity, deliveryDisplayLabel, userLocation, isRTL, storesList } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ city?: string; tab?: string }>();
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>(params.tab === 'stores' ? 'stores' : 'products');
  const [selectedCategory, setSelectedCategory] = useState<string>('0');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const showUserLocationOnMap = useMapUserLocationEnabled(showMapPicker);

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

  const handleToggleFavorite = useCallback((id: string) => toggleFavorite(id), [toggleFavorite]);

  const filterCity = useMemo(() => {
    if (selectedCity && selectedCity !== 'all') return selectedCity;
    const raw = params.city;
    if (raw) {
      try {
        return decodeURIComponent(typeof raw === 'string' ? raw : String(raw));
      } catch {
        return typeof raw === 'string' ? raw : String(raw);
      }
    }
    return 'جدة';
  }, [selectedCity, params.city]);

  const headerLocationText = useMemo(() => {
    if (deliveryDisplayLabel) {
      const area = formatAddressAsAreaOnly(deliveryDisplayLabel, 34);
      return area || deliveryDisplayLabel;
    }
    return filterCity;
  }, [deliveryDisplayLabel, filterCity]);

  const cityProducts = useMemo(() => {
    // Keep "city browse" product results consistent with home screen.
    let filtered = selectedCity === 'all'
      ? products.filter((p) => productMatchesCity(p.city, filterCity))
      : filteredProductsByCity;
    if (selectedCategory !== '0') {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        filtered = filtered.filter(p => p.category === cat.name || p.categoryEn === cat.nameEn);
      }
    }
    return filtered;
  }, [products, filteredProductsByCity, selectedCategory, categories, filterCity, selectedCity]);

  const cityStores = useMemo(() => {
    const base = [...storesList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return base.map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo,
      image: s.banner || s.logo,
      city: s.city,
      rating: s.rating,
      reviewCount: s.reviewCount,
      isOpen: s.isOpen,
      categories:
        formatAddressAsAreaOnly(s.locationAddress || '', 40) || s.description || s.city,
    }));
  }, [storesList]);

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
    } catch (e) { }
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
      } catch (e) { }
      finally { setIsSearching(false); }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.deliveryRow} onPress={openMapPicker}>
            <Text style={[styles.deliveryLabel, { color: colors.text }]}>{t('deliverTo')}</Text>
            <MapPinned size={14} color={colors.primary} />
            <Text style={[styles.deliveryCityText, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
              {headerLocationText}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'stores' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('stores')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'stores' ? '#FFF' : colors.textSecondary }]}>{t('cityStores')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'products' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'products' ? '#FFF' : colors.textSecondary }]}>{t('cityProducts')}</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'products' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.catChip, isSelected && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.catChipText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>
                    {language === 'ar' ? cat.name : cat.nameEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'products' && (
          <>
            {cityProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResultsFound')}</Text>
              </View>
            ) : (
              <View style={styles.productGrid}>
                {cityProducts.map(p => (
                  <View key={p.id} style={{ width: PRODUCT_WIDTH }}>
                    <ProductCard product={p} onToggleFavorite={handleToggleFavorite} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'stores' && (
          <>
            {cityStores.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResultsFound')}</Text>
              </View>
            ) : (
              cityStores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.storeCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
                  onPress={() => router.push(`/store/${store.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: store.image || store.logo }} style={styles.storeImage} contentFit="cover" />
                  <View style={styles.storeInfo}>
                    <View style={[styles.storeTopRow, { flexDirection: 'row' }]}>
                      <Image source={{ uri: store.logo }} style={styles.storeLogo} contentFit="cover" />
                      <View style={[styles.storeTextWrap, { alignItems: 'flex-start' }]}>
                        <Text style={[styles.storeName, { color: colors.text, textAlign: 'left' }]}>{store.name}</Text>
                        <Text style={[styles.storeCategories, { color: colors.textSecondary, textAlign: 'left' }]} numberOfLines={1}>{store.categories}</Text>
                      </View>
                    </View>
                    <View style={[styles.storeTagsRow, { flexDirection: 'row', justifyContent: 'flex-start' }]}>
                      <View style={[styles.storeTag, { backgroundColor: '#10B98115', flexDirection: 'row' }]}>
                        <Text style={[styles.storeTagText, { color: '#10B981' }]}>
                          {store.isOpen ? (language === 'ar' ? 'مفتوح' : 'פתוח') : (language === 'ar' ? 'مغلق' : 'סגור')}
                        </Text>
                      </View>
                      <View style={[styles.storeTag, { backgroundColor: '#F59E0B15', flexDirection: 'row' }]}>
                        <Text style={[styles.storeTagText, { color: '#F59E0B' }]}>⭐ {store.rating}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showMapPicker} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.mapHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.mapBackBtn}
              onPress={() => setShowMapPicker(false)}
            >
              <ArrowRight size={22} color={colors.text} />
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
                {language === 'ar' ? 'اضغط على الخريطة لتحديد الموقع' : 'הקש על המפה לבחירת מיקום'}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.confirmAddressBtn, { backgroundColor: colors.primary, opacity: mapAddress ? 1 : 0.5 }]}
              onPress={handleConfirmAddress}
              disabled={!mapAddress}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryLabel: { fontSize: 14, fontWeight: '500' as const },
  deliveryCityText: { fontSize: 14, fontWeight: '600' as const },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  categoryList: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 10,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catChipText: { fontSize: 13, fontWeight: '600' as const },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  storeCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  storeImage: {
    width: '100%',
    height: 140,
  },
  storeInfo: { padding: 14 },
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
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: { fontSize: 16 },
  mapContainer: { flex: 1 },
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
  mapHeaderTitle: { fontSize: 18, fontWeight: '700' as const },
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
  },
  mapSearchInput: { flex: 1, fontSize: 15 },
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
  searchResultText: { flex: 1, fontSize: 14 },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  webMapText: { fontSize: 14, marginTop: 12 },
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
  addressHint: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  addressLoadingRow: { height: 50, alignItems: 'center', justifyContent: 'center' },
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
  confirmAddressBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' as const },
});
