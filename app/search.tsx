// GLORDA App Search Screen - Clean Build
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowRight, ArrowLeft, Search, MapPinned, Star, ChevronDown, Crosshair, ShoppingBag, Store as StoreIcon } from 'lucide-react-native';
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
import { JanaSearchHero, JanaAssistant, getJanaSmartMessage } from '@/components/JanaCharacter';
import type { ThemeColors } from '@/types';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48 - 12) / 2;

const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type AreaStore = {
  id: string;
  name: string;
  username: string;
  logo: string;
  rating: number;
  city?: string;
  locationAddress?: string;
};

function AreaStoreCard({
  store,
  colors,
  onPress,
}: {
  store: AreaStore;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.borderLight, borderWidth: 1, flexDirection: 'row' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image source={{ uri: store.logo }} style={styles.storeLogo} contentFit="cover" />
      <View style={[styles.storeInfo, { alignItems: 'flex-start' }]}>
        <Text style={[styles.storeName, { color: colors.text, textAlign: 'left' }]}>{store.name}</Text>
        <Text style={[styles.storeUsername, { color: colors.textSecondary, textAlign: 'left' }]}>{store.username}</Text>
        <View style={[styles.storeMetaRow, { flexDirection: 'row' }]}>
          <View style={[styles.storeMeta, { flexDirection: 'row' }]}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={[styles.storeMetaText, { color: colors.text }]}>{store.rating}</Text>
          </View>
          <View style={[styles.storeMeta, { flexDirection: 'row' }]}>
            <MapPinned size={12} color={colors.textSecondary} />
            <Text style={[styles.storeMetaText, { color: colors.textSecondary, textAlign: 'left' }]} numberOfLines={2}>
              {formatAddressAsAreaOnly(store.locationAddress || '', 36) || store.city}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const { colors, t, language, filteredProductsByCity, toggleFavorite, selectedCity, setSelectedCity, deliveryDisplayLabel, selectedCoords, userLocation, locationCity, isRTL, storesList, nearbyStoreIds } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string }>();
  const [searchType, setSearchType] = useState<'product' | 'store'>(params.type === 'store' ? 'store' : 'product');
  const [query, setQuery] = useState('');

  const [showMapPicker, setShowMapPicker] = useState(false);
  const showUserLocationOnMap = useMapUserLocationEnabled(showMapPicker);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [markerCoord, setMarkerCoord] = useState<LocationCoords>({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
  const [mapAddress, setMapAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<Array<{ name: string; nameAr: string; lat: number; lng: number }>>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToggleFavorite = useCallback((id: string) => toggleFavorite(id), [toggleFavorite]);

  const currentCityLabel = useMemo(() => {
    if (deliveryDisplayLabel) return deliveryDisplayLabel;
    if (selectedCity === 'all') {
      if (locationCity) return locationCity;
      return t('allCities');
    }
    return selectedCity;
  }, [deliveryDisplayLabel, selectedCity, locationCity, t]);

  // Keep store search scoped to user's effective location
  const effectiveCityFilter = useMemo(() => {
    if (selectedCity !== 'all') return selectedCity;
    if (locationCity) return locationCity;
    return 'جدة';
  }, [selectedCity, locationCity]);

  const filteredProducts = useMemo(() => {
    if (searchType !== 'product' || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return filteredProductsByCity.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.category.includes(q) ||
        (p.categoryEn && p.categoryEn.toLowerCase().includes(q))
    );
  }, [filteredProductsByCity, query, searchType]);



  const locationStores = useMemo(() => {
    if (nearbyStoreIds && nearbyStoreIds.length > 0) {
      return storesList.filter(
        (s) =>
          nearbyStoreIds.includes(s.id) ||
          ((s.latitude == null || s.longitude == null) && productMatchesCity(s.city, effectiveCityFilter))
      );
    }
    return storesList.filter((s) => productMatchesCity(s.city, effectiveCityFilter));
  }, [storesList, nearbyStoreIds, effectiveCityFilter]);

  const filteredStores = useMemo(() => {
    if (searchType !== 'store' || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return locationStores.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q))
    );
  }, [query, searchType, locationStores]);

  const similarProducts = useMemo(() => {
    if (filteredProducts.length === 0 || searchType !== 'product') return [];
    const firstResult = filteredProducts[0];
    return filteredProductsByCity
      .filter(
        (p) =>
          p.id !== firstResult.id &&
          (p.city === firstResult.city || p.category === firstResult.category)
      )
      .slice(0, 10);
  }, [filteredProducts, filteredProductsByCity, searchType]);

  const similarStores = useMemo(() => {
    if (filteredStores.length === 0 || searchType !== 'store') return [];
    const firstResult = filteredStores[0];
    return locationStores.filter(
      (s) => s.id !== firstResult.id && productMatchesCity(s.city, firstResult.city)
    );
  }, [filteredStores, searchType, locationStores]);

  const janaState = useMemo(() => {
    return getJanaSmartMessage({
      products: filteredProductsByCity,
      selectedCity,
      displayCityLabel: selectedCity !== 'all' ? currentCityLabel : undefined,
      searchQuery: query,
      searchType,
      hasResults: searchType === 'product' ? filteredProducts.length > 0 : filteredStores.length > 0,
      language: language === 'ar' ? 'ar' : 'he',
    });
  }, [query, searchType, filteredProducts.length, filteredStores.length, filteredProductsByCity, selectedCity, currentCityLabel, language]);

  const hasQuery = query.trim().length > 0;
  const hasResults = searchType === 'product' ? filteredProducts.length > 0 : filteredStores.length > 0;

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
    if (userLocation) fetchAddress({ latitude: userLocation.latitude, longitude: userLocation.longitude });
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

  const handleMyLocation = useCallback(async () => {
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        const region: Region = { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setMapRegion(region);
        setMarkerCoord(coords);
        mapRef.current?.animateToRegion(region, 500);
        fetchAddress(coords);
      }
    } catch (e) { }
  }, [fetchAddress]);

  const handleMapSearchInput = useCallback((q: string) => {
    setMapSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) { setMapSearchResults([]); setShowSearchResults(false); return; }
    setShowSearchResults(true);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingMap(true);
      try { const results = await searchPlaces(q); setMapSearchResults(results); }
      catch (e) { } finally { setIsSearchingMap(false); }
    }, 500);
  }, []);

  const handleSelectSearchResult = useCallback((result: { name: string; nameAr: string; lat: number; lng: number }) => {
    const region: Region = { latitude: result.lat, longitude: result.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
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
        <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deliveryRow, { flexDirection: isRTL ? 'row' : 'row' }]} onPress={openMapPicker}>
            <ChevronDown size={14} color={colors.textSecondary} />
            <Text style={[styles.deliveryCityText, { color: colors.primary, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1} ellipsizeMode="tail">
              {currentCityLabel}
            </Text>
            <MapPinned size={14} color={colors.primary} />
            <Text style={[styles.deliveryLabel, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('deliverTo')}</Text>
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBarWrap}>
          <View style={[styles.searchBar, { borderColor: colors.primary, backgroundColor: colors.card, flexDirection: isRTL ? 'row' : 'row' }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={searchType === 'product' ? t('searchByProduct') : t('searchByStore')}
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        <View style={[styles.typeToggle, { flexDirection: isRTL ? 'row' : 'row' }]}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              searchType === 'store' && { backgroundColor: colors.primary },
              searchType !== 'store' && { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderLight },
              { flexDirection: isRTL ? 'row' : 'row' },
            ]}
            onPress={() => { setSearchType('store'); setQuery(''); }}
            activeOpacity={0.8}
          >
            <StoreIcon size={16} color={searchType === 'store' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: searchType === 'store' ? '#FFF' : colors.textSecondary }]}>{t('searchStore')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              searchType === 'product' && { backgroundColor: colors.primary },
              searchType !== 'product' && { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderLight },
              { flexDirection: isRTL ? 'row' : 'row' },
            ]}
            onPress={() => { setSearchType('product'); setQuery(''); }}
            activeOpacity={0.8}
          >
            <ShoppingBag size={16} color={searchType === 'product' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: searchType === 'product' ? '#FFF' : colors.textSecondary }]}>{t('searchProduct')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {!hasQuery && (
          <>
            <JanaSearchHero
              message={janaState.message}
              mood={janaState.mood}
              visible={true}
              colors={colors}
            />
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>{t('nearbyStores')}</Text>
            {locationStores.length > 0 ? (
              locationStores.map((store) => (
                <AreaStoreCard
                  key={store.id}
                  store={store as AreaStore}
                  colors={colors}
                  onPress={() => router.push(`/store/${store.id}` as any)}
                />
              ))
            ) : (
              <Text style={[styles.emptyBrowseText, { color: colors.textSecondary }]}>{t('searchBrowseEmptyStores')}</Text>
            )}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
              {`${t('productsInCity')} ${currentCityLabel}`}
            </Text>
            {filteredProductsByCity.length > 0 ? (
              <View style={styles.productGrid}>
                {filteredProductsByCity.map((p) => (
                  <View key={p.id} style={{ width: PRODUCT_WIDTH }}>
                    <ProductCard product={p} onToggleFavorite={handleToggleFavorite} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyBrowseText, { color: colors.textSecondary }]}>{t('searchBrowseEmptyProducts')}</Text>
            )}
          </>
        )}

        {searchType === 'product' && query.trim() && (
          <>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <JanaSearchHero
                  message={janaState.message}
                  mood={janaState.mood}
                  visible={true}
                  colors={colors}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResultsFound')}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('searchResults')}</Text>
                <View style={styles.productGrid}>
                  {filteredProducts.map(p => (
                    <View key={p.id} style={{ width: PRODUCT_WIDTH }}>
                      <ProductCard product={p} onToggleFavorite={handleToggleFavorite} />
                    </View>
                  ))}
                </View>

                {similarProducts.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>{t('similarProducts')}</Text>
                    <View style={styles.productGrid}>
                      {similarProducts.map(p => (
                        <View key={p.id} style={{ width: PRODUCT_WIDTH }}>
                          <ProductCard product={p} onToggleFavorite={handleToggleFavorite} />
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}

        {searchType === 'store' && query.trim() && (
          <>
            {filteredStores.length === 0 ? (
              <View style={styles.emptyState}>
                <JanaSearchHero
                  message={janaState.message}
                  mood={janaState.mood}
                  visible={true}
                  colors={colors}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noResultsFound')}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('searchResults')}</Text>
                {filteredStores.map((store) => (
                  <AreaStoreCard
                    key={store.id}
                    store={store as AreaStore}
                    colors={colors}
                    onPress={() => router.push(`/store/${store.id}` as any)}
                  />
                ))}

                {similarStores.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>{t('similarStores')}</Text>
                    {similarStores.map((store) => (
                      <AreaStoreCard
                        key={store.id}
                        store={store as AreaStore}
                        colors={colors}
                        onPress={() => router.push(`/store/${store.id}` as any)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {hasQuery && hasResults && (
        <JanaAssistant
          message={janaState.message}
          mood={janaState.mood}
          visible={true}
          colors={colors}
          position="bottomLeft"
        />
      )}

      <Modal visible={showMapPicker} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.mapHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.mapBackBtn} onPress={() => setShowMapPicker(false)}>
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
                onChangeText={handleMapSearchInput}
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
                    <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={2}>{result.nameAr || result.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {showSearchResults && isSearchingMap && (
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
                onRegionChangeComplete={(r: Region) => setMapRegion(r)}
                showsUserLocation={showUserLocationOnMap}
                showsMyLocationButton={false}
                mapType="standard"
              >
                <Marker coordinate={markerCoord} pinColor={colors.primary} />
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
                onRegionChange={(r) => setMapRegion(r as Region)}
                style={styles.map}
                radiusKm={75}
              />
            )}
            <TouchableOpacity style={[styles.myLocationBtn, { backgroundColor: colors.card }]} onPress={handleMyLocation} activeOpacity={0.8}>
              <Crosshair size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.mapBottomSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={[styles.addressHint, { color: colors.textSecondary }]}>{t('selectDeliveryAddress')}</Text>
            {isLoadingAddress ? (
              <View style={styles.addressLoadingRow}><ActivityIndicator size="small" color={colors.primary} /></View>
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
    paddingVertical: 10,
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
  typeToggle: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
  },
  typeBtnText: { fontSize: 14, fontWeight: '700' as const },
  searchBarWrap: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  janaInlineWrap: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 14,
    width: '100%',
    textAlign: 'left',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 8,
  },
  emptyBrowseText: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
    lineHeight: 22,
  },
  storeCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
    alignItems: 'center',
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  storeUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  storeMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeMetaText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHeaderTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  mapSearchContainer: {
    paddingHorizontal: 16,
    zIndex: 100,
    marginBottom: 8,
  },
  mapSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchResultsList: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 101,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
  },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  myLocationBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapBottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  addressHint: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  addressLoadingRow: { alignItems: 'center', paddingVertical: 8 },
  addressText: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  confirmAddressBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmAddressBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});
