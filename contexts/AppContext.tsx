import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { UserRole, CartItem, Product, User, Language, Occasion, StoreInfo, ThemeColors, EntityType, Order, SavedAddress, WalletTransaction, AppNotification } from '@/types';
import { lightColors, darkColors } from '@/constants/colors';
import { translate } from '@/constants/i18n';
import { getCurrentLocation, reverseGeocodeToCity, getDistance, findNearestMajorCity, reverseGeocodeToAreaLabel, LocationCoords } from '@/utils/location';
import { selectedOptionsSignature } from '@/utils/cartLine';
import { categories as mockCategories } from '@/mocks/categories';
import { getCategories, getProductsFromFirestore, getBanners, getMerchantsFromFirestore, type FirestoreStore } from '@/services/firestore';
import { getFirebase } from '@/services/firebase';
import {
  seedUser, seedStoreInfo, seedOrders, seedCart, seedAddresses,
  seedWalletBalance, seedWalletTransactions, seedWalletPending,
  seedFavoriteIds, seedFavoriteStoreIds, seedNotifications,
  seedMerchantConversations, seedCustomerConversations,
} from '@/mocks/seedData';
import {
  onAuthStateChange as onFirebaseAuthStateChange,
  logoutCustomer as firebaseLogout,
  loginWithToken as firebaseLoginWithToken,
  requestOtp as firebaseRequestOtp,
  checkOtp as firebaseCheckOtp,
  updateCustomerProfileInFirestore,
  updateAuthPassword as firebaseUpdateAuthPassword,
  verifyOtpCode,
  registerCustomerDirectly,
} from '@/services/firebaseAuth';
import { isFirebaseConfigured } from '@/services/firebase';
import {
  registerMerchantInFirestore,
  getMerchantProfile,
  updateMerchantInFirestore,
  toggleMerchantOpen,
  addProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  getMerchantProducts,
  getMerchantOrders,
  updateOrderStatusInFirestore,
  getMerchantTransactions,
  requestWithdrawalInFirestore,
  placeOrderInFirestore,
  getCustomerOrders,
  getCurrentMerchantId,
  uploadImageToStorage,
  getMerchantStatus,
  updateUserLastRole,
  type MerchantStatusValue,
} from '@/services/merchantFirestore';

const RADIUS_KM = 75;

const ROLE_KEY = 'user_role';
const CART_KEY = 'cart_items';
const FAVORITES_KEY = 'favorites';
const USER_KEY = 'user_data';
const AUTH_KEY = 'is_authenticated';
const LANG_KEY = 'app_language';
const THEME_KEY = 'app_theme';
const STORE_KEY = 'store_info';
const OCCASIONS_KEY = 'occasions';
const FAV_STORES_KEY = 'favorite_stores';
const CITY_KEY = 'selected_city';
const DELIVERY_LABEL_KEY = 'delivery_display_label';
const GUEST_KEY = 'is_guest';
const ONBOARDING_KEY = 'has_seen_onboarding';
const USER_LOCATION_KEY = 'user_location';
const ORDERS_KEY = 'placed_orders';
const ADDRESSES_KEY = 'saved_addresses';
const WALLET_BALANCE_KEY = 'wallet_balance';
const WALLET_TRANSACTIONS_KEY = 'wallet_transactions';
const WALLET_PENDING_KEY = 'wallet_pending';
const NOTIFICATIONS_KEY = 'app_notifications';
const PRODUCTS_KEY = 'app_products';
const SEED_VERSION_KEY = 'seed_data_version';
const CURRENT_SEED_VERSION = '5';

// TODO: [PRODUCTION] Replace AsyncStorage-based local data persistence with real backend API calls
// - All state (users, products, orders, cart, wallet, etc.) should be fetched from and persisted to a backend API
// - Implement proper authentication with JWT tokens or session management
// - Add API error handling, retry logic, and offline support
// - Replace seed data mechanism with server-side data initialization
// - Implement real-time updates via WebSockets or polling for orders, messages, and notifications
export const [AppProvider, useApp] = createContextHook(() => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; nameEn: string; image?: string; icon?: string; color?: string }>>(mockCategories.map((c) => ({ id: c.id, name: c.name, nameEn: c.nameEn, icon: c.icon, image: c.image })));
  const [banners, setBanners] = useState<Array<{ id: string; image: string; text: string }>>([]);
  const [storesById, setStoresById] = useState<Record<string, FirestoreStore>>({});
  const favoriteIdsRef = useRef<string[]>([]);
  favoriteIdsRef.current = favoriteIds;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguageState] = useState<Language>('ar');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [merchantStatus, setMerchantStatus] = useState<MerchantStatusValue | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [selectedCity, setSelectedCityState] = useState<string>('all');
  const [deliveryDisplayLabel, setDeliveryDisplayLabelState] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationCity, setLocationCity] = useState<string | null>(null);
  const [placedOrders, setPlacedOrders] = useState<Order[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletPending, setWalletPending] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const colors: ThemeColors = useMemo(() => isDarkMode ? darkColors : lightColors, [isDarkMode]);
  const isRTL = useMemo(() => language === 'ar' || language === 'he', [language]);

  const t = useCallback((key: string): string => {
    return translate(key, language);
  }, [language]);

  useEffect(() => {
    const load = async () => {
      try {
        const [savedRole, savedCart, savedFavs, savedAuth, savedUser, savedLang, savedTheme, savedStore, savedOccasions, savedFavStores, savedCity, savedDeliveryLabel, savedOrders] = await Promise.all([
          AsyncStorage.getItem(ROLE_KEY),
          AsyncStorage.getItem(CART_KEY),
          AsyncStorage.getItem(FAVORITES_KEY),
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(STORE_KEY),
          AsyncStorage.getItem(OCCASIONS_KEY),
          AsyncStorage.getItem(FAV_STORES_KEY),
          AsyncStorage.getItem(CITY_KEY),
          AsyncStorage.getItem(DELIVERY_LABEL_KEY),
          AsyncStorage.getItem(ORDERS_KEY),
        ]);
        const savedSeedVersion = await AsyncStorage.getItem(SEED_VERSION_KEY);
        const needsSeed = savedSeedVersion !== CURRENT_SEED_VERSION;

        if (needsSeed) {
          setIsAuthenticated(false);
          setUser(null);
          setRole(null);
          setCart([]);
          setFavoriteIds([]);
          setFavoriteStoreIds([]);
          setStoreInfo(null);
          setPlacedOrders([]);
          setIsGuest(false);
          setHasSeenOnboardingState(false);
          await Promise.all([
            AsyncStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION),
            AsyncStorage.removeItem(AUTH_KEY),
            AsyncStorage.removeItem(USER_KEY),
            AsyncStorage.removeItem(ROLE_KEY),
            AsyncStorage.setItem(CART_KEY, JSON.stringify([])),
            AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([])),
            AsyncStorage.setItem(FAV_STORES_KEY, JSON.stringify([])),
            AsyncStorage.removeItem(STORE_KEY),
            AsyncStorage.setItem(ORDERS_KEY, JSON.stringify([])),
            AsyncStorage.removeItem(ONBOARDING_KEY),
            AsyncStorage.removeItem(GUEST_KEY),
          ]);
          if (savedLang === 'ar' || savedLang === 'he') setLanguageState(savedLang);
          if (savedTheme === 'dark') setIsDarkMode(true);
          if (savedOccasions) setOccasions(JSON.parse(savedOccasions));
          if (savedCity) setSelectedCityState(savedCity);
          if (savedDeliveryLabel) setDeliveryDisplayLabelState(savedDeliveryLabel);
        } else {
          if (savedAuth === 'true') {
            setIsAuthenticated(true);
            if (savedUser) setUser(JSON.parse(savedUser));
          }
          if (savedRole === 'customer' || savedRole === 'merchant') {
            setRole(savedRole);
          } else if (savedAuth === 'true') {
            setRole('customer');
          }
          if (savedCart) setCart(JSON.parse(savedCart));
          if (savedFavs) setFavoriteIds(JSON.parse(savedFavs));
          if (savedFavStores) setFavoriteStoreIds(JSON.parse(savedFavStores));
          if (savedLang === 'ar' || savedLang === 'he') setLanguageState(savedLang);
          if (savedTheme === 'dark') setIsDarkMode(true);
          if (savedStore) setStoreInfo(JSON.parse(savedStore));
          if (savedOccasions) setOccasions(JSON.parse(savedOccasions));
          if (savedCity) setSelectedCityState(savedCity);
          if (savedDeliveryLabel) setDeliveryDisplayLabelState(savedDeliveryLabel);
          if (savedOrders) setPlacedOrders(JSON.parse(savedOrders));
          const savedGuest = await AsyncStorage.getItem(GUEST_KEY);
          if (savedGuest === 'true') setIsGuest(true);
          const savedOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
          if (savedOnboarding === 'true') {
            setHasSeenOnboardingState(true);
          } else {
            setHasSeenOnboardingState(false);
          }
        }
        const [savedLocation, savedCoords, savedAddrs, savedProducts] = await Promise.all([
          AsyncStorage.getItem(USER_LOCATION_KEY),
          AsyncStorage.getItem('selected_coords'),
          AsyncStorage.getItem(ADDRESSES_KEY),
          AsyncStorage.getItem(PRODUCTS_KEY),
        ]);
        if (needsSeed) {
          setSavedAddresses(seedAddresses);
          await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(seedAddresses));
        } else if (savedAddrs) {
          setSavedAddresses(JSON.parse(savedAddrs));
        }
        if (savedProducts) {
          const parsed = JSON.parse(savedProducts);
          setProducts(parsed);
        } else {
          setProducts([]);
        }
        const [savedWalletBal, savedWalletTx, savedWalletPending] = await Promise.all([
          AsyncStorage.getItem(WALLET_BALANCE_KEY),
          AsyncStorage.getItem(WALLET_TRANSACTIONS_KEY),
          AsyncStorage.getItem(WALLET_PENDING_KEY),
        ]);
        if (needsSeed) {
          setWalletBalance(seedWalletBalance);
          setWalletTransactions(seedWalletTransactions);
          setWalletPending(seedWalletPending);
          setNotifications(seedNotifications);
          await Promise.all([
            AsyncStorage.setItem(WALLET_BALANCE_KEY, seedWalletBalance.toString()),
            AsyncStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(seedWalletTransactions)),
            AsyncStorage.setItem(WALLET_PENDING_KEY, seedWalletPending.toString()),
            AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(seedNotifications)),
          ]);
        } else {
          if (savedWalletBal !== null) setWalletBalance(parseFloat(savedWalletBal));
          if (savedWalletTx) setWalletTransactions(JSON.parse(savedWalletTx));
          if (savedWalletPending !== null) setWalletPending(parseFloat(savedWalletPending));
          const savedNotifs = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
          if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
        }
        if (savedCoords) {
          setSelectedCoords(JSON.parse(savedCoords));
        }
        if (savedLocation) {
          const loc = JSON.parse(savedLocation);
          setUserLocation(loc.coords || null);
          setLocationCity(loc.city || null);
          if (!savedCity && loc.city) {
            setSelectedCityState(loc.city);
          }
        }
      } catch (e) {
        void e;
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Firebase auth: sync state when Firebase user signs in/out (lazy-loaded so app registers first)
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsubscribe: (() => void) | null = null;
    onFirebaseAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAuthenticated(true);
        setRole('customer');
        AsyncStorage.setItem(AUTH_KEY, 'true');
        AsyncStorage.setItem(USER_KEY, JSON.stringify(firebaseUser));
        AsyncStorage.setItem(ROLE_KEY, 'customer');
        AsyncStorage.removeItem(GUEST_KEY);
      } else {
        AsyncStorage.getItem(USER_KEY).then((savedUser) => {
          if (!savedUser) {
            setUser(null);
            setIsAuthenticated(false);
            setRole(null);
            AsyncStorage.removeItem(AUTH_KEY);
            AsyncStorage.removeItem(USER_KEY);
            AsyncStorage.removeItem(ROLE_KEY);
          }
        });
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadFirebaseData = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    try {
      const firebase = await getFirebase();
      if (!firebase.db) return;
      const [fbCategories, fbProducts, fbBanners, fbStores] = await Promise.all([
        getCategories(),
        getProductsFromFirestore({ status: 'active' }),
        getBanners(),
        getMerchantsFromFirestore(),
      ]);
      console.log('[AppContext] جلب البيانات:', {
        تصنيفات: fbCategories.length,
        منتجات: fbProducts.length,
        بانرات: fbBanners.length,
        متاجر: Object.keys(fbStores).length,
      });
      const allCategory = { id: '0', name: 'الكل', nameEn: 'All', icon: 'grid-2x2' };
      const mappedCats = [
        allCategory,
        ...fbCategories.map((c) => ({
          id: String(c.id ?? c.docId ?? ''),
          name: (c.nameAr ?? c.name ?? '') as string,
          nameEn: (c.nameEn ?? c.name ?? '') as string,
          image: typeof c.icon === 'string' ? c.icon : typeof c.image === 'string' ? c.image : undefined,
          icon: undefined as string | undefined,
          color: c.color as string | undefined,
        })),
      ].filter((c) => c.id !== '');
      if (mappedCats.length > 0) setCategories(mappedCats);
      const favSet = new Set(favoriteIdsRef.current);
      const merged = fbProducts.map((p) => ({ ...p, isFavorite: favSet.has(p.id) }));
      setProducts(merged);
      if (fbBanners.length > 0) setBanners(fbBanners);
      setStoresById(fbStores);
      console.log('[AppContext] تم تعيين:', { تصنيفات: mappedCats.length, منتجات: merged.length });
    } catch (e) {
      console.warn('Firebase data load failed:', e);
    }
  }, []);

  const loadMerchantFirebaseData = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    try {
      const mid = await getCurrentMerchantId(user?.id);
      if (!mid) return;

      const status = await getMerchantStatus(mid);
      setMerchantStatus(status);
      
      console.log('[loadMerchantData] حالة التاجر:', status);

      const [profile, merchantProducts, merchantOrders, merchantTx] = await Promise.all([
        getMerchantProfile(mid),
        getMerchantProducts(mid),
        getMerchantOrders(mid),
        getMerchantTransactions(mid),
      ]);

      if (profile) {
        setStoreInfo(profile);
        await AsyncStorage.setItem(STORE_KEY, JSON.stringify(profile));
        console.log('[loadMerchantData] تم جلب بيانات المتجر من Firestore');
      }

      if (merchantProducts.length > 0) {
        setProducts((prev) => {
          const merchantProductIds = new Set(merchantProducts.map((p) => p.id));
          const otherProducts = prev.filter((p) => !merchantProductIds.has(p.id));
          return [...merchantProducts, ...otherProducts];
        });
        console.log('[loadMerchantData] منتجات التاجر:', merchantProducts.length);
      }

      if (merchantOrders.length > 0) {
        setPlacedOrders((prev) => {
          const firebaseOrderIds = new Set(merchantOrders.map((o) => o.id));
          const localOrders = prev.filter((o) => !firebaseOrderIds.has(o.id));
          return [...merchantOrders, ...localOrders];
        });
        console.log('[loadMerchantData] طلبات التاجر:', merchantOrders.length);
      }

      setWalletTransactions(merchantTx);
      const balance = Math.max(0, profile?.balance || 0);
      const pending = merchantTx
        .filter((tx) => tx.status === 'pending' && tx.type === 'withdrawal')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      setWalletBalance(balance);
      setWalletPending(pending);
      await Promise.all([
        AsyncStorage.setItem(WALLET_BALANCE_KEY, String(balance)),
        AsyncStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(merchantTx)),
        AsyncStorage.setItem(WALLET_PENDING_KEY, String(pending)),
      ]);
    } catch (e) {
      console.warn('[loadMerchantData] خطأ:', e);
    }
  }, [user]);

  useEffect(() => {
    if (isFirebaseConfigured()) loadFirebaseData();
  }, [loadFirebaseData]);

  useEffect(() => {
    if (role === 'merchant' && isFirebaseConfigured()) {
      loadMerchantFirebaseData();
    }
  }, [role, loadMerchantFirebaseData]);

  useEffect(() => {
    const detectLocation = async () => {
      setIsDetectingLocation(true);
      try {
        const coords = await getCurrentLocation();
        if (coords) {
          setUserLocation(coords);
          const majorCity = findNearestMajorCity(coords, language);
          setLocationCity(majorCity);
          const savedCity = await AsyncStorage.getItem(CITY_KEY);
          const savedLabel = await AsyncStorage.getItem(DELIVERY_LABEL_KEY);
          const labelLooksAutoDetected =
            !savedLabel || savedLabel.trim() === '' || savedLabel.trim() === (savedCity || '').trim() || savedLabel.trim() === majorCity.trim();

          if (!savedCity || savedCity === 'all') {
            const areaLabel = await reverseGeocodeToAreaLabel(coords, language).catch(() => '');
            const displayLabel = (areaLabel || '').trim() || majorCity;
            setSelectedCityState(majorCity);
            setDeliveryDisplayLabelState(displayLabel);
            await AsyncStorage.setItem(CITY_KEY, majorCity);
            await AsyncStorage.setItem(DELIVERY_LABEL_KEY, displayLabel);
            await AsyncStorage.setItem('selected_coords', JSON.stringify(coords));
            setSelectedCoords(coords);
          } else if (labelLooksAutoDetected) {
            const areaLabel = await reverseGeocodeToAreaLabel(coords, language).catch(() => '');
            const next = (areaLabel || '').trim();
            if (next && next !== savedLabel) {
              setDeliveryDisplayLabelState(next);
              await AsyncStorage.setItem(DELIVERY_LABEL_KEY, next);
            }
          }
          await AsyncStorage.setItem(USER_LOCATION_KEY, JSON.stringify({ coords, city: majorCity }));
        }
      } catch (e) {
        void e;
      } finally {
        setIsDetectingLocation(false);
      }
    };
    detectLocation();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const toggleDarkMode = useCallback(async () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const selectRole = useCallback(async (newRole: UserRole) => {
    setRole(newRole);
    await AsyncStorage.setItem(ROLE_KEY, newRole);
  }, []);

  const switchRole = useCallback(async () => {
    const newRole: UserRole = role === 'customer' ? 'merchant' : 'customer';
    setRole(newRole);
    await AsyncStorage.setItem(ROLE_KEY, newRole);

    // Sync with Firestore
    if (user?.id && isFirebaseConfigured()) {
      updateUserLastRole(user.id, newRole).catch(err => console.warn('Sync role error:', err));
    }
  }, [role, user, isFirebaseConfigured]);

  const login = useCallback(async (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setRole('customer');
    await Promise.all([
      AsyncStorage.setItem(AUTH_KEY, 'true'),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      AsyncStorage.setItem(ROLE_KEY, 'customer'),
    ]);
  }, []);

  const loginWithFirebaseToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    const result = await firebaseLoginWithToken(token);
    if (result.success && result.user) {
      await login(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  }, [login]);

  const register = useCallback(async (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setRole('customer');
    await Promise.all([
      AsyncStorage.setItem(AUTH_KEY, 'true'),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      AsyncStorage.setItem(ROLE_KEY, 'customer'),
    ]);
  }, []);

  const logout = useCallback(async () => {
    if (isFirebaseConfigured()) {
      try {
        await firebaseLogout();
      } catch (e) {
        void e;
      }
    }
    setRole(null);
    setIsAuthenticated(false);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(ROLE_KEY),
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }, []);

  const registerStore = useCallback(async (info: StoreInfo) => {
    setStoreInfo(info);
    if (user) {
      const updatedUser = { ...user, hasStore: true, storeName: info.name };
      setUser(updatedUser);
      await Promise.all([
        AsyncStorage.setItem(STORE_KEY, JSON.stringify(info)),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser)),
      ]);
      if (isFirebaseConfigured()) {
        try {
          await registerMerchantInFirestore(info, user);
          setMerchantStatus('pending');
          console.log('[registerStore] تم تسجيل المتجر في Firestore - الحالة: pending');
        } catch (e) {
          console.error('[registerStore] خطأ تسجيل المتجر في Firestore:', e);
        }
      }
    }
  }, [user]);

  const updateStoreInfo = useCallback(async (data: Partial<StoreInfo>) => {
    const current = storeInfo ?? { name: '', username: '', entityType: 'individual' as EntityType, city: '', isOpen: true };
    const updated = { ...current, ...data };
    setStoreInfo(updated);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
    if (data.name && user) {
      const updatedUser = { ...user, storeName: data.name };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
    if (isFirebaseConfigured()) {
      try {
        const mid = await getCurrentMerchantId(user?.id);
        if (mid) {
          await updateMerchantInFirestore(mid, data, {
            name: user?.name,
            email: user?.email || data.email,
            phone: user?.phone || data.phone,
          });
          console.log('[updateStoreInfo] تم تحديث المتجر في Firestore');
        }
      } catch (e) {
        console.error('[updateStoreInfo] خطأ:', e);
      }
    }
  }, [storeInfo, user]);

  const updateUser = useCallback(async (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    if (isFirebaseConfigured()) {
      await updateCustomerProfileInFirestore({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        avatar: updated.avatar,
      });
    }
  }, [user]);

  const toggleStoreOpen = useCallback(async () => {
    if (!storeInfo) return;
    const newOpen = !storeInfo.isOpen;
    const updated = { ...storeInfo, isOpen: newOpen };
    setStoreInfo(updated);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(updated));
    if (isFirebaseConfigured()) {
      try {
        const mid = await getCurrentMerchantId(user?.id);
        if (mid) await toggleMerchantOpen(mid, newOpen);
      } catch (e) {
        console.error('[toggleStoreOpen] خطأ:', e);
      }
    }
  }, [storeInfo, user]);

  const setSelectedCity = useCallback(async (city: string, coords?: LocationCoords, displayLabel?: string | null) => {
    setSelectedCityState(city);
    if (coords) setSelectedCoords(coords);

    let nextLabel: string | null;
    if (displayLabel !== undefined) {
      nextLabel = displayLabel === '' ? null : displayLabel;
    } else {
      nextLabel = city !== 'all' ? city : null;
    }
    setDeliveryDisplayLabelState(nextLabel);

    await AsyncStorage.setItem(CITY_KEY, city);
    if (coords) {
      await AsyncStorage.setItem('selected_coords', JSON.stringify(coords));
    }
    if (nextLabel != null) {
      await AsyncStorage.setItem(DELIVERY_LABEL_KEY, nextLabel);
    } else {
      await AsyncStorage.removeItem(DELIVERY_LABEL_KEY);
    }
  }, []);

  /** متاجر ضمن نطاق التوصيل من إحداثيات Deliver to / الموقع (بيانات Firestore) */
  const nearbyStoreIds = useMemo(() => {
    const refCoords = selectedCoords || userLocation;
    if (!refCoords) return null;
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const s of Object.values(storesById)) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      const lat = s.latitude;
      const lng = s.longitude;
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) continue;
      if (getDistance(refCoords.latitude, refCoords.longitude, lat, lng) <= RADIUS_KM) {
        ids.push(s.id);
      }
    }
    return ids.length > 0 ? ids : null;
  }, [selectedCoords, userLocation, storesById]);

  const addSavedAddress = useCallback(async (address: SavedAddress) => {
    const updated = [...savedAddresses, address];
    setSavedAddresses(updated);
    await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updated));
  }, [savedAddresses]);

  const updateSavedAddress = useCallback(async (address: SavedAddress) => {
    const updated = savedAddresses.map(a => a.id === address.id ? address : a);
    setSavedAddresses(updated);
    await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updated));
  }, [savedAddresses]);

  const deleteSavedAddress = useCallback(async (id: string) => {
    const updated = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(updated);
    await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updated));
  }, [savedAddresses]);

  const enterGuestMode = useCallback(async () => {
    setIsGuest(true);
    setRole('customer');
    await Promise.all([
      AsyncStorage.setItem(GUEST_KEY, 'true'),
      AsyncStorage.setItem(ROLE_KEY, 'customer'),
    ]);
  }, []);

  const exitGuestMode = useCallback(async () => {
    setIsGuest(false);
    setRole(null);
    await Promise.all([
      AsyncStorage.removeItem(GUEST_KEY),
      AsyncStorage.removeItem(ROLE_KEY),
    ]);
  }, []);

  const setHasSeenOnboarding = useCallback(async () => {
    setHasSeenOnboardingState(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const addToCart = useCallback(async (
    product: Product,
    quantity: number = 1,
    giftCard?: any,
    selectedOptions?: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> => {
    const currentCart = cart;
    const resolveCartCity = (p: Product): string => {
      const directCity = (p.city || '').trim();
      if (directCity) return directCity;
      const storeCity = (p.storeId && storesById[p.storeId]?.city) || '';
      return storeCity.trim();
    };

    const incomingCity = resolveCartCity(product);
    if (incomingCity && currentCart.length > 0) {
      const conflict = currentCart.some((item) => {
        const existingCity = resolveCartCity(item.product);
        return !!existingCity && existingCity !== incomingCity;
      });
      if (conflict) return { success: false, error: 'city_conflict' };
    }
    const productId = String(product.id);
    const optSig = selectedOptionsSignature(selectedOptions);
    const optionsPayload =
      selectedOptions && Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined;
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          String(item.product.id) === productId &&
          selectedOptionsSignature(item.selectedOptions as Record<string, string>) === optSig
      );
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((item) =>
          String(item.product.id) === productId &&
          selectedOptionsSignature(item.selectedOptions as Record<string, string>) === optSig
            ? { ...item, quantity: item.quantity + quantity, ...(giftCard ? { giftCard } : {}) }
            : item
        );
      } else {
        updated = [
          ...prev,
          {
            product,
            quantity,
            ...(giftCard ? { giftCard } : {}),
            ...(optionsPayload ? { selectedOptions: optionsPayload } : {}),
          },
        ];
      }
      AsyncStorage.setItem(CART_KEY, JSON.stringify(updated)).catch(() => { });
      return updated;
    });
    return { success: true };
  }, [cart, storesById]);

  const removeFromCart = useCallback(async (productId: string, optionsSignature?: string) => {
    const id = String(productId);
    setCart((prev) => {
      const updated =
        optionsSignature === undefined
          ? prev.filter((item) => String(item.product.id) !== id)
          : prev.filter(
              (item) =>
                !(
                  String(item.product.id) === id &&
                  selectedOptionsSignature(item.selectedOptions as Record<string, string>) === optionsSignature
                )
            );
      AsyncStorage.setItem(CART_KEY, JSON.stringify(updated)).catch(() => { });
      return updated;
    });
  }, []);

  const clearCart = useCallback(async () => {
    setCart([]);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify([]));
  }, []);

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number, optionsSignature?: string) => {
      const id = String(productId);
      if (quantity <= 0) {
        removeFromCart(id, optionsSignature);
        return;
      }
      setCart((prev) => {
        const next = prev.map((item) => {
          if (String(item.product?.id) !== id) return item;
          if (optionsSignature !== undefined) {
            if (selectedOptionsSignature(item.selectedOptions as Record<string, string>) !== optionsSignature) {
              return item;
            }
            return { ...item, quantity };
          }
          const sameProductLines = prev.filter((i) => String(i.product?.id) === id);
          if (sameProductLines.length !== 1) return item;
          return { ...item, quantity };
        });
        AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => { });
        return next;
      });
    },
    [removeFromCart]
  );

  const toggleFavorite = useCallback(async (productId: string) => {
    setFavoriteIds((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p
      )
    );
  }, []);

  const toggleFavoriteStore = useCallback(async (storeId: string) => {
    setFavoriteStoreIds((prev) => {
      const updated = prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId];
      AsyncStorage.setItem(FAV_STORES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addOccasion = useCallback(async (occasion: Occasion) => {
    setOccasions((prev) => {
      const updated = [...prev, occasion];
      AsyncStorage.setItem(OCCASIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeOccasion = useCallback(async (id: string) => {
    setOccasions((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      AsyncStorage.setItem(OCCASIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const pushNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      isRead: false,
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 100);
      AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === notifId ? { ...n, isRead: true } : n);
      AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllNotificationsRead = useCallback((targetRole: 'customer' | 'merchant') => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.targetRole === targetRole ? { ...n, isRead: true } : n);
      AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const customerNotifications = useMemo(() => notifications.filter((n) => n.targetRole === 'customer'), [notifications]);
  const merchantNotifications = useMemo(() => notifications.filter((n) => n.targetRole === 'merchant'), [notifications]);
  const unreadCustomerNotifCount = useMemo(() => customerNotifications.filter((n) => !n.isRead).length, [customerNotifications]);
  const unreadMerchantNotifCount = useMemo(() => merchantNotifications.filter((n) => !n.isRead).length, [merchantNotifications]);

  const getStatusLabel = useCallback((status: string, lang: Language) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      confirmed: { ar: 'قيد التجهيز', en: 'Confirmed' },
      processing: { ar: 'قيد التجهيز', en: 'Processing' },
      delivered: { ar: 'تم التسليم', en: 'Delivered' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      not_received: { ar: 'عدم استلام الطلب', en: 'Not Received' },
    };
    const langKey: 'ar' | 'en' = lang === 'ar' ? 'ar' : 'en';
    return labels[status]?.[langKey] ?? status;
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    setPlacedOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === orderId) {
          pushNotification({
            type: 'order_status',
            title: language === 'ar' ? `تحديث الطلب ${o.orderNumber}` : `Order ${o.orderNumber} Update`,
            message: language === 'ar'
              ? `تم تغيير حالة طلبك إلى: ${getStatusLabel(newStatus, language)}`
              : `Your order status changed to: ${getStatusLabel(newStatus, language)}`,
            targetRole: 'customer',
            orderId: o.id,
          });

          const shouldManageWalletLocally = !isFirebaseConfigured();
          const isOrderFinishing = newStatus === 'completed';
          const wasOrderFinished = o.status === 'completed';

          if (shouldManageWalletLocally && isOrderFinishing && !wasOrderFinished) {
            setWalletBalance((bal) => {
              const newBal = bal + o.total;
              AsyncStorage.setItem(WALLET_BALANCE_KEY, String(newBal));
              return newBal;
            });
            const tx: WalletTransaction = {
              id: `tx_${Date.now()}`,
              type: 'credit',
              amount: o.total,
              description: `${o.orderNumber} - ${o.customerName}`,
              date: new Date().toISOString().split('T')[0],
              createdAtMs: Date.now(),
              status: 'completed',
            };
            setWalletTransactions((prevTx) => {
              const updatedTx = [tx, ...prevTx];
              AsyncStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(updatedTx));
              return updatedTx;
            });
            pushNotification({
              type: 'wallet_credit',
              title: language === 'ar' ? 'إيداع في المحفظة' : 'Wallet Credit',
              message: language === 'ar'
                ? `تم إضافة ${o.total} ₪ إلى محفظتك من الطلب ${o.orderNumber}`
                : `${o.total} ₪ added to your wallet from order ${o.orderNumber}`,
              targetRole: 'merchant',
              orderId: o.id,
            });
          }

          if (shouldManageWalletLocally && newStatus === 'cancelled' && wasOrderFinished) {
            setWalletBalance((bal) => {
              const newBal = Math.max(0, bal - o.total);
              AsyncStorage.setItem(WALLET_BALANCE_KEY, String(newBal));
              return newBal;
            });
            const tx: WalletTransaction = {
              id: `tx_${Date.now()}_refund`,
              type: 'debit',
              amount: o.total,
              description: language === 'ar'
                ? `استرداد - إلغاء الطلب ${o.orderNumber}`
                : `Refund - Order ${o.orderNumber} cancelled`,
              date: new Date().toISOString().split('T')[0],
              createdAtMs: Date.now(),
              status: 'completed',
            };
            setWalletTransactions((prevTx) => {
              const updatedTx = [tx, ...prevTx];
              AsyncStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(updatedTx));
              return updatedTx;
            });
            pushNotification({
              type: 'wallet_credit',
              title: language === 'ar' ? 'خصم من المحفظة' : 'Wallet Debit',
              message: language === 'ar'
                ? `تم خصم ${o.total} ₪ من محفظتك بسبب إلغاء الطلب ${o.orderNumber}`
                : `${o.total} ₪ deducted from your wallet due to cancellation of order ${o.orderNumber}`,
              targetRole: 'merchant',
              orderId: o.id,
            });
          }

          return { ...o, status: newStatus as any };
        }
        return o;
      });
      AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated)).catch(() => { });
      return updated;
    });

    if (isFirebaseConfigured()) {
      try {
        await updateOrderStatusInFirestore(orderId, newStatus, user?.id);
        await loadMerchantFirebaseData();
        console.log('[updateOrderStatus] تم تحديث حالة الطلب في Firestore:', orderId, newStatus);
      } catch (e) {
        console.error('[updateOrderStatus] خطأ Firestore:', e);
      }
    }
  }, [pushNotification, language, getStatusLabel, user, loadMerchantFirebaseData]);

  const requestWithdrawal = useCallback(async (amount: number): Promise<{ success: boolean; message?: string }> => {
    if (amount <= 0) {
      return { success: false, message: 'invalid_amount' };
    }

    if (amount > walletBalance) {
      return { success: false, message: 'insufficient_balance' };
    }

    if (isFirebaseConfigured()) {
      try {
        const mid = await getCurrentMerchantId(user?.id);
        if (!mid) {
          return { success: false, message: 'merchant_not_found' };
        }
        await requestWithdrawalInFirestore(mid, amount, {
          bankName: storeInfo?.bankName,
          iban: storeInfo?.iban,
          beneficiaryName: storeInfo?.beneficiaryName,
        });
        await loadMerchantFirebaseData();
        return { success: true };
      } catch (e) {
        console.error('[requestWithdrawal] خطأ Firestore:', e);
        return { success: false, message: e instanceof Error ? e.message : 'withdrawal_failed' };
      }
    } else {
      setWalletPending((prev) => {
        const newP = prev + amount;
        AsyncStorage.setItem(WALLET_PENDING_KEY, String(newP));
        return newP;
      });

      const tx: WalletTransaction = {
        id: `tx_${Date.now()}`,
        type: 'withdrawal',
        amount,
        description: storeInfo?.bankName ? `${storeInfo.bankName}` : 'Withdrawal',
        date: new Date().toISOString().split('T')[0],
        createdAtMs: Date.now(),
        status: 'pending',
      };
      setWalletTransactions((prevTx) => {
        const updatedTx = [tx, ...prevTx];
        AsyncStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(updatedTx));
        return updatedTx;
      });
    }

    return { success: true };
  }, [storeInfo, user, walletBalance, loadMerchantFirebaseData]);

  const resolveWithdrawal = useCallback(async (txId: string, approved: boolean) => {
    setWalletTransactions((prevTx) => {
      const tx = prevTx.find((t) => t.id === txId);
      if (!tx || tx.status !== 'pending') return prevTx;

      const updated = prevTx.map((t) => {
        if (t.id === txId) {
          return { ...t, status: (approved ? 'completed' : 'failed') as WalletTransaction['status'] };
        }
        return t;
      });

      const pendingAmount = tx.amount;
      setWalletPending((prev) => {
        const newP = Math.max(0, prev - pendingAmount);
        AsyncStorage.setItem(WALLET_PENDING_KEY, String(newP));
        return newP;
      });

      if (!approved) {
        setWalletBalance((bal) => {
          const newBal = bal + pendingAmount;
          AsyncStorage.setItem(WALLET_BALANCE_KEY, String(newBal));
          return newBal;
        });
      }

      pushNotification({
        type: 'withdrawal_resolved',
        title: language === 'ar'
          ? (approved ? 'تمت الموافقة على السحب' : 'تم رفض السحب')
          : (approved ? 'Withdrawal Approved' : 'Withdrawal Rejected'),
        message: language === 'ar'
          ? (approved ? `تم تحويل ${pendingAmount} ₪ إلى حسابك البنكي` : `تم رفض طلب سحب ${pendingAmount} ₪ وإعادة المبلغ للمحفظة`)
          : (approved ? `${pendingAmount} ₪ has been transferred to your bank` : `Withdrawal of ${pendingAmount} ₪ was rejected, amount returned to wallet`),
        targetRole: 'merchant',
      });

      AsyncStorage.setItem(WALLET_TRANSACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [pushNotification, language]);

  const addProduct = useCallback(async (product: Product) => {
    if (isFirebaseConfigured()) {
      const mid = await getCurrentMerchantId(user?.id);
      if (!mid) {
        throw new Error('merchant_id_missing');
      }
      const firestoreId = await addProductToFirestore(product, mid);
      const productWithFirestoreId = { ...product, id: firestoreId, storeId: mid };
      setProducts((prev) => [productWithFirestoreId, ...prev]);
      console.log('[addProduct] تم إضافة المنتج في Firestore:', firestoreId);
      return;
    }

    setProducts((prev) => {
      const updated = [product, ...prev];
      AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated)).catch(() => { });
      return updated;
    });
  }, [user]);

  const updateProduct = useCallback(async (productId: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const updated = prev.map((p) => p.id === productId ? { ...p, ...updates } : p);
      AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated)).catch(() => { });
      return updated;
    });
    if (isFirebaseConfigured()) {
      try {
        await updateProductInFirestore(productId, updates);
        console.log('[updateProduct] تم تحديث المنتج في Firestore:', productId);
      } catch (e) {
        console.error('[updateProduct] خطأ Firestore:', e);
      }
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated)).catch(() => { });
      return updated;
    });
    if (isFirebaseConfigured()) {
      try {
        await deleteProductFromFirestore(productId);
        console.log('[deleteProduct] تم حذف المنتج من Firestore:', productId);
      } catch (e) {
        console.error('[deleteProduct] خطأ Firestore:', e);
      }
    }
  }, []);

  const placeOrder = useCallback(async (orderData: {
    address: string;
    addressCoords?: { latitude: number; longitude: number };
    city?: string;
    region?: string;
    phone?: string;
    recipientName?: string;
    recipientPhone?: string;
    deliveryMethod?: 'branch' | 'delivery';
    branchName?: string;
    branchLocation?: string;
    paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'apple_pay' | 'stc_pay' | 'mada' | 'tabby';
    paymentStatus?: string;
    tapChargeId?: string;
    deliveryDate?: string;
    deliveryTimeSlot?: string;
    deliveryOptionName?: string;
    notes?: Record<string, string>;
  }) => {
    const groupedByStore: Record<string, CartItem[]> = {};
    cart.forEach((item) => {
      const storeKey = item.product.storeId || item.product.shopName || 'unknown';
      if (!groupedByStore[storeKey]) groupedByStore[storeKey] = [];
      groupedByStore[storeKey].push(item);
    });

    const newOrders: Order[] = Object.entries(groupedByStore).map(([storeKey, items], idx) => {
      const giftFees = items.reduce((sum, i) => sum + (i.giftCard && i.product.giftCardFee ? i.product.giftCardFee : 0), 0);
      const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0) + giftFees;
      const quantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const giftCardItem = items.find((i) => i.giftCard);
      const orderNum = `GLD-${Date.now().toString().slice(-4)}${idx}`;
      const merchantId = items[0].product.storeId || '';
      const p0 = items[0].product;
      let storeName = (p0.shopName || '').trim();
      if (!storeName) {
        const mid = p0.storeId ? String(p0.storeId) : '';
        if (mid && storesById[mid]?.name?.trim()) {
          storeName = storesById[mid].name.trim();
        } else if (storesById[storeKey]?.name?.trim()) {
          storeName = storesById[storeKey].name.trim();
        }
      }
      if (!storeName && storeKey && storeKey !== 'unknown') {
        const k = String(storeKey).trim();
        const looksLikeId = k.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(k) && !/[\u0600-\u06FF]/.test(k) && !/\s/.test(k);
        if (!looksLikeId) storeName = k;
      }
      if (!storeName) storeName = language === 'ar' ? 'متجر' : 'Store';
      return {
        id: `order_${Date.now()}_${idx}`,
        orderNumber: orderNum,
        customerName: user?.name ?? 'عميل',
        customerPhone: orderData.phone ?? user?.phone ?? '',
        customerEmail: user?.email ?? '',
        productName: items.map((i) => i.product.name).join(', '),
        productImage: items[0].product.image,
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
          originalPrice: i.product.originalPrice && i.product.originalPrice > i.product.price ? i.product.originalPrice : undefined,
          image: i.product.image,
          ...(i.selectedOptions && Object.keys(i.selectedOptions).length > 0
            ? { selectedOptions: i.selectedOptions as Record<string, string> }
            : {}),
        })),
        total,
        quantity,
        status: 'pending' as const,
        date: new Date().toISOString().split('T')[0],
        address: orderData.address,
        addressCoords: orderData.addressCoords,
        notes: items
          .map((i) => orderData.notes?.[String(i.product.id)] ?? orderData.notes?.[i.product.id as string])
          .filter(Boolean)
          .join(' | ') || undefined,
        isPaid: orderData.paymentMethod !== 'cash',
        paymentStatus: orderData.paymentStatus,
        tapChargeId: orderData.tapChargeId,
        storeName,
        storeId: merchantId,
        merchantId,
        customerId: user?.id,
        paymentMethod: orderData.paymentMethod,
        giftCard: giftCardItem?.giftCard,
        giftCardFee: giftFees > 0 ? giftFees : undefined,
        deliveryDate: orderData.deliveryDate,
        deliveryTimeSlot: orderData.deliveryTimeSlot,
        deliveryOptionName: orderData.deliveryOptionName,
        city: orderData.city,
        region: orderData.region,
        deliveryMethod: orderData.deliveryMethod ?? 'delivery',
        recipientName: orderData.recipientName,
        recipientPhone: orderData.recipientPhone,
        branchName: orderData.branchName,
        branchLocation: orderData.branchLocation,
      };
    });

    setPlacedOrders((prev) => {
      const updated = [...newOrders, ...prev];
      AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
      return updated;
    });

    newOrders.forEach((order) => {
      pushNotification({
        type: 'new_order',
        title: language === 'ar' ? `طلب جديد ${order.orderNumber}` : `New Order ${order.orderNumber}`,
        message: language === 'ar'
          ? `طلب جديد من ${order.customerName} بقيمة ${order.total} ₪`
          : `New order from ${order.customerName} worth ${order.total} ₪`,
        targetRole: 'merchant',
        orderId: order.id,
      });
    });

    setCart([]);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify([]));

    if (isFirebaseConfigured()) {
      const idMapping: Record<string, string> = {};
      for (const order of newOrders) {
        try {
          const customerId = user?.id || '';
          const merchantId = order.storeId || '';
          const firestoreId = await placeOrderInFirestore({
            orderNumber: order.orderNumber,
            merchantId,
            customerId,
            customerName: order.customerName,
            customerPhone: order.customerPhone || '',
            customerEmail: order.customerEmail || '',
            productId: order.items?.[0]?.id,
            items: order.items.map((i) => ({
              productId: i.id || '',
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              image: i.image,
              ...(i.selectedOptions && Object.keys(i.selectedOptions).length > 0
                ? { selectedOptions: i.selectedOptions as Record<string, string> }
                : {}),
            })),
            totalAmount: order.total,
            quantity: order.quantity,
            status: 'pending',
            deliveryAddress: order.address,
            deliveryMethod: order.deliveryMethod || 'delivery',
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTimeSlot,
            deliveryOptionName: order.deliveryOptionName,
            recipientName: order.recipientName,
            recipientPhone: order.recipientPhone,
            recipientCity: order.city,
            recipientRegion: order.region,
            addressCoords: order.addressCoords,
            branchName: order.branchName,
            branchLocation: order.branchLocation,
            customerNote: order.notes,
            paymentMethod: order.paymentMethod,
            isPaid: order.isPaid,
            giftCard: order.giftCard ? {
              fromName: order.giftCard.fromName,
              toName: order.giftCard.toName,
              message: order.giftCard.message,
              hideSenderIdentity: order.giftCard.hideIdentity,
            } : undefined,
            giftCardFee: order.giftCardFee,
            paymentStatus: order.paymentStatus,
            tapChargeId: order.tapChargeId,
          });
          idMapping[order.id] = firestoreId;
          console.log('[placeOrder] تم إنشاء الطلب في Firestore:', firestoreId);
        } catch (e) {
          console.error('[placeOrder] خطأ Firestore:', e);
        }
      }
      if (Object.keys(idMapping).length > 0) {
        setPlacedOrders((prev) => {
          const updated = prev.map((o) => idMapping[o.id] ? { ...o, id: idMapping[o.id] } : o);
          AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated)).catch(() => { });
          return updated;
        });
        newOrders.forEach((o) => {
          if (idMapping[o.id]) o.id = idMapping[o.id];
        });
      }
    }

    return newOrders;
  }, [cart, user, pushNotification, language, storesById]);

  const cartTotal = useMemo(
    () => {
      const total = cart.reduce((sum, item) => {
        const price = Number(item.product?.price) || 0;
        const qty = Number(item.quantity) || 0;
        return sum + (price * qty);
      }, 0);
      if (isNaN(total)) console.warn('cartTotal calculated as NaN!', cart);
      return total;
    },
    [cart]
  );

  const cartGiftCardTotal = useMemo(
    () => {
      const total = cart.reduce((sum, item) => {
        const fee = (item.giftCard && item.product?.giftCardFee) ? Number(item.product.giftCardFee) : 0;
        return sum + (isNaN(fee) ? 0 : fee);
      }, 0);
      if (isNaN(total)) console.warn('cartGiftCardTotal calculated as NaN!', cart);
      return total;
    },
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const favoriteProducts = useMemo(
    () => products.filter((p) => favoriteIds.includes(p.id)),
    [products, favoriteIds]
  );

  const visibleProducts = useMemo(
    () => storeInfo?.isOpen ? products.filter((p) => !p.isHidden) : [],
    [products, storeInfo]
  );

  /** عرض كل المنتجات بدون أي فلترة حسب المدينة أو النطاق */
  const filteredProductsByCity = useMemo(() => {
    return products;
  }, [products]);

  const refreshCustomerOrders = useCallback(async () => {
    if (!isFirebaseConfigured() || !user?.id) return;
    try {
      const fbOrders = await getCustomerOrders(user.id);
      if (fbOrders.length > 0) {
        setPlacedOrders((prev) => {
          const fbOrderIds = new Set(fbOrders.map((o) => o.id));
          const localOnly = prev.filter((o) => !fbOrderIds.has(o.id));
          const merged = [...fbOrders, ...localOnly];
          AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(merged)).catch(() => { });
          return merged;
        });
        console.log('[refreshCustomerOrders] تم تحديث طلبات العميل:', fbOrders.length);
      }
    } catch (e) {
      console.warn('[refreshCustomerOrders] خطأ:', e);
    }
  }, [user]);

  const merchantOrders = useMemo(() => {
    if (!user?.id) return placedOrders;
    const mid = user.id;
    // Strictly filter orders where storeId matches merchant ID
    return placedOrders.filter((o) => o.storeId === mid || o.merchantId === mid);
  }, [placedOrders, user]);

  const customerOrders = useMemo(() => {
    if (!user?.id) return placedOrders;
    const uid = user.id;
    // Strictly filter orders where customerId matches user ID 
    // or where there is no storeId/merchantId (fallback)
    return placedOrders.filter((o) => o.customerId === uid || (!o.storeId && !o.merchantId));
  }, [placedOrders, user]);

  const merchantProducts = useMemo(() => {
    if (!user?.id) return products;
    const mid = user.id;
    return products.filter((p) => p.storeId === mid);
  }, [products, user]);

  const storesList = useMemo(() => {
    return Array.from(new Map(Object.values(storesById).map(s => [s.id, s])).values());
  }, [storesById]);

  return {
    role,
    isLoading,
    isAuthenticated,
    user,
    cart,
    cartTotal,
    cartGiftCardTotal,
    cartCount,
    favoriteIds,
    favoriteProducts,
    favoriteStoreIds,
    categories,
    banners,
    products,
    storesById,
    storesList,
    visibleProducts,
    filteredProductsByCity,
    language,
    isDarkMode,
    isRTL,
    colors,
    storeInfo,
    occasions,
    selectedCity,
    deliveryDisplayLabel,
    selectedCoords,
    nearbyStoreIds,
    isGuest,
    hasSeenOnboarding,
    userLocation,
    isDetectingLocation,
    locationCity,
    selectRole,
    switchRole,
    login,
    register,
    logout,
    loginWithFirebaseToken,
    requestOtp: firebaseRequestOtp,
    checkOtp: firebaseCheckOtp,
    registerCustomerDirectly,
    verifyOtp: verifyOtpCode,
    updateAuthPassword: firebaseUpdateAuthPassword,
    isFirebaseConfigured,
    setLanguage,
    toggleDarkMode,
    registerStore,
    updateStoreInfo,
    updateUser,
    toggleStoreOpen,
    setSelectedCity,
    addToCart,
    removeFromCart,
    clearCart,
    updateCartQuantity,
    toggleFavorite,
    toggleFavoriteStore,
    addOccasion,
    removeOccasion,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshFirebaseData: loadFirebaseData,
    merchantStatus,
    refreshMerchantData: loadMerchantFirebaseData,
    uploadImageToStorage,
    enterGuestMode,
    exitGuestMode,
    setHasSeenOnboarding,
    placedOrders,
    merchantOrders,
    customerOrders,
    merchantProducts,
    placeOrder,
    refreshCustomerOrders,
    updateOrderStatus,
    walletBalance,
    walletTransactions,
    walletPending,
    requestWithdrawal,
    resolveWithdrawal,
    savedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    notifications,
    customerNotifications,
    merchantNotifications,
    unreadCustomerNotifCount,
    unreadMerchantNotifCount,
    pushNotification,
    markNotificationRead,
    markAllNotificationsRead,
    getStatusLabel,
    t,
  };
});
