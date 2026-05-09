import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPinned, Search, ArrowRight, ArrowLeft, Crosshair, Store } from 'lucide-react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { getNativeMapProvider } from '@/utils/nativeMapProvider';
import { useApp } from '@/contexts/AppContext';
import {
  getCurrentLocation,
  reverseGeocodeToAddress,
  reverseGeocodeToAreaLabel,
  searchPlaces,
  formatAddressAsAreaOnly,
  shortenAddressLabel,
  LocationCoords,
} from '@/utils/location';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import { useMapUserLocationEnabled } from '@/hooks/useMapUserLocationEnabled';

const DEFAULT_REGION: Region = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCity: (
    cityName: string,
    coords?: LocationCoords,
    displayLabel?: string | null
  ) => void | Promise<void>;
  initialCoords?: LocationCoords | null;
  title?: string;
}

function MapPickerModal({ visible, onClose, onSelectCity, initialCoords, title }: MapPickerModalProps) {
  const { colors, t, language, userLocation, isRTL, storesList } = useApp();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerCoordRef = useRef({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
  const storesWithGeoRef = useRef<Array<{ id: string; latitude: number; longitude: number; name: string }>>([]);

  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [markerCoord, setMarkerCoord] = useState<LocationCoords>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [mapAddress, setMapAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<Array<{ name: string; nameAr: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showStoresOnMap, setShowStoresOnMap] = useState(false);

  const showUserLocationOnMap = useMapUserLocationEnabled(visible);

  const storesWithGeo = useMemo(
    () =>
      storesList.filter(
        (s): s is typeof s & { latitude: number; longitude: number } =>
          typeof s.latitude === 'number' &&
          typeof s.longitude === 'number' &&
          !Number.isNaN(s.latitude) &&
          !Number.isNaN(s.longitude)
      ),
    [storesList]
  );

  storesWithGeoRef.current = storesWithGeo.map((s) => ({
    id: s.id,
    latitude: s.latitude,
    longitude: s.longitude,
    name: s.name,
  }));

  const fetchAddress = useCallback(async (coords: LocationCoords) => {
    setIsLoadingAddress(true);
    try {
      const langUi = language === 'ar' ? 'ar' : 'he';
      const address = await reverseGeocodeToAddress(coords, langUi);
      setMapAddress(address);
    } catch (e) {
      void e;
      setMapAddress('');
    } finally {
      setIsLoadingAddress(false);
    }
  }, [language]);

  const initMap = useCallback(() => {
    const coords = initialCoords || userLocation;
    if (coords) {
      const region: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(region);
      setMarkerCoord({ latitude: coords.latitude, longitude: coords.longitude });
      setHasSelectedLocation(true);
      fetchAddress({ latitude: coords.latitude, longitude: coords.longitude });
    } else {
      setMapRegion(DEFAULT_REGION);
      setMarkerCoord({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
      setHasSelectedLocation(false);
      setMapAddress('');
    }
    setMapSearchQuery('');
    setMapSearchResults([]);
    setShowSearchResults(false);
    setShowStoresOnMap(false);
  }, [initialCoords, userLocation, fetchAddress]);

  React.useEffect(() => {
    if (visible) {
      initMap();
    }
  }, [visible, initMap]);

  markerCoordRef.current = markerCoord;

  const toggleStoresOnMap = useCallback(() => {
    if (Platform.OS === 'web') return;
    setShowStoresOnMap((prev) => {
      const next = !prev;
      requestAnimationFrame(() => {
        const m = markerCoordRef.current;
        if (next) {
          const coords = [
            { latitude: m.latitude, longitude: m.longitude },
            ...storesWithGeoRef.current.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
          ];
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 100, right: 48, bottom: 220, left: 48 },
            animated: true,
          });
        } else {
          mapRef.current?.animateToRegion(
            {
              latitude: m.latitude,
              longitude: m.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            400
          );
        }
      });
      return next;
    });
  }, []);

  const handleMapPress = useCallback((e: any) => {
    const coord = e.nativeEvent.coordinate;
    if (coord) {
      setMarkerCoord({ latitude: coord.latitude, longitude: coord.longitude });
      setHasSelectedLocation(true);
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
        setHasSelectedLocation(true);
        mapRef.current?.animateToRegion(region, 500);
        fetchAddress(coords);
      }
    } catch (e) {
      void e;
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
        void e;
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
    setHasSelectedLocation(true);
    mapRef.current?.animateToRegion(region, 500);
    setShowSearchResults(false);
    setMapSearchQuery(result.nameAr || result.name);
    fetchAddress({ latitude: result.lat, longitude: result.lng });
  }, [fetchAddress]);

  const handleConfirm = useCallback(async () => {
    const langUi = language === 'ar' ? 'ar' : 'he';
    let label = formatAddressAsAreaOnly(mapAddress, 80);
    if (!label) {
      try {
        label = await reverseGeocodeToAreaLabel(markerCoord, langUi);
      } catch {
        label = '';
      }
    }
    if (!label) {
      try {
        const addr = await reverseGeocodeToAddress(markerCoord, langUi);
        const short = shortenAddressLabel(addr, 72);
        label = (short || addr?.replace(/\s+/g, ' ').trim() || '').slice(0, 120);
      } catch {
        label = '';
      }
    }
    if (!label) {
      label =
        language === 'ar'
          ? `${markerCoord.latitude.toFixed(5)}، ${markerCoord.longitude.toFixed(5)}`
          : `${markerCoord.latitude.toFixed(5)}, ${markerCoord.longitude.toFixed(5)}`;
    }
    const resolved = label.trim();
    try {
      await onSelectCity(resolved, markerCoord, resolved);
    } catch (e) {
      console.warn('[MapPickerModal] onSelectCity', e);
    }
    onClose();
  }, [markerCoord, onSelectCity, onClose, language, mapAddress]);

  /** لا نُركّب MapView أصلاً إلا عند فتح النافذة — تجنّب كراشات native (خرائط/صلاحيات) أثناء شاشات أخرى مثل السلة */
  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {title || t('chooseFromMap')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
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
                  style={[styles.searchResultItem, index < mapSearchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
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
              <Marker coordinate={markerCoord} pinColor={colors.primary} />
              {showStoresOnMap &&
                storesWithGeo.map((store) => (
                  <Marker
                    key={`store-${store.id}`}
                    coordinate={{ latitude: store.latitude!, longitude: store.longitude! }}
                    title={store.name}
                    pinColor="#6B7280"
                  />
                ))}
            </MapView>
          ) : (
            <GoogleMapWeb
              latitude={markerCoord.latitude}
              longitude={markerCoord.longitude}
              zoom={14}
              onPress={(coords) => {
                setMarkerCoord(coords);
                setHasSelectedLocation(true);
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

        <View style={[styles.bottomSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bottomSheetHandle} />

          <Text style={[styles.addressHint, { color: colors.textSecondary }]}>
            {language === 'ar' ? 'اضغط على الخريطة لتحديد الموقع' : 'הקש על המפה לבחירת מיקום'}
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
            style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: (hasSelectedLocation && !isLoadingAddress) ? 1 : 0.5 }]}
            onPress={handleConfirm}
            disabled={!hasSelectedLocation || isLoadingAddress}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>{t('confirmAddress')}</Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && storesWithGeo.length > 0 && (
            <TouchableOpacity
              style={[
                styles.storesToggle,
                {
                  backgroundColor: showStoresOnMap ? colors.primary + '22' : colors.card,
                  borderColor: showStoresOnMap ? colors.primary : colors.border,
                },
              ]}
              onPress={toggleStoresOnMap}
              activeOpacity={0.85}
            >
              <Store size={18} color={colors.primary} />
              <Text style={[styles.storesToggleText, { color: colors.text }]} numberOfLines={2}>
                {showStoresOnMap ? t('hideStoresOnMap') : t('showStoresOnMap')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(MapPickerModal);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  searchBar: {
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
  searchInput: { flex: 1, fontSize: 15 },
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
  mapWrapper: { flex: 1, position: 'relative' as const },
  storesToggle: {
    marginTop: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  storesToggleText: { fontSize: 15, fontWeight: '600' as const, flexShrink: 1, textAlign: 'center' },
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
  bottomSheet: {
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
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' as const },
});
