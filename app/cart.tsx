import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  createTapCharge,
  verifyTapPayment,
  createTabbyCheckout,
  sendTabbyHppLink,
  getTabbyPaymentStatus,
  parseTabbyCheckoutResponse,
} from '@/services/payment';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Clock,
  CreditCard,
  ChevronLeft,
  Calendar,
  MessageSquare,
  X,
  Link2,
  Check,
  Pencil,
  Truck,
  Store,
  Navigation,
  Phone,
  User,
  FileText,
  Building2,
  ExternalLink,
  Tag,
  Receipt,
  Package,
  Gift,
  Heart,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import MapPickerModal from '@/components/MapPickerModal';
import { ApplePayMark } from '@/components/ApplePayMark';
import { TabbyBnplLogo } from '@/components/PaymentMethodLogos';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import CalendarPicker from '@/components/CalendarPicker';
import { JanaAssistant } from '@/components/JanaCharacter';
import { reverseGeocodeToAddress, reverseGeocodeToCity, LocationCoords } from '@/utils/location';
import { selectedOptionsSignature } from '@/utils/cartLine';
import { SavedAddress, Branch, DeliveryOption, CartItem } from '@/types';
import { formatDeliveryPeriodLabel, summarizeDeliveryPeriods } from '@/utils/delivery';
import { getMerchantBranches, getMerchantDeliveryOptions } from '@/services/merchantFirestore';
import { getFirebase, isFirebaseConfigured } from '@/services/firebase';
import { getMerchantById } from '@/services/firestore';

type BranchWithMerchant = Branch & { sourceMerchantId?: string };
type DeliveryOptionWithMerchant = DeliveryOption & { sourceMerchantId?: string };

const { width } = Dimensions.get('window');

const STEPS = ['cartStep', 'addressStep', 'paymentStep'] as const;

const DAY_KEYS: Record<string, string> = {
  sat: 'sat', sun: 'sun', mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri',
};

function isSafeRemoteImageUri(image: unknown): image is string {
  if (typeof image !== 'string') return false;
  const t = image.trim();
  if (!t) return false;
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('file://') ||
    t.startsWith('content://')
  );
}

/** Grouping key that looks like a Firestore id — never show it as the visible store name. */
function isLikelyTechnicalStoreKey(key: string): boolean {
  const t = key.trim();
  if (!t || t === 'Unknown') return true;
  if (t.length < 16) return false;
  if (/[\u0600-\u06FF]/.test(t) || /\s/.test(t)) return false;
  return /^[a-zA-Z0-9_-]+$/.test(t);
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    cart,
    cartTotal,
    cartGiftCardTotal,
    removeFromCart,
    updateCartQuantity,
    placeOrder,
    colors,
    t,
    language,
    savedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    userLocation,
    user,
    isRTL,
    storesById,
  } = useApp();

  console.log('--- CART SCREEN DEBUG ---');
  console.log('Cart Items Count:', cart?.length);
  console.log('Cart Total:', cartTotal);
  console.log('Cart Gift Card Total:', cartGiftCardTotal);
  console.log('User ID:', user?.id);
  console.log('User Location:', !!userLocation);

  useEffect(() => {
    console.log('CartScreen Mounted');
    return () => console.log('CartScreen Unmounted');
  }, []);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    (savedAddresses?.length || 0) > 0 ? savedAddresses[0].id : null
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState('cash_on_delivery');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [orderAlertConfig, setOrderAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'success', message: '' });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const dismissOrderAlert = useCallback(() => setOrderAlertConfig(prev => ({ ...prev, visible: false })), []);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: userLocation?.latitude || 21.4225,
    longitude: userLocation?.longitude || 39.8262,
  });
  const [mapAddress, setMapAddress] = useState('');
  const [mapCity, setMapCity] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [orderType, setOrderType] = useState<'self' | 'gift' | null>(null);
  const [showOrderTypeChoice, setShowOrderTypeChoice] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState<string | null>(null);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<string>('');
  const [showDeliveryCalendar, setShowDeliveryCalendar] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentWebViewUrl, setPaymentWebViewUrl] = useState<string | null>(null);
  const [paymentWebViewTitle, setPaymentWebViewTitle] = useState('');
  const [paymentFlow, setPaymentFlow] = useState<'tap' | 'tabby' | null>(null);
  const [paymentWebViewError, setPaymentWebViewError] = useState<string | null>(null);
  const processOrderPlacementRef = useRef<((status?: string, gatewayPaymentId?: string) => Promise<void>) | null>(null);
  const tabbyPaymentIdRef = useRef<string | null>(null);
  const callbackUrlRef = useRef<string | null>(null);

  const registeredPhone = user?.phone || '';

  const [fetchedBranches, setFetchedBranches] = useState<BranchWithMerchant[]>([]);
  const [fetchedDeliveryOptions, setFetchedDeliveryOptions] = useState<DeliveryOptionWithMerchant[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [fulfillmentByMerchant, setFulfillmentByMerchant] = useState<
    Record<string, { deliveryEnabled: boolean; pickupEnabled: boolean }>
  >({});

  const cartMerchantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of cart) {
      const sid = item.product?.storeId;
      if (sid != null && String(sid).trim() !== '') ids.add(String(sid));
    }
    return Array.from(ids);
  }, [cart]);

  const shopNameByMerchantId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of cart) {
      const sid = item.product?.storeId;
      if (sid == null || String(sid).trim() === '') continue;
      const key = String(sid);
      if (map.has(key)) continue;
      const fromProduct = (item.product.shopName || '').trim();
      const fromStore = (storesById[key]?.name || '').trim();
      map.set(key, fromProduct || fromStore || '');
    }
    return map;
  }, [cart, storesById]);

  const getCartGroupStoreTitle = useCallback(
    (storeKey: string, items: CartItem[]) => {
      const first = items[0]?.product;
      const fromProduct = (first?.shopName || '').trim();
      if (fromProduct) return fromProduct;
      const mid = first?.storeId != null && String(first.storeId).trim() !== '' ? String(first.storeId) : '';
      if (mid) {
        const fromCatalog = (storesById[mid]?.name || '').trim();
        if (fromCatalog) return fromCatalog;
      }
      const fromKeyCatalog = (storesById[storeKey]?.name || '').trim();
      if (fromKeyCatalog) return fromKeyCatalog;
      if (!isLikelyTechnicalStoreKey(storeKey)) {
        const k = storeKey.trim();
        if (k && k !== 'Unknown') return k;
      }
      return language === 'ar' ? 'المتجر' : 'חנות';
    },
    [storesById, language]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cartMerchantIds.length === 0) {
        setFetchedBranches([]);
        setBranchesLoading(false);
        return;
      }
      if (!isFirebaseConfigured()) {
        setFetchedBranches([]);
        setBranchesLoading(false);
        return;
      }
      setBranchesLoading(true);
      try {
        const results = await Promise.all(cartMerchantIds.map((id) => getMerchantBranches(id)));
        if (cancelled) return;
        const merged: BranchWithMerchant[] = [];
        cartMerchantIds.forEach((mid, i) => {
          for (const b of results[i] || []) {
            merged.push({ ...b, sourceMerchantId: mid });
          }
        });
        setFetchedBranches(merged);
      } catch (e) {
        console.error('Cart: failed to load branches', e);
        if (!cancelled) setFetchedBranches([]);
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartMerchantIds.join('\0')]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cartMerchantIds.length === 0) {
        setFetchedDeliveryOptions([]);
        return;
      }
      if (!isFirebaseConfigured()) {
        setFetchedDeliveryOptions([]);
        return;
      }
      try {
        const results = await Promise.all(cartMerchantIds.map((id) => getMerchantDeliveryOptions(id)));
        if (cancelled) return;
        const merged: DeliveryOptionWithMerchant[] = [];
        cartMerchantIds.forEach((mid, i) => {
          for (const opt of results[i] || []) {
            merged.push({ ...opt, sourceMerchantId: mid });
          }
        });
        setFetchedDeliveryOptions(merged);
      } catch (e) {
        console.error('Cart: failed to load delivery options', e);
        if (!cancelled) setFetchedDeliveryOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartMerchantIds.join('\0')]);

  const refreshFulfillmentFromServer = useCallback(async () => {
    if (!isFirebaseConfigured() || cartMerchantIds.length === 0) {
      setFulfillmentByMerchant({});
      return;
    }
    try {
      const entries = await Promise.all(
        cartMerchantIds.map(async (id) => {
          const m = await getMerchantById(id);
          return [
            id,
            {
              deliveryEnabled: m?.deliveryEnabled !== false,
              pickupEnabled: m?.pickupEnabled !== false,
            },
          ] as const;
        })
      );
      setFulfillmentByMerchant(Object.fromEntries(entries));
    } catch {
      setFulfillmentByMerchant({});
    }
  }, [cartMerchantIds.join('\0')]);

  useFocusEffect(
    useCallback(() => {
      refreshFulfillmentFromServer();
    }, [refreshFulfillmentFromServer])
  );

  useEffect(() => {
    refreshFulfillmentFromServer();
  }, [refreshFulfillmentFromServer]);

  const deliveryGloballyOk = useMemo(() => {
    if (cartMerchantIds.length === 0) return true;
    return cartMerchantIds.every((id) => {
      const f = fulfillmentByMerchant[id];
      if (f) return f.deliveryEnabled;
      return storesById[id]?.deliveryEnabled !== false;
    });
  }, [cartMerchantIds, fulfillmentByMerchant, storesById]);

  const pickupGloballyOk = useMemo(() => {
    if (cartMerchantIds.length === 0) return true;
    return cartMerchantIds.every((id) => {
      const f = fulfillmentByMerchant[id];
      if (f) return f.pickupEnabled;
      return storesById[id]?.pickupEnabled !== false;
    });
  }, [cartMerchantIds, fulfillmentByMerchant, storesById]);

  useEffect(() => {
    if (deliveryGloballyOk && pickupGloballyOk) return;
    if (deliveryMethod === 'delivery' && !deliveryGloballyOk && pickupGloballyOk) {
      setDeliveryMethod('pickup');
    } else if (deliveryMethod === 'pickup' && !pickupGloballyOk && deliveryGloballyOk) {
      setDeliveryMethod('delivery');
    }
  }, [deliveryMethod, deliveryGloballyOk, pickupGloballyOk]);

  const activeBranches = useMemo(
    () =>
      fetchedBranches.filter((b) => {
        if (b.isActive === false) return false;
        const mid = b.sourceMerchantId;
        if (!mid) return true;
        const f = fulfillmentByMerchant[mid];
        const pickupOk = f ? f.pickupEnabled : storesById[mid]?.pickupEnabled !== false;
        return pickupOk;
      }),
    [fetchedBranches, fulfillmentByMerchant, storesById]
  );

  useEffect(() => {
    if (!selectedAddressId && savedAddresses.length > 0) {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }, [savedAddresses, selectedAddressId]);

  const selectedAddress = useMemo(() => {
    return savedAddresses.find(a => a.id === selectedAddressId) || null;
  }, [savedAddresses, selectedAddressId]);

  const activeDeliveryOptions = useMemo(() => {
    let active = fetchedDeliveryOptions.filter((o) => o.isActive !== false);
    active = active.filter((o) => {
      const mid = o.sourceMerchantId;
      if (!mid) return true;
      const f = fulfillmentByMerchant[mid];
      const delOk = f ? f.deliveryEnabled : storesById[mid]?.deliveryEnabled !== false;
      return delOk;
    });
    if (selectedAddress?.city) {
      const cityFiltered = active.filter((o) => o.city === selectedAddress.city);
      if (cityFiltered.length > 0) return cityFiltered;
    }
    return active;
  }, [fetchedDeliveryOptions, fulfillmentByMerchant, storesById, selectedAddress?.city]);

  useEffect(() => {
    if (activeDeliveryOptions.length > 0) {
      const currentStillValid = activeDeliveryOptions.find(o => o.id === selectedDeliveryOptionId);
      if (!currentStillValid) {
        setSelectedDeliveryOptionId(activeDeliveryOptions[0].id);
        setSelectedPeriodIdx(0);
        setSelectedDeliveryDate('');
      }
    }
  }, [activeDeliveryOptions, selectedDeliveryOptionId]);

  useEffect(() => {
    if (activeBranches.length === 0) {
      setSelectedBranchId(null);
      return;
    }
    const valid = selectedBranchId && activeBranches.some((b) => b.id === selectedBranchId);
    if (!valid) setSelectedBranchId(activeBranches[0].id);
  }, [activeBranches, selectedBranchId]);

  const selectedDeliveryOption = useMemo(() =>
    activeDeliveryOptions.find(o => o.id === selectedDeliveryOptionId) || null,
  [activeDeliveryOptions, selectedDeliveryOptionId]);

  const selectedBranch = useMemo(() =>
    activeBranches.find(b => b.id === selectedBranchId) || null,
  [activeBranches, selectedBranchId]);

  useEffect(() => {
    if (!showPaymentWebView || paymentFlow !== 'tabby' || !tabbyPaymentIdRef.current) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const payment = await getTabbyPaymentStatus(tabbyPaymentIdRef.current as string);
        const finalStatus = String(payment?.status || '').toUpperCase();
        if (finalStatus === 'AUTHORIZED' || finalStatus === 'CLOSED') {
          if (cancelled) return;
          clearInterval(interval);
          setShowPaymentWebView(false);
          setPaymentWebViewUrl(null);
          setPaymentFlow(null);
          const processOrderPlacement = processOrderPlacementRef.current;
          if (processOrderPlacement) {
            await processOrderPlacement(finalStatus, tabbyPaymentIdRef.current || undefined);
          } else {
            setIsCreatingOrder(false);
          }
        } else if (finalStatus === 'REJECTED' || finalStatus === 'EXPIRED') {
          if (cancelled) return;
          clearInterval(interval);
          setShowPaymentWebView(false);
          setPaymentWebViewUrl(null);
          setPaymentFlow(null);
          setIsCreatingOrder(false);
          setOrderAlertConfig({
            visible: true,
            type: 'error',
            message: language === 'ar' ? 'لم تكتمل عملية دفع تابي' : 'תשלום Tabby לא הושלם.',
          });
        }
      } catch {
        // Ignore transient polling errors.
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showPaymentWebView, paymentFlow, language]);

  const closePaymentWebView = useCallback((showCancelledMessage = true) => {
    setShowPaymentWebView(false);
    setPaymentWebViewUrl(null);
    setPaymentFlow(null);
    setPaymentWebViewError(null);
    tabbyPaymentIdRef.current = null;
    callbackUrlRef.current = null;
    setIsCreatingOrder(false);
    if (showCancelledMessage) {
      setOrderAlertConfig({
        visible: true,
        type: 'error',
        message: language === 'ar' ? 'تم إلغاء عملية الدفع' : 'התשלום בוטל.',
      });
    }
  }, [language]);

  const handlePaymentWebNavigationChange = useCallback(async (navState: WebViewNavigation) => {
    if (paymentFlow !== 'tap') return;
    const callbackUrl = callbackUrlRef.current;
    const url = navState.url || '';
    if (!callbackUrl || !url) return;
    if (!url.startsWith(callbackUrl) && !url.includes('tap_id=')) return;

    const tapIdFromUrl = url.match(/tap_id=([^&]+)/)?.[1];
    if (!tapIdFromUrl) {
      closePaymentWebView(false);
      setOrderAlertConfig({ visible: true, type: 'error', message: language === 'ar' ? 'فشل التحقق من الدفع' : 'אימות התשלום נכשל.' });
      return;
    }

    try {
      const verifyResult = await verifyTapPayment(tapIdFromUrl);
      if (verifyResult.status === 'CAPTURED') {
        setShowPaymentWebView(false);
        setPaymentWebViewUrl(null);
        setPaymentFlow(null);
        const processOrderPlacement = processOrderPlacementRef.current;
        if (processOrderPlacement) {
          await processOrderPlacement(verifyResult.status, tapIdFromUrl);
        } else {
          setIsCreatingOrder(false);
        }
      } else {
        closePaymentWebView(false);
        setOrderAlertConfig({ visible: true, type: 'error', message: language === 'ar' ? 'لم تكتمل عملية الدفع' : 'התשלום לא הושלם בהצלחה.' });
      }
    } catch {
      closePaymentWebView(false);
      setOrderAlertConfig({ visible: true, type: 'error', message: language === 'ar' ? 'فشل التحقق من الدفع' : 'אימות התשלום נכשל.' });
    }
  }, [paymentFlow, closePaymentWebView, language]);

  const sar = '₪';
  const deliveryFee = deliveryMethod === 'delivery' && selectedDeliveryOption ? selectedDeliveryOption.price : 0;
  const subtotalBeforeDiscount = cartTotal + cartGiftCardTotal + deliveryFee;
  const grandTotal = Math.max(0, subtotalBeforeDiscount - discountAmount);

  const applyDiscountCode = useCallback(async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setOrderAlertConfig({ visible: true, type: 'error', message: language === 'ar' ? 'أدخل كود الخصم أولاً' : 'הכנס קוד הנחה תחילה.' });
      return;
    }
    if (!isFirebaseConfigured()) {
      setOrderAlertConfig({ visible: true, type: 'error', message: language === 'ar' ? 'ميزة كود الخصم غير متاحة حالياً' : 'קודי הנחה אינם זמינים כרגע.' });
      return;
    }

    setIsApplyingDiscount(true);
    try {
      const { db } = await getFirebase();
      if (!db) throw new Error('firebase_not_ready');
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      const snap = await getDocs(
        query(collection(db as import('firebase/firestore').Firestore, 'discountCodes'), where('code', '==', code), limit(1))
      );

      if (snap.empty) {
        throw new Error('discount_not_found');
      }

      const data = snap.docs[0].data() as {
        code?: string;
        type?: 'percentage' | 'fixed' | 'free_shipping';
        value?: number;
        minOrderAmount?: number | null;
        maxUses?: number | null;
        usedCount?: number;
        isActive?: boolean;
        expiresAt?: unknown;
      };

      if (data.isActive === false) throw new Error('discount_inactive');
      if (typeof data.maxUses === 'number' && typeof data.usedCount === 'number' && data.usedCount >= data.maxUses) {
        throw new Error('discount_limit_reached');
      }
      const minOrder = typeof data.minOrderAmount === 'number' ? data.minOrderAmount : 0;
      if (subtotalBeforeDiscount < minOrder) {
        throw new Error('discount_min_order');
      }

      if (data.expiresAt) {
        let expiresMs: number | null = null;
        const rawExpires = data.expiresAt as { toDate?: () => Date } | string | number;
        if (typeof rawExpires === 'object' && rawExpires?.toDate) {
          expiresMs = rawExpires.toDate().getTime();
        } else if (typeof rawExpires === 'string' || typeof rawExpires === 'number') {
          const parsed = new Date(rawExpires).getTime();
          if (!Number.isNaN(parsed)) expiresMs = parsed;
        }
        if (expiresMs != null && Date.now() > expiresMs) {
          throw new Error('discount_expired');
        }
      }

      const type = data.type || 'fixed';
      const value = typeof data.value === 'number' ? data.value : 0;
      const discountBase = cartTotal + cartGiftCardTotal;
      let computedDiscount = 0;
      if (type === 'percentage') {
        computedDiscount = (discountBase * Math.max(0, Math.min(value, 100))) / 100;
      } else if (type === 'free_shipping') {
        computedDiscount = deliveryFee;
      } else {
        computedDiscount = value;
      }
      const boundedDiscount = Math.max(0, Math.min(computedDiscount, subtotalBeforeDiscount));
      if (boundedDiscount <= 0) throw new Error('discount_invalid_value');

      setDiscountAmount(boundedDiscount);
      setAppliedDiscountCode(code);
      setOrderAlertConfig({ visible: true, type: 'success', message: language === 'ar' ? 'تم تطبيق كود الخصم بنجاح' : 'קוד ההנחה הוחל בהצלחה.' });
    } catch (e) {
      const err = e as { message?: string };
      const messageMap: Record<string, string> = {
        discount_not_found: language === 'ar' ? 'كود الخصم غير صحيح' : 'קוד הנחה לא תקין.',
        discount_inactive: language === 'ar' ? 'كود الخصم غير مفعل' : 'קוד ההנחה אינו פעיל.',
        discount_limit_reached: language === 'ar' ? 'تم استهلاك كود الخصم بالكامل' : 'קוד ההנחה מוצה.',
        discount_min_order: language === 'ar' ? 'الحد الأدنى للطلب غير متحقق' : 'סכום הזמנה מינימלי לא הושג.',
        discount_expired: language === 'ar' ? 'كود الخصم منتهي الصلاحية' : 'קוד ההנחה פג תוקף.',
        discount_invalid_value: language === 'ar' ? 'قيمة الخصم غير صالحة' : 'ערך הנחה לא תקין.',
      };
      setDiscountAmount(0);
      setAppliedDiscountCode(null);
      setOrderAlertConfig({
        visible: true,
        type: 'error',
        message: messageMap[err?.message || ''] || (language === 'ar' ? 'تعذر تطبيق كود الخصم' : 'החלת קוד ההנחה נכשלה.'),
      });
    } finally {
      setIsApplyingDiscount(false);
    }
  }, [discountCode, language, subtotalBeforeDiscount, cartTotal, cartGiftCardTotal, deliveryFee]);

  console.log('Calculation Debug:', { cartTotal, cartGiftCardTotal, deliveryFee, discountAmount, grandTotal });
  if (isNaN(grandTotal)) {
    console.warn('GRAND TOTAL IS NaN!');
  }

  const janaCartInfo = useMemo(() => {
    const isArabic = language === 'ar';
    if (currentStep === 0) {
      const msgs = isArabic
        ? ['هيا كمّل! 🔥', 'ذوقك رفيع!', 'اختيارات حلوة! هيا التالي']
        : ['יאללה, ממשיכים! 🔥', 'יש לך טעם מעולה!', 'בחירות נהדרות! ממשיכים'];
      return { message: msgs[Math.floor(Math.random() * msgs.length)], mood: 'excited' as const };
    }
    if (currentStep === 1) {
      if (deliveryMethod === 'delivery') {
        if (!selectedAddress) {
          return { message: isArabic ? 'وين نوصلك؟ حدد العنوان 📍' : 'לאן לשלוח? בחר/י כתובת 📍', mood: 'search' as const };
        }
        return { message: isArabic ? 'تمام! عنوانك جاهز 👌' : 'מעולה! הכתובת שלך מוכנה 👌', mood: 'excited' as const };
      }
      if (!selectedBranch) {
        return { message: isArabic ? 'اختر الفرع اللي يناسبك 🏪' : 'בחר/י את הסניף שמתאים לך 🏪', mood: 'search' as const };
      }
      return { message: isArabic ? 'فرع ممتاز! شوف المواعيد' : 'סניף מצוין! בדוק/י את הזמנים', mood: 'welcome' as const };
    }
    const payMsgs = isArabic
      ? ['اختر طريقة الدفع وأكمل طلبك 💳', 'خطوة أخيرة! ادفع وطلبك يجهز 🎉', 'هيا ادفع وطلبك بيوصلك! ✨']
      : ['בחר/י אמצעי תשלום והשלם/י את ההזמנה 💳', 'שלב אחרון! שלם/י וההזמנה תטופל 🎉', 'יאללה, משלמים וההזמנה בדרך! ✨'];
    return { message: payMsgs[Math.floor(Math.random() * payMsgs.length)], mood: 'excited' as const };
  }, [currentStep, deliveryMethod, selectedAddress, selectedBranch, language]);

  const groupedByStore = useMemo(() => {
    console.log('Recalculating groupedByStore, cart size:', cart.length);
    const groups: Record<string, typeof cart> = {};
    cart.forEach((item, index) => {
      if (!item?.product) {
        console.warn(`Item at index ${index} has NO product!`, item);
        return;
      }
      const storeKey = item.product.storeId || item.product.shopName || 'Unknown';
      if (!groups[storeKey]) groups[storeKey] = [];
      groups[storeKey].push(item);
    });
    console.log('Grouped into stores:', Object.keys(groups));
    return groups;
  }, [cart]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayOptions = [
    { label: t('today'), date: today.getDate(), month: today.toLocaleString(language === 'ar' ? 'ar' : 'he', { month: 'short' }) },
    { label: t('tomorrow'), date: tomorrow.getDate(), month: tomorrow.toLocaleString(language === 'ar' ? 'ar' : 'he', { month: 'short' }) },
    { label: t('pickADay'), date: null, month: null },
  ];

  const handleDeleteGroup = useCallback((storeName: string) => {
    const items = groupedByStore[storeName];
    if (items) {
      items.forEach((item) =>
        removeFromCart(item.product.id, selectedOptionsSignature(item.selectedOptions as Record<string, string>))
      );
    }
  }, [groupedByStore, removeFromCart]);

  const handleAddNote = useCallback((productId: string) => {
    const key = String(productId);
    setNoteText(itemNotes[key] || '');
    setShowNoteModal(key);
  }, [itemNotes]);

  const handleSaveNote = useCallback(() => {
    const id = showNoteModal;
    if (id === null) return;
    setItemNotes((prev) => ({ ...prev, [id]: noteText }));
    setShowNoteModal(null);
    Keyboard.dismiss();
  }, [showNoteModal, noteText]);

  const closeNoteModal = useCallback(() => {
    setShowNoteModal(null);
    Keyboard.dismiss();
  }, []);

  const openMapForNewAddress = useCallback(() => {
    setEditingAddress(null);
    setMapCoords({
      latitude: userLocation?.latitude || 21.4225,
      longitude: userLocation?.longitude || 39.8262,
    });
    setMapAddress('');
    setMapCity('');
    setRecipientName('');
    setRecipientPhone('');
    setAddressDetails('');
    setShowMapPicker(true);
  }, [userLocation]);

  const openMapForEditAddress = useCallback((address: SavedAddress) => {
    setEditingAddress(address);
    setMapCoords({ latitude: address.latitude, longitude: address.longitude });
    setMapAddress(address.fullAddress);
    setMapCity(address.city);
    setRecipientName(address.recipientName || '');
    setRecipientPhone(address.phone || '');
    setAddressDetails(address.addressDetails || '');
    setShowMapPicker(true);
  }, []);

  const handleMapLocationSelected = useCallback(async (cityName: string, coords?: LocationCoords) => {
    if (coords) {
      setMapCoords(coords);
      try {
        const langUi = language === 'ar' ? 'ar' : 'he';
        const [address, city] = await Promise.all([
          reverseGeocodeToAddress(coords, langUi),
          reverseGeocodeToCity(coords),
        ]);
        setMapAddress(address);
        setMapCity(city || cityName);
      } catch (e) {
        try {
          const langUi = language === 'ar' ? 'ar' : 'he';
          setMapAddress(await reverseGeocodeToAddress(coords, langUi));
        } catch {
          setMapAddress(cityName);
        }
        setMapCity(cityName);
      }
    } else {
      setMapCity(cityName);
    }
    setShowMapPicker(false);
    setShowOrderTypeChoice(true);
  }, [language]);

  const handleOrderTypeSelect = useCallback((type: 'self' | 'gift') => {
    setOrderType(type);
    setShowOrderTypeChoice(false);
    if (type === 'self') {
      setRecipientName(user?.name || '');
      setRecipientPhone(user?.phone || '');
    } else {
      if (!editingAddress) {
        setRecipientName('');
        setRecipientPhone('');
      }
    }
    setShowRecipientForm(true);
  }, [user, editingAddress]);

  const handleConfirmRecipientDetails = useCallback(async () => {
    const finalAddress = mapAddress || `${mapCoords.latitude.toFixed(4)}, ${mapCoords.longitude.toFixed(4)}`;
    const city = mapCity || (language === 'ar' ? 'مكة' : 'מכה');

    if (editingAddress) {
      const updated: SavedAddress = {
        ...editingAddress,
        fullAddress: finalAddress,
        city,
        region: city,
        latitude: mapCoords.latitude,
        longitude: mapCoords.longitude,
        recipientName: recipientName || undefined,
        phone: recipientPhone || undefined,
        addressDetails: addressDetails || undefined,
      };
      await updateSavedAddress(updated);
      setSelectedAddressId(updated.id);
    } else {
      const newAddr: SavedAddress = {
        id: Date.now().toString(),
        label: city,
        city,
        region: city,
        fullAddress: finalAddress,
        latitude: mapCoords.latitude,
        longitude: mapCoords.longitude,
        recipientName: recipientName || undefined,
        phone: recipientPhone || undefined,
        addressDetails: addressDetails || undefined,
      };
      await addSavedAddress(newAddr);
      setSelectedAddressId(newAddr.id);
    }
    setShowRecipientForm(false);
  }, [mapAddress, mapCity, mapCoords, editingAddress, updateSavedAddress, addSavedAddress, language, recipientName, recipientPhone, addressDetails]);

  const handleDeleteAddress = useCallback(async (id: string) => {
    await deleteSavedAddress(id);
    if (selectedAddressId === id) {
      const remaining = savedAddresses.filter(a => a.id !== id);
      setSelectedAddressId(remaining.length > 0 ? remaining[0].id : null);
    }
    setShowDeleteConfirm(null);
  }, [deleteSavedAddress, selectedAddressId, savedAddresses]);

  const getDayName = useCallback((key: string) => {
    return t(key) || key;
  }, [t]);

  const renderStepIndicator = () => (
    <View style={[styles.stepIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {(isRTL ? [...STEPS].reverse() : STEPS).map((step, idx) => {
        const originalIndex = isRTL ? STEPS.length - 1 - idx : idx;
        const isActive = originalIndex <= currentStep;
        return (
          <React.Fragment key={step}>
            {idx > 0 && (
              <View style={[styles.stepLine, { backgroundColor: originalIndex < currentStep ? colors.primary : '#D1D5DB' }]} />
            )}
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                {
                  backgroundColor: isActive ? colors.primary : '#E5E7EB',
                  borderColor: isActive ? colors.primary : '#D1D5DB',
                },
              ]}>
                {originalIndex === 0 && <ShoppingBag size={16} color={isActive ? '#FFF' : '#9CA3AF'} />}
                {originalIndex === 1 && <MapPin size={16} color={isActive ? '#FFF' : '#9CA3AF'} />}
                {originalIndex === 2 && <CreditCard size={16} color={isActive ? '#FFF' : '#9CA3AF'} />}
              </View>
              <Text style={[styles.stepLabel, { color: isActive ? colors.text : colors.textMuted, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t(step)}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderCartStep = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {Object.keys(groupedByStore).length === 0 && null /* GroupedByStore is EMPTY while rendering */}
      {Object.entries(groupedByStore || {}).map(([storeKey, items]) => {
        const storeName = getCartGroupStoreTitle(storeKey, items);
        return (
          <View key={storeKey} style={{ marginBottom: 20 }}>
            <TouchableOpacity style={[styles.deleteGroupRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleDeleteGroup(storeKey)}>
              <Text style={[styles.deleteGroupText, { color: colors.error, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('deleteGroupItems')}</Text>
              <Trash2 size={14} color={colors.error} />
            </TouchableOpacity>

            <View style={[styles.storeHeader, { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }]}>
              <Text style={[styles.soldByText, { color: colors.textSecondary }]}>{t('soldBy')}</Text>
              <Text style={[styles.storeName, { color: colors.primary, textAlign: 'left' }]} numberOfLines={1}>
                {storeName}
              </Text>
              <View style={[styles.storeIcon, { backgroundColor: colors.primaryLight }]}>
                <ShoppingBag size={16} color={colors.primary} />
              </View>
            </View>

          {items.map((item) => {
            const lineSig = selectedOptionsSignature(item.selectedOptions as Record<string, string>);
            return (
            <View key={`${item.product.id}-${lineSig}-${item.quantity}`} style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <View style={[styles.cartItemActions, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
                <TouchableOpacity onPress={() => removeFromCart(item.product.id, lineSig)}>
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleAddNote(String(item.product.id))}>
                  <Edit3 size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.cartItemBody, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.cartItemDetails, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.cartItemName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', width: '100%' }]} numberOfLines={1}>
                    {language === 'ar' ? item.product.name : item.product.nameEn}
                  </Text>

                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 ? (
                    <View style={{ marginTop: 4, gap: 2, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      {Object.entries(item.selectedOptions as Record<string, string>).map(([k, v]) => (
                        <Text key={k} style={{ fontSize: 12, color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={2}>
                          {k}: {v}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {item.giftCard && item.product.giftCardFee ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Gift size={12} color="#4CAF50" />
                      <Text style={{ fontSize: 11, color: '#4CAF50', fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>
                        {language === 'ar' ? `كرت إهداء +${item.product.giftCardFee} ${sar}` : `כרטיס מתנה +${item.product.giftCardFee} ${sar}`}
                      </Text>
                    </View>
                  ) : null}

                  {itemNotes[String(item.product.id)] && (
                    <TouchableOpacity style={[styles.noteIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleAddNote(String(item.product.id))}>
                      <Text style={[styles.noteIndicatorText, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                        {itemNotes[String(item.product.id)]}
                      </Text>
                      <MessageSquare size={12} color={colors.primary} />
                    </TouchableOpacity>
                  )}

                  <View style={[styles.cartItemMeta, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.cartPriceRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-start' : 'flex-start' }]}>
                      <Text style={[styles.cartItemPrice, { color: colors.text }]}>{item.product.price * item.quantity} {sar}</Text>
                      {item.quantity > 1 && (
                        <Text style={[styles.cartUnitPrice, { color: colors.textMuted }]}>({item.product.price} × {item.quantity})</Text>
                      )}
                      {item.product.originalPrice != null && item.product.originalPrice > item.product.price && (
                        <Text style={[styles.cartOriginalPrice, { color: colors.textMuted }]}>{item.product.originalPrice * item.quantity} {sar}</Text>
                      )}
                    </View>
                    <View style={[styles.qtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { borderColor: colors.primary }]}
                        onPress={() => updateCartQuantity(String(item.product.id), item.quantity - 1, lineSig)}
                      >
                        <Minus size={14} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                        onPress={() => updateCartQuantity(String(item.product.id), item.quantity + 1, lineSig)}
                      >
                        <Plus size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    {item.product.tags?.includes('one-size') && (
                      <View style={[styles.sizeTag, { borderColor: colors.border }]}>
                        <Text style={[styles.sizeText, { color: colors.textSecondary }]}>{t('size')} One Size</Text>
                      </View>
                    )}
                  </View>
                </View>

                {isSafeRemoteImageUri(item.product.image) ? (
                  <Image source={{ uri: item.product.image.trim() }} style={styles.cartItemImage} contentFit="cover" />
                ) : (
                  <View style={[styles.cartItemImage, { backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }]}>
                    <Package size={36} color={colors.textMuted} />
                  </View>
                )}
              </View>

              {!itemNotes[String(item.product.id)] && (
                <TouchableOpacity style={[styles.addNoteBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleAddNote(String(item.product.id))}>
                  <Text style={[styles.addNoteText, { color: colors.primary }]}>{t('addNote')}</Text>
                  <MessageSquare size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            );
          })}
        </View>
        );
      })}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderAddressStep = () => {
    const showDeliveryChoice = deliveryGloballyOk;
    const showPickupChoice = pickupGloballyOk;
    const fulfillmentBlocked = !showDeliveryChoice && !showPickupChoice;

    return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {fulfillmentBlocked && (
        <View style={[styles.fulfillmentBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
          <Text style={[styles.fulfillmentBannerText, { color: colors.error }]}>{t('storeFulfillmentBothOff')}</Text>
        </View>
      )}
      {!fulfillmentBlocked && (!showDeliveryChoice || !showPickupChoice) && (
        <View style={[styles.fulfillmentBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
          <Text style={[styles.fulfillmentBannerText, { color: colors.text }]}>
            {!showDeliveryChoice && showPickupChoice ? t('storeDisabledDelivery') : ''}
            {showDeliveryChoice && !showPickupChoice ? t('storeDisabledPickup') : ''}
          </Text>
        </View>
      )}

      {!fulfillmentBlocked && (
      <View style={[styles.deliveryMethodToggle, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        {showDeliveryChoice && (
        <TouchableOpacity
          style={[
            styles.deliveryMethodBtn,
            { flex: showPickupChoice ? 1 : undefined },
            deliveryMethod === 'delivery' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setDeliveryMethod('delivery')}
          activeOpacity={0.7}
        >
          <Truck size={18} color={deliveryMethod === 'delivery' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.deliveryMethodText, { color: deliveryMethod === 'delivery' ? '#FFF' : colors.textMuted }]}>
            {t('deliveryToLocation')}
          </Text>
        </TouchableOpacity>
        )}
        {showPickupChoice && (
        <TouchableOpacity
          style={[
            styles.deliveryMethodBtn,
            { flex: showDeliveryChoice ? 1 : undefined },
            deliveryMethod === 'pickup' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setDeliveryMethod('pickup')}
          activeOpacity={0.7}
        >
          <Store size={18} color={deliveryMethod === 'pickup' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.deliveryMethodText, { color: deliveryMethod === 'pickup' ? '#FFF' : colors.textMuted }]}>
            {t('pickupFromBranch')}
          </Text>
        </TouchableOpacity>
        )}
      </View>
      )}

      {!fulfillmentBlocked && (deliveryMethod === 'delivery' ? renderDeliverySection() : renderPickupSection())}
      <View style={{ height: 100 }} />
    </ScrollView>
    );
  };

  const renderDeliverySection = () => (
    <>
      <View style={[styles.addressSection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[styles.addressHeader, { flexDirection: 'row' }]}>
          <View style={[styles.addressIcon, { backgroundColor: colors.primaryLight }]}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <Text style={[styles.addressTitle, { color: colors.text, textAlign: 'left' }]}>{t('deliverToTitle')}</Text>
        </View>

        {savedAddresses.length === 0 ? (
          <View style={styles.noAddressContainer}>
            <MapPin size={40} color={colors.textMuted} />
            <Text style={[styles.noAddressText, { color: colors.textMuted }]}>{t('noSavedAddresses')}</Text>
          </View>
        ) : (
          savedAddresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <View key={addr.id} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.addressCard,
                    {
                      backgroundColor: isSelected ? '#E8F5E9' : colors.glass,
                      borderColor: isSelected ? '#4CAF50' : colors.borderLight,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedAddressId(addr.id)}
                >
                  <View style={[styles.addressCardContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.addressCardLeft}>
                      <Link2 size={16} color={isSelected ? '#4CAF50' : colors.textMuted} />
                      <View style={[styles.addressDot, { backgroundColor: isSelected ? '#4CAF50' : colors.textMuted }]} />
                    </View>
                    <View style={[styles.addressCardText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.addressName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{addr.label}</Text>
                      <Text style={[styles.addressFull, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{addr.fullAddress}</Text>
                      {addr.recipientName && (
                        <Text style={[styles.addressMeta, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                          {addr.recipientName} {addr.phone ? `• ${addr.phone}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={[styles.addressActions, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
                  <TouchableOpacity
                    style={[styles.addressActionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => openMapForEditAddress(addr)}
                  >
                    <Pencil size={14} color={colors.primary} />
                    <Text style={[styles.addressActionText, { color: colors.primary }]}>{t('editAddress')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addressActionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => setShowDeleteConfirm(addr.id)}
                  >
                    <Trash2 size={14} color={colors.error} />
                    <Text style={[styles.addressActionText, { color: colors.error }]}>{t('deleteAddress')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={[styles.addAddressBtn, { borderColor: colors.primary }]}
          onPress={openMapForNewAddress}
        >
          <Text style={[styles.addAddressBtnText, { color: colors.primary }]}>+ {t('addNewAddress')}</Text>
        </TouchableOpacity>
      </View>

      {activeDeliveryOptions.length > 0 && (
        <View style={[styles.deliveryOptionsSection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.addressHeader}>
            <View style={[styles.addressIcon, { backgroundColor: '#6366F115' }]}>
              <Truck size={20} color="#6366F1" />
            </View>
            <Text style={[styles.addressTitle, { color: colors.text }]}>{t('deliveryOptions')}</Text>
          </View>

          {activeDeliveryOptions.map((option) => {
            const isSelected = selectedDeliveryOptionId === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.deliveryOptionCard,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.glass,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedDeliveryOptionId(option.id);
                  setSelectedPeriodIdx(0);
                  setSelectedDeliveryDate('');
                }}
              >
                <View style={styles.deliveryOptionRow}>
                  <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deliveryOptionName, { color: colors.text }]}>
                      {option.city ? `${option.city} - ` : ''}{language === 'ar' ? option.name : option.nameEn}
                    </Text>
                    {(option.workDays?.length ?? 0) > 0 && (
                      <Text style={[styles.deliveryOptionDays, { color: colors.textSecondary }]}>
                        {option.workDays.map((day) => getDayName(day)).join(' · ')}
                      </Text>
                    )}
                    <View style={styles.deliveryOptionInfoRow}>
                      {(option.periods?.length ?? 0) > 0 && (
                        <Text style={[styles.deliveryOptionPeriodName, { color: colors.textSecondary }]}>
                          {summarizeDeliveryPeriods(option.periods, language === 'ar' ? 'ar' : 'he')}
                        </Text>
                      )}
                      <Text style={[styles.deliveryOptionPrice, { color: colors.primary }]}>
                        {option.price} {sar}
                      </Text>
                    </View>
                  </View>
                </View>
                {isSelected && (
                  <View style={styles.deliveryOptionDetails}>
                    <TouchableOpacity
                      style={[styles.deliveryDateBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                      onPress={() => setShowDeliveryCalendar(true)}
                    >
                      <Calendar size={18} color={colors.primary} />
                      <Text style={[styles.deliveryDateBtnText, { color: selectedDeliveryDate ? colors.text : colors.textMuted }]}>
                        {selectedDeliveryDate || t('selectDate')}
                      </Text>
                    </TouchableOpacity>
                    {(option.periods?.length ?? 0) > 0 && (
                      <View style={styles.periodsContainer}>
                        {option.periods.map((period, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.periodChip,
                              {
                                backgroundColor: selectedPeriodIdx === idx ? colors.primary : 'transparent',
                                borderColor: selectedPeriodIdx === idx ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => setSelectedPeriodIdx(idx)}
                          >
                            <Text style={[styles.periodChipText, { color: selectedPeriodIdx === idx ? '#FFF' : colors.text }]}>
                              {formatDeliveryPeriodLabel(period, language === 'ar' ? 'ar' : 'he')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <CalendarPicker
                      visible={showDeliveryCalendar}
                      onClose={() => setShowDeliveryCalendar(false)}
                      onSelect={(date) => setSelectedDeliveryDate(date)}
                      selectedDate={selectedDeliveryDate}
                      allowedDays={option.workDays}
                      disablePastDates={true}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );

  const renderPickupSection = () => (
    <>
      {branchesLoading ? (
        <View style={[styles.noBranchContainer, { backgroundColor: colors.card, gap: 12 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.noAddressText, { color: colors.textMuted }]}>{t('loading')}</Text>
        </View>
      ) : activeBranches.length === 0 ? (
        <View style={[styles.noBranchContainer, { backgroundColor: colors.card }]}>
          <Building2 size={40} color={colors.textMuted} />
          <Text style={[styles.noAddressText, { color: colors.textMuted, textAlign: 'center' }]}>
            {cart.length > 0 && cartMerchantIds.length === 0
              ? language === 'ar'
                ? 'تعذر ربط السلة بمتجر. أضف المنتج من صفحة المتجر أو جرّب التوصيل.'
                : 'Cart is not linked to a store. Add items from the store page or use delivery.'
              : t('noBranches')}
          </Text>
        </View>
      ) : (
        activeBranches.map((branch) => {
          const isSelected = selectedBranchId === branch.id;
          const storeLabel =
            cartMerchantIds.length > 1 && branch.sourceMerchantId
              ? shopNameByMerchantId.get(branch.sourceMerchantId)
              : '';
          return (
            <View key={branch.id} style={[styles.branchCard, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.borderLight }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedBranchId(branch.id)}
                style={styles.branchHeader}
              >
                <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.branchName, { color: colors.text }]}>
                    {language === 'ar' ? branch.name : branch.nameEn}
                  </Text>
                  {!!storeLabel && (
                    <Text style={[styles.branchStoreTag, { color: colors.textMuted }]} numberOfLines={1}>
                      {storeLabel}
                    </Text>
                  )}
                  <Text style={[styles.branchAddress, { color: colors.textSecondary }]}>{branch.address}</Text>
                </View>
                <View style={[styles.addressIcon, { backgroundColor: '#10B98115' }]}>
                  <Building2 size={18} color="#10B981" />
                </View>
              </TouchableOpacity>

              {isSelected && (
                <View style={styles.branchDetails}>
                  <View style={styles.branchInfoRow}>
                    <Text style={[styles.branchInfoValue, { color: colors.text }]}>{branch.workHours}</Text>
                    <View style={styles.branchInfoLabel}>
                      <Text style={[styles.branchInfoLabelText, { color: colors.textSecondary }]}>{t('workingHours')}</Text>
                      <Clock size={14} color={colors.textSecondary} />
                    </View>
                  </View>
                  <View style={styles.branchInfoRow}>
                    <Text style={[styles.branchInfoValue, { color: colors.text }]}>{branch.workDays}</Text>
                    <View style={styles.branchInfoLabel}>
                      <Text style={[styles.branchInfoLabelText, { color: colors.textSecondary }]}>{t('workingDays')}</Text>
                      <Calendar size={14} color={colors.textSecondary} />
                    </View>
                  </View>

                  {branch.latitude && branch.longitude && Platform.OS === 'web' && (
                    <View style={styles.branchMapContainer}>
                      <GoogleMapWeb
                        latitude={branch.latitude}
                        longitude={branch.longitude}
                        zoom={15}
                        style={{ height: 180, borderRadius: 14, overflow: 'hidden' }}
                      />
                    </View>
                  )}

                  {branch.googleMapsLink && (
                    <TouchableOpacity
                      style={[styles.googleMapsBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => {
                        if (branch.googleMapsLink) {
                          Linking.openURL(branch.googleMapsLink);
                        }
                      }}
                    >
                      <Text style={[styles.googleMapsBtnText, { color: colors.primary }]}>{t('openInGoogleMaps')}</Text>
                      <ExternalLink size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </>
  );

  const handleSelectPayment = useCallback((key: string) => {
    setSelectedPayment(key);
  }, []);

  const paymentMethods = useMemo(() => [
    { key: 'cash_on_delivery', logo: 'cash_on_delivery' },
  ], []);

  const renderPaymentLogo = useCallback((logo: string) => {
    if (logo === 'electronic_group') {
      return (
        <View style={[styles.paymentLogoWrap, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Image source={require('@/assets/images/visa-mastercard-logo.png')} style={{ width: 58, height: 26 }} contentFit="contain" />
          <Image source={require('@/assets/images/mada-logo.png')} style={{ width: 48, height: 24 }} contentFit="contain" />
          <ApplePayMark height={26} />
        </View>
      );
    }
    if (logo === 'tabby') {
      return (
        <View style={styles.tabbyPayRow}>
          <View style={styles.tabbyLogoBadge}>
            <TabbyBnplLogo width={44} />
          </View>
          <View style={styles.tabbyTaglineWrap}>
            <Text
              style={[styles.tabbyPayTagline, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {language === 'ar' ? 'قسطها على ٤ دفعات مع' : 'פצל ל-4 תשלומים עם'}
            </Text>
          </View>
        </View>
      );
    }
    if (logo === 'cash_on_delivery') {
      return (
        <View style={styles.tabbyPayRow}>
          <Text style={[styles.tabbyPayTagline, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {language === 'ar' ? 'الدفع عند الاستلام' : 'תשלום בעת המסירה'}
          </Text>
        </View>
      );
    }
    return null;
  }, [language, colors.text, isRTL]);

  const renderPaymentMethodButtonIcon = useCallback(() => {
    if (selectedPayment === 'electronic') {
      return (
        <View style={styles.payBtnMarkWrap}>
          <Image source={require('@/assets/images/visa-mastercard-logo.png')} style={{ width: 34, height: 15 }} contentFit="contain" />
          <Image source={require('@/assets/images/mada-logo.png')} style={{ width: 26, height: 13 }} contentFit="contain" />
          <ApplePayMark height={17} />
        </View>
      );
    }
    if (selectedPayment === 'tabby') {
      return (
        <View style={[styles.payBtnMarkWrap, styles.payBtnMarkWrapTabby]}>
          <TabbyBnplLogo width={38} />
        </View>
      );
    }
    if (selectedPayment === 'cash_on_delivery') {
      return (
        <View style={styles.payBtnMarkWrap}>
          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
            {language === 'ar' ? 'عند الاستلام' : 'במסירה'}
          </Text>
        </View>
      );
    }
    return null;
  }, [selectedPayment, language]);

  // TODO: [PRODUCTION] Integrate real payment gateway for processing payments
  // - Integrate Stripe, Moyasar, or HyperPay for card payments (Visa/Mastercard/mada)
  // - Implement Apple Pay via payment gateway SDK
  // - Integrate STC Pay API for mobile wallet payments
  // - Integrate Tabby/Tamara for buy-now-pay-later options
  // - Handle payment confirmation webhooks on the backend
  // - Implement idempotency keys to prevent duplicate charges
  // - Add 3D Secure authentication support
  /** مراجعة الطلب + اختيار الدفع في شاشة واحدة */
  const renderPaymentCheckoutStep = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.paySectionHeader}>
          {deliveryMethod === 'delivery' ? (
            <View style={[styles.paySectionIcon, { backgroundColor: colors.primaryLight }]}>
              <Truck size={18} color={colors.primary} />
            </View>
          ) : (
            <View style={[styles.paySectionIcon, { backgroundColor: colors.primaryLight }]}>
              <Store size={18} color={colors.primary} />
            </View>
          )}
          <Text style={[styles.paySectionTitle, { color: colors.text }]}>
            {deliveryMethod === 'delivery' ? t('deliveryDetails') : t('pickupDetails')}
          </Text>
        </View>
        {deliveryMethod === 'delivery' && selectedAddress ? (
          <View style={styles.payInfoRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.payInfoText, { color: colors.textSecondary }]} numberOfLines={2}>
              {selectedAddress.fullAddress}
            </Text>
          </View>
        ) : deliveryMethod === 'pickup' && selectedBranch ? (
          <View style={styles.payInfoRow}>
            <Store size={14} color={colors.textSecondary} />
            <Text style={[styles.payInfoText, { color: colors.textSecondary }]} numberOfLines={2}>
              {language === 'ar' ? selectedBranch.name : selectedBranch.nameEn} - {selectedBranch.address}
            </Text>
          </View>
        ) : null}
        {selectedAddress?.recipientName && deliveryMethod === 'delivery' && (
          <View style={styles.payInfoRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.payInfoText, { color: colors.textSecondary }]}>{selectedAddress.recipientName}</Text>
          </View>
        )}
        {selectedAddress?.phone && deliveryMethod === 'delivery' && (
          <View style={styles.payInfoRow}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={[styles.payInfoText, { color: colors.textSecondary }]}>{selectedAddress.phone}</Text>
          </View>
        )}
      </View>

      {deliveryMethod === 'delivery' && selectedDeliveryOption && (
        <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.paySectionHeader}>
            <View style={[styles.paySectionIcon, { backgroundColor: colors.primaryLight }]}>
              <Clock size={18} color={colors.primary} />
            </View>
            <Text style={[styles.paySectionTitle, { color: colors.text }]}>{t('deliveryTime')}</Text>
          </View>
          <View style={styles.payInfoRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.payInfoText, { color: colors.textSecondary }]}>
              {selectedDeliveryDate || selectedDeliveryOption.workDays.map(d => getDayName(d)).join(', ')}
            </Text>
          </View>
          {selectedDeliveryOption.periods[selectedPeriodIdx] && (
            <View style={styles.payInfoRow}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.payInfoText, { color: colors.textSecondary }]}>
                {formatDeliveryPeriodLabel(
                  selectedDeliveryOption.periods[selectedPeriodIdx],
                  language === 'ar' ? 'ar' : 'he'
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.paySectionHeader}>
          <View style={[styles.paySectionIcon, { backgroundColor: colors.primaryLight }]}>
            <Package size={18} color={colors.primary} />
          </View>
          <Text style={[styles.paySectionTitle, { color: colors.text }]}>{t('products')}</Text>
        </View>
        {cart.map((item) => (
          <View key={item.product.id} style={[styles.payProductRow, { borderBottomColor: colors.borderLight }]}>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={[styles.payProductPrice, { color: colors.text }]}>
                {item.product.price * item.quantity} {sar}
              </Text>
              {item.product.originalPrice != null && item.product.originalPrice > item.product.price && (
                <Text style={[styles.payOriginalPrice, { color: colors.textMuted }]}>
                  {item.product.originalPrice * item.quantity} {sar}
                </Text>
              )}
            </View>
            <View style={styles.payProductInfo}>
              <Text style={[styles.payProductName, { color: colors.text }]} numberOfLines={1}>
                {language === 'ar' ? item.product.name : item.product.nameEn}
              </Text>
              <Text style={[styles.payProductQty, { color: colors.textMuted }]}>
                {t('qty')}{item.quantity}
              </Text>
            </View>
            <Image source={{ uri: item.product.image }} style={styles.payProductImage} contentFit="cover" />
          </View>
        ))}
      </View>

      <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={styles.paySectionHeader}>
          <View style={[styles.paySectionIcon, { backgroundColor: colors.primaryLight }]}>
            <Tag size={18} color={colors.primary} />
          </View>
          <Text style={[styles.paySectionTitle, { color: colors.text }]}>{t('discountCode')}</Text>
        </View>
        <View style={styles.discountRow}>
          <TouchableOpacity
            style={[styles.discountApplyBtn, { backgroundColor: colors.primary, opacity: isApplyingDiscount ? 0.7 : 1 }]}
            activeOpacity={0.8}
            onPress={applyDiscountCode}
            disabled={isApplyingDiscount}
          >
            <Text style={styles.discountApplyText}>{isApplyingDiscount ? (language === 'ar' ? 'جارٍ التطبيق...' : 'מחיל...') : t('apply')}</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.discountInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }]}
            value={discountCode}
            onChangeText={setDiscountCode}
            placeholder={t('enterDiscountCode')}
            placeholderTextColor={colors.textMuted}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
        {appliedDiscountCode && discountAmount > 0 && (
          <Text style={[styles.hintText, { color: colors.primary, marginTop: 8 }]}>
            {language === 'ar'
              ? `تم تطبيق ${appliedDiscountCode} (-${discountAmount.toFixed(2)} ${sar})`
              : `${appliedDiscountCode} applied (-${discountAmount.toFixed(2)} ${sar})`}
          </Text>
        )}
      </View>

      <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.borderLight, paddingBottom: 16 }]}>
        <View style={styles.paySectionHeader}>
          <View style={[styles.paySectionIcon, { backgroundColor: colors.primaryLight }]}>
            <Receipt size={18} color={colors.primary} />
          </View>
          <Text style={[styles.paySectionTitle, { color: colors.text }]}>{t('invoice')}</Text>
        </View>

        <View style={[styles.invoiceRow, { borderBottomColor: colors.borderLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.invoiceValue, { color: colors.text }]}>{cartTotal} {sar}</Text>
          <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>{t('productPrice')}</Text>
        </View>
        {cartGiftCardTotal > 0 && (
          <View style={[styles.invoiceRow, { borderBottomColor: colors.borderLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>{cartGiftCardTotal} {sar}</Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>{language === 'ar' ? 'كرت الإهداء' : 'כרטיס מתנה'}</Text>
          </View>
        )}
        {deliveryMethod === 'delivery' && (
          <View style={[styles.invoiceRow, { borderBottomColor: colors.borderLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>
              {deliveryFee > 0 ? `${deliveryFee} ${sar}` : t('free')}
            </Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>{t('deliveryFee')}</Text>
          </View>
        )}
        {discountAmount > 0 && (
          <View style={[styles.invoiceRow, { borderBottomColor: colors.borderLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.invoiceValue, { color: colors.primary }]}>- {discountAmount.toFixed(2)} {sar}</Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'الخصم' : 'הנחה'}
            </Text>
          </View>
        )}
        <View style={[styles.invoiceTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.invoiceTotalValue, { color: colors.primary }]}>
              {grandTotal} {sar}
            </Text>
            <Text style={[styles.invoiceVatText, { color: colors.textMuted }]}>{t('totalIncVat')}</Text>
          </View>
          <Text style={[styles.invoiceTotalLabel, { color: colors.text }]}>{t('orderTotal')}</Text>
        </View>
      </View>

      <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.borderLight, paddingVertical: 24 }]}>
        <Text style={[styles.paymentTitle, { color: colors.text, marginBottom: 20, textAlign: 'center', fontSize: 18, fontWeight: '700' }]}>
          {language === 'ar' ? 'اختر طريقة الدفع' : 'בחר אמצעי תשלום'}
        </Text>

        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.key}
            style={[
              styles.paymentOption,
              {
                backgroundColor: colors.card,
                borderColor: selectedPayment === method.key ? colors.primary : colors.borderLight,
                borderWidth: selectedPayment === method.key ? 2 : 1,
                marginVertical: 8,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => handleSelectPayment(method.key)}
          >
            {isRTL ? (
              <>
                <View style={[styles.paymentLogosSlot, { justifyContent: 'flex-end' }]}>
                  {renderPaymentLogo(method.logo)}
                </View>
                <View style={[styles.radioOuter, { borderColor: selectedPayment === method.key ? colors.primary : colors.border }]}>
                  {selectedPayment === method.key && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </>
            ) : (
              <>
                <View style={[styles.radioOuter, { borderColor: selectedPayment === method.key ? colors.primary : colors.border }]}>
                  {selectedPayment === method.key && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={[styles.paymentLogosSlot, { justifyContent: 'flex-start' }]}>
                  {renderPaymentLogo(method.logo)}
                </View>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14 }}>
          {language === 'ar'
            ? 'عند الضغط على «ادفع المبلغ» ستُفتح بوابة الدفع الآمنة لإتمام الطلب'
            : 'Tap Pay to open the secure payment gateway and complete your order'}
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  if (cart.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView edges={['top']}>
          <View style={[styles.topHeader, { backgroundColor: colors.card }]}>
            <View />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('newOrder')}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowRight size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('emptyCart')}</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{t('emptyCartDesc')}</Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(customer-tabs)/home' as any)}
          >
            <Text style={styles.shopBtnText}>{t('continueShopping')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']}>
        <View style={[styles.topHeader, { backgroundColor: colors.card, flexDirection: 'row' }]}>
          <TouchableOpacity onPress={() => { currentStep > 0 ? setCurrentStep(currentStep - 1) : router.back(); }}>
            {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('newOrder')}</Text>
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

      {renderStepIndicator()}

      <View style={{ flex: 1 }}>
        {currentStep === 0 && renderCartStep()}
        {currentStep === 1 && renderAddressStep()}
        {currentStep === 2 && renderPaymentCheckoutStep()}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: colors.card }]}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary, width: '100%', opacity: isCreatingOrder ? 0.7 : 1 }]}
            disabled={isCreatingOrder}
            onPress={async () => {
              if (currentStep === 0) {
                if (savedAddresses.length === 0) {
                  openMapForNewAddress();
                }
                setCurrentStep(1);
              } else if (currentStep === 1) {
                if (!deliveryGloballyOk && !pickupGloballyOk) {
                  setOrderAlertConfig({ visible: true, type: 'error', message: t('storeFulfillmentBothOff') });
                  return;
                }
                if (deliveryMethod === 'delivery') {
                  if (!deliveryGloballyOk) {
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('storeDisabledDelivery') });
                    return;
                  }
                  if (!selectedAddress) {
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('pleaseSelectAddress') });
                    openMapForNewAddress();
                    return;
                  }
                  if (selectedDeliveryOption && !selectedDeliveryDate) {
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('pleaseSelectDeliveryDate') });
                    return;
                  }
                  if (selectedDeliveryOption && (selectedDeliveryOption.periods?.length ?? 0) > 0 && selectedPeriodIdx < 0) {
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('pleaseSelectPeriod') });
                    return;
                  }
                } else {
                  if (!pickupGloballyOk) {
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('storeDisabledPickup') });
                    return;
                  }
                  if (!selectedBranch) {
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('pleaseSelectBranch') });
                    return;
                  }
                }
                setCurrentStep(2);
              } else if (currentStep === 2) {
                if (deliveryMethod === 'delivery' && !deliveryGloballyOk) {
                  setOrderAlertConfig({ visible: true, type: 'error', message: t('storeDisabledDelivery') });
                  return;
                }
                if (deliveryMethod === 'pickup' && !pickupGloballyOk) {
                  setOrderAlertConfig({ visible: true, type: 'error', message: t('storeDisabledPickup') });
                  return;
                }
                const paymentMethodStr = 'cash' as any;

                const deliveryDateStr = deliveryMethod === 'delivery'
                  ? (selectedDeliveryOption
                      ? (selectedDeliveryDate || selectedDeliveryOption.workDays.map(d => getDayName(d)).join(', '))
                      : new Date().toISOString().split('T')[0])
                  : '';
                const deliveryTimeSlotStr =
                  deliveryMethod === 'delivery' &&
                  selectedDeliveryOption &&
                  selectedDeliveryOption.periods[selectedPeriodIdx]
                    ? formatDeliveryPeriodLabel(
                        selectedDeliveryOption.periods[selectedPeriodIdx],
                        language === 'ar' ? 'ar' : 'he'
                      )
                    : '';
                const orderNum = `GLD-${Date.now().toString().slice(-4)}`;

                setIsCreatingOrder(true);
                
                const processOrderPlacement = async (status?: string, gatewayPaymentId?: string) => {
                  try {
                    const newOrders = await placeOrder({
                      address: deliveryMethod === 'delivery'
                        ? (selectedAddress?.fullAddress || '')
                        : (selectedBranch?.address || ''),
                      addressCoords: deliveryMethod === 'delivery' && selectedAddress
                        ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
                        : (deliveryMethod === 'pickup' && selectedBranch?.latitude && selectedBranch?.longitude
                          ? { latitude: selectedBranch.latitude, longitude: selectedBranch.longitude }
                          : undefined),
                      city: deliveryMethod === 'delivery'
                        ? (selectedAddress?.city || '')
                        : (selectedBranch?.city || ''),
                      region: deliveryMethod === 'delivery'
                        ? (selectedAddress?.region || '')
                        : '',
                      phone: selectedAddress?.phone,
                      recipientName: selectedAddress?.recipientName,
                      recipientPhone: selectedAddress?.phone,
                      deliveryMethod: deliveryMethod === 'delivery' ? 'delivery' : 'branch',
                      branchName: deliveryMethod === 'pickup' && selectedBranch
                        ? (language === 'ar' ? selectedBranch.name : selectedBranch.nameEn)
                        : undefined,
                      branchLocation: deliveryMethod === 'pickup' && selectedBranch
                        ? selectedBranch.address
                        : undefined,
                      paymentMethod: paymentMethodStr,
                      paymentStatus: status,
                      tapChargeId: gatewayPaymentId,
                      deliveryDate: deliveryDateStr,
                      deliveryTimeSlot: deliveryTimeSlotStr,
                      deliveryOptionName: deliveryMethod === 'delivery' && selectedDeliveryOption
                        ? (language === 'ar' ? selectedDeliveryOption.name : selectedDeliveryOption.nameEn)
                        : undefined,
                      notes: itemNotes,
                    });
                    if (newOrders && newOrders.length > 0) {
                      router.replace(`/order-success?orderId=${newOrders[0].id}` as any);
                    }
                  } catch (err) {
                    console.error('Failed to place order:', err);
                    setOrderAlertConfig({ visible: true, type: 'error', message: t('paymentError') || (language === 'ar' ? 'حدث خطأ أثناء معالجة الطلب' : 'אירעה שגיאה בביצוע ההזמנה.') });
                  } finally {
                    // Keep loading while the in-app payment page is open.
                  }
                };
                processOrderPlacementRef.current = processOrderPlacement;

                await processOrderPlacement();
              }
            }}
            activeOpacity={0.85}
          >
            {isCreatingOrder ? (
              <Text style={styles.nextBtnText}>
                {language === 'ar' ? 'جاري الدفع...' : 'Processing...'}
              </Text>
            ) : currentStep === 2 ? (
              <View style={styles.payBtnLabelRow}>
                <Text style={styles.nextBtnText}>
                  {selectedPayment === 'cash_on_delivery'
                    ? (language === 'ar' ? 'تأكيد الطلب' : 'אישור הזמנה')
                    : t('payShort')}
                </Text>
                {renderPaymentMethodButtonIcon()}
              </View>
            ) : (
              <Text style={styles.nextBtnText}>{t('next')}</Text>
            )}
            {isRTL ? (
              <ArrowLeft size={20} color="#FFF" style={{ marginLeft: 8 }} />
            ) : (
              <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={showPaymentWebView} animationType="slide" onRequestClose={() => closePaymentWebView(true)}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <View style={[styles.container, { flex: 1, backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={[styles.topHeader, { backgroundColor: colors.card, flexDirection: 'row' }]}>
                <TouchableOpacity
                  onPress={() => closePaymentWebView(true)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.paymentWebHeaderBackBtn}
                >
                  {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{paymentWebViewTitle || t('payShort')}</Text>
                <View style={{ width: 32 }} />
              </View>
              {paymentWebViewUrl ? (
                <WebView
                  style={{ flex: 1, backgroundColor: colors.background }}
                  source={{ uri: paymentWebViewUrl }}
                  originWhitelist={['*']}
                  onNavigationStateChange={handlePaymentWebNavigationChange}
                  onLoadStart={() => setPaymentWebViewError(null)}
                  onLoadEnd={() => setIsCreatingOrder(false)}
                  onError={(event) => {
                    const message = event.nativeEvent?.description || (language === 'ar' ? 'تعذر تحميل صفحة الدفع' : 'Failed to load payment page.');
                    setPaymentWebViewError(message);
                    setIsCreatingOrder(false);
                  }}
                  onHttpError={(event) => {
                    const statusCode = event.nativeEvent?.statusCode;
                    const message =
                      language === 'ar'
                        ? `فشل تحميل صفحة الدفع (HTTP ${statusCode})`
                        : `Failed to load payment page (HTTP ${statusCode})`;
                    setPaymentWebViewError(message);
                    setIsCreatingOrder(false);
                  }}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={[styles.noBranchContainer, { backgroundColor: colors.background }]}>
                      <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                  )}
                />
              ) : null}
              {paymentWebViewError ? (
                <View style={[styles.noBranchContainer, { backgroundColor: colors.background }]}>
                  <Text style={[styles.noBranchText, { color: colors.error, textAlign: 'center', marginBottom: 12 }]}>
                    {paymentWebViewError}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (paymentWebViewUrl) {
                        setPaymentWebViewError(null);
                        setPaymentWebViewUrl(`${paymentWebViewUrl}`);
                      }
                    }}
                    style={[styles.mapConfirmBtn, { backgroundColor: colors.primary, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' as const }}>
                      {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </Modal>

      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectCity={handleMapLocationSelected}
        initialCoords={editingAddress ? { latitude: editingAddress.latitude, longitude: editingAddress.longitude } : (userLocation || null)}
        title={t('selectDeliveryAddress')}
      />

      <Modal visible={showOrderTypeChoice} animationType="fade" transparent onRequestClose={() => setShowOrderTypeChoice(false)}>
        <View style={styles.orderTypeOverlay}>
          <View style={[styles.orderTypeDialog, { backgroundColor: colors.card }]}>
            <Text style={[styles.orderTypeTitle, { color: colors.text }]}>
              {language === 'ar' ? 'الطلب لك أو هدية؟' : 'הזמנה אישית או מתנה?'}
            </Text>
            <Text style={[styles.orderTypeSubtitle, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'اختر نوع الطلب لتحديد بيانات المستلم' : 'בחר סוג הזמנה כדי להגדיר פרטי מקבל'}
            </Text>
            <View style={styles.orderTypeOptions}>
              <TouchableOpacity
                style={[styles.orderTypeCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5 }]}
                onPress={() => handleOrderTypeSelect('self')}
                activeOpacity={0.8}
              >
                <View style={[styles.orderTypeIconWrap, { backgroundColor: colors.primary }]}>
                  <User size={24} color="#FFF" />
                </View>
                <Text style={[styles.orderTypeCardTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'شخصي' : 'אישי'}
                </Text>
                <Text style={[styles.orderTypeCardDesc, { color: colors.textSecondary }]}>
                  {language === 'ar' ? 'بيانات حسابي' : 'פרטי החשבון שלי'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.orderTypeCard, { backgroundColor: '#E91E6310', borderColor: '#E91E63', borderWidth: 1.5 }]}
                onPress={() => handleOrderTypeSelect('gift')}
                activeOpacity={0.8}
              >
                <View style={[styles.orderTypeIconWrap, { backgroundColor: '#E91E63' }]}>
                  <Gift size={24} color="#FFF" />
                </View>
                <Text style={[styles.orderTypeCardTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'هدية' : 'מתנה'}
                </Text>
                <Text style={[styles.orderTypeCardDesc, { color: colors.textSecondary }]}>
                  {language === 'ar' ? 'أدخل بيانات المستلم' : 'הזן פרטי מקבל'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setShowOrderTypeChoice(false); setShowMapPicker(true); }} style={styles.orderTypeCancelBtn}>
              <Text style={[styles.orderTypeCancelText, { color: colors.textMuted }]}>
                {language === 'ar' ? 'رجوع للخريطة' : 'חזרה למפה'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRecipientForm} animationType="slide" onRequestClose={() => setShowRecipientForm(false)}>
        <View style={[styles.mapPickerContainer, { backgroundColor: colors.background }]}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
            <View style={[styles.mapPickerHeader, { backgroundColor: colors.card }]}>
              <TouchableOpacity onPress={() => { setShowRecipientForm(false); setShowOrderTypeChoice(true); }}>
                {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
              </TouchableOpacity>
              <Text style={[styles.mapPickerTitle, { color: colors.text }]}>
                {orderType === 'gift'
                  ? (language === 'ar' ? 'بيانات المستلم' : 'Recipient Details')
                  : (language === 'ar' ? 'تفاصيل العنوان' : 'Address Details')}
              </Text>
              <TouchableOpacity onPress={() => setShowRecipientForm(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <ScrollView style={{ flex: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
            <View style={[styles.mapBottomSheet, { backgroundColor: colors.card, margin: 16, borderRadius: 20 }]}>
              {mapAddress ? (
                <View style={[styles.addressResultBox, { backgroundColor: colors.glass, borderColor: colors.borderLight }]}>
                  <View style={styles.addressResultRow}>
                    <MapPin size={16} color={colors.primary} />
                    <Text style={[styles.mapAddressText, { color: colors.text }]} numberOfLines={3}>{mapAddress}</Text>
                  </View>
                  {mapCity ? (
                    <Text style={[styles.mapCityText, { color: colors.textSecondary }]}>{mapCity}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.orderTypeBadge}>
                <View style={[styles.orderTypePill, { backgroundColor: orderType === 'gift' ? '#E91E6315' : colors.primaryLight }]}>
                  {orderType === 'gift' ? <Gift size={14} color="#E91E63" /> : <User size={14} color={colors.primary} />}
                  <Text style={[styles.orderTypePillText, { color: orderType === 'gift' ? '#E91E63' : colors.primary }]}>
                    {orderType === 'gift'
                      ? (language === 'ar' ? 'هدية' : 'מתנה')
                      : (language === 'ar' ? 'شخصي' : 'אישי')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setShowRecipientForm(false); setShowOrderTypeChoice(true); }}>
                  <Text style={[styles.orderTypeChangeText, { color: colors.primary }]}>
                    {language === 'ar' ? 'تغيير' : 'Change'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recipientFields}>
                {orderType === 'gift' && (
                  <>
                    <View style={styles.fieldRow}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('recipientName')}</Text>
                      <View style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.borderLight }]}>
                        <TextInput
                          style={[styles.fieldInputText, { color: colors.text }]}
                          value={recipientName}
                          onChangeText={setRecipientName}
                          placeholder={t('enterName')}
                          placeholderTextColor={colors.textMuted}
                          textAlign={isRTL ? 'right' : 'left'}
                        />
                        <User size={16} color={colors.textMuted} />
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('phoneField')}</Text>
                      <View style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.borderLight }]}>
                        <TextInput
                          style={[styles.fieldInputText, { color: colors.text }]}
                          value={recipientPhone}
                          onChangeText={setRecipientPhone}
                          placeholder={t('enterPhone')}
                          placeholderTextColor={colors.textMuted}
                          textAlign={isRTL ? 'right' : 'left'}
                          keyboardType="phone-pad"
                        />
                        <Phone size={16} color={colors.textMuted} />
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('cityField')}</Text>
                  <View style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.borderLight }]}>
                    <TextInput
                      style={[styles.fieldInputText, { color: colors.text }]}
                      value={mapCity}
                      onChangeText={setMapCity}
                      placeholder={t('cityField')}
                      placeholderTextColor={colors.textMuted}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                    <Building2 size={16} color={colors.textMuted} />
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('addressDetails')}</Text>
                  <View style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.borderLight, minHeight: 60 }]}>
                    <TextInput
                      style={[styles.fieldInputText, { color: colors.text, textAlignVertical: 'top' }]}
                      value={addressDetails}
                      onChangeText={setAddressDetails}
                      placeholder={t('enterAddressDetails')}
                      placeholderTextColor={colors.textMuted}
                      textAlign={isRTL ? 'right' : 'left'}
                      multiline
                      numberOfLines={2}
                    />
                    <FileText size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmAddressBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmRecipientDetails}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmAddressBtnText}>{t('confirmAddress')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showNoteModal !== null}
        transparent
        animationType="fade"
        onRequestClose={closeNoteModal}
        statusBarTranslucent
      >
        <View style={styles.noteModalRoot}>
          <Pressable style={styles.noteModalBackdrop} onPress={closeNoteModal} accessibilityRole="button" accessibilityLabel={language === 'ar' ? 'إغلاق' : 'סגור'} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
            style={styles.noteModalKav}
          >
            <View
              style={[
                styles.noteModalCard,
                { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              <Text style={[styles.noteModalTitle, { color: colors.text }]}>{t('addNote')}</Text>
              <TextInput
                style={[styles.noteModalInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, color: colors.text }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder={t('notes') + '...'}
                placeholderTextColor={colors.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
                multiline
                numberOfLines={4}
                scrollEnabled
              />
              <View style={styles.noteModalBtns}>
                <TouchableOpacity
                  style={[styles.noteModalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveNote}
                  activeOpacity={0.85}
                >
                  <Text style={styles.noteModalBtnText}>{t('save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.noteModalBtn, { backgroundColor: colors.borderLight }]}
                  onPress={closeNoteModal}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.noteModalBtnText, { color: colors.text }]}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm !== null} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteConfirmCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.deleteConfirmText, { color: colors.text }]}>{t('deleteAddressConfirm')}</Text>
            <View style={styles.deleteConfirmBtns}>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: colors.error }]}
                onPress={() => showDeleteConfirm && handleDeleteAddress(showDeleteConfirm)}
              >
                <Text style={styles.deleteConfirmBtnText}>{t('deleteAddress')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: colors.borderLight }]}
                onPress={() => setShowDeleteConfirm(null)}
              >
                <Text style={[styles.deleteConfirmBtnText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      <JanaAssistant
        message={janaCartInfo.message}
        mood={janaCartInfo.mood}
        visible={cart.length > 0 && showNoteModal === null}
        colors={colors}
        position="bottomLeft"
      />

      <GlassAlert {...orderAlertConfig} onDismiss={dismissOrderAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  paymentWebHeaderBackBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  stepItem: { alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 12, fontWeight: '600' as const },
  stepLine: { height: 3, flex: 1, borderRadius: 2, marginHorizontal: 4 },
  scrollContent: { paddingHorizontal: 16 },
  deleteGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  deleteGroupText: { fontSize: 13, fontWeight: '600' as const },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  storeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  soldByText: { fontSize: 14 },
  storeName: { fontSize: 16, fontWeight: '700' as const },
  cartItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cartItemActions: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  cartItemBody: {
    flexDirection: 'row',
    gap: 12,
  },
  cartItemImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
  },
  cartItemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  cartItemName: { fontSize: 16, fontWeight: '700' as const, marginBottom: 8 },
  cartItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cartPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartItemPrice: { fontSize: 16, fontWeight: '700' as const },
  cartUnitPrice: { fontSize: 12, marginLeft: 4 },
  cartOriginalPrice: { fontSize: 13, textDecorationLine: 'line-through' as const },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '700' as const, minWidth: 20, textAlign: 'center' },
  sizeTag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sizeText: { fontSize: 12 },
  addNoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-start' },
  addNoteText: { fontSize: 13, fontWeight: '600' as const },
  noteIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  noteIndicatorText: { fontSize: 12 },

  fulfillmentBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  fulfillmentBannerText: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },

  deliveryMethodToggle: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  deliveryMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  deliveryMethodText: { fontSize: 14, fontWeight: '600' as const },

  addressSection: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  addressTitle: { fontSize: 18, fontWeight: '700' as const },
  addressIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  noAddressContainer: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  noAddressText: { fontSize: 15 },
  addressCard: { borderRadius: 14, borderWidth: 2, padding: 14 },
  addressCardContent: { flexDirection: 'row', gap: 12 },
  addressCardLeft: { alignItems: 'center', gap: 6, paddingTop: 4 },
  addressDot: { width: 10, height: 10, borderRadius: 5 },
  addressCardText: { flex: 1 },
  addressName: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  addressFull: { fontSize: 13, lineHeight: 20 },
  addressMeta: { fontSize: 12, marginTop: 4 },
  addressActions: { flexDirection: 'row', justifyContent: 'flex-start', gap: 16, paddingTop: 8, paddingHorizontal: 4 },
  addressActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressActionText: { fontSize: 12, fontWeight: '600' as const },
  addAddressBtn: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' as const, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  addAddressBtnText: { fontSize: 15, fontWeight: '600' as const },

  deliveryOptionsSection: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  deliveryOptionCard: { borderRadius: 14, borderWidth: 2, padding: 14, marginBottom: 10 },
  deliveryOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deliveryOptionName: { fontSize: 15, fontWeight: '700' as const },
  deliveryOptionDays: { fontSize: 12, marginTop: 4 },
  deliveryOptionInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  deliveryOptionPeriodName: { fontSize: 12 },
  deliveryOptionPrice: { fontSize: 14, fontWeight: '600' as const },
  deliveryOptionDetails: { marginTop: 12 },
  deliveryDaysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  dayChipText: { fontSize: 12, fontWeight: '600' as const },
  deliveryDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  deliveryDateBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  periodsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  periodChipText: { fontSize: 13, fontWeight: '600' as const },
  periodTime: { fontSize: 11, marginTop: 2 },

  branchCard: { borderRadius: 16, borderWidth: 2, marginBottom: 12, overflow: 'hidden' },
  branchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  branchName: { fontSize: 16, fontWeight: '700' as const },
  branchStoreTag: { fontSize: 12, marginTop: 2, fontWeight: '500' as const },
  branchAddress: { fontSize: 13, marginTop: 2 },
  branchDetails: { paddingHorizontal: 16, paddingBottom: 16 },
  branchInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  branchInfoLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  branchInfoLabelText: { fontSize: 13 },
  branchInfoValue: { fontSize: 14, fontWeight: '600' as const },
  branchMapContainer: { marginTop: 8, borderRadius: 14, overflow: 'hidden', height: 180 },
  noBranchContainer: { alignItems: 'center', paddingVertical: 40, gap: 10, borderRadius: 16 },
  googleMapsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 12 },
  googleMapsBtnText: { fontSize: 14, fontWeight: '600' as const },

  summarySection: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20 },
  summaryTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 15 },
  summaryValue: { fontSize: 15, fontWeight: '600' as const },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 },
  summaryTotalLabel: { fontSize: 17, fontWeight: '700' as const },
  summaryTotalValue: { fontSize: 17, fontWeight: '800' as const },
  paymentTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 12 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, gap: 12 },
  paymentLogosSlot: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, position: 'absolute', left: 16, alignItems: 'center', justifyContent: 'center' },
  paymentLabel: { fontSize: 15, fontWeight: '600' as const },
  paymentIcon: { fontSize: 20 },
  bottomBar: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  bottomBarInner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginVertical: 12 },
  backStepBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5 },
  backStepText: { fontSize: 14, fontWeight: '600' as const },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 18, gap: 6 },
  nextBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' as const },
  payBtnLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payBtnMarkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  payBtnMarkWrapTabby: {
    backgroundColor: '#3BFFC1',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const },
  emptyDesc: { fontSize: 15 },
  shopBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, marginTop: 12 },
  shopBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  noteModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  noteModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  noteModalKav: {
    width: '100%',
    maxHeight: '88%',
  },

  mapPickerContainer: { flex: 1 },
  mapPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  mapPickerTitle: { fontSize: 18, fontWeight: '700' as const },
  mapBottomSheet: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.08)',
    elevation: 5,
  },
  mapHintText: { fontSize: 15, textAlign: 'center', fontWeight: '600' as const, marginBottom: 4 },
  tapHintText: { fontSize: 13, textAlign: 'center', marginBottom: 12 },
  addressResultBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  addressResultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mapAddressText: { fontSize: 14, fontWeight: '600' as const, lineHeight: 22, flex: 1 },
  mapCityText: { fontSize: 13, marginTop: 4 },
  recipientFields: { gap: 12, marginBottom: 20 },
  fieldRow: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600' as const },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  fieldInputText: { flex: 1, fontSize: 14 },
  confirmAddressBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  confirmAddressBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' as const },
  noteModalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  noteModalTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 16 },
  noteModalInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 16 },
  noteModalBtns: { flexDirection: 'row', gap: 12 },
  noteModalBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  noteModalBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFF' },
  deleteConfirmCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  deleteConfirmText: { fontSize: 17, fontWeight: '600' as const, textAlign: 'center', marginBottom: 20, lineHeight: 26 },
  deleteConfirmBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteConfirmBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  deleteConfirmBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#FFF' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  paySection: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  paySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  paySectionTitle: { fontSize: 16, fontWeight: '700' as const },
  paySectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  payInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  payInfoText: { fontSize: 13, flexShrink: 1 },
  payProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, gap: 10 },
  payProductImage: { width: 48, height: 48, borderRadius: 10 },
  payProductInfo: { flex: 1 },
  payProductName: { fontSize: 14, fontWeight: '600' as const },
  payProductQty: { fontSize: 12, marginTop: 2 },
  payProductPrice: { fontSize: 14, fontWeight: '700' as const },
  payOriginalPrice: { fontSize: 12, textDecorationLine: 'line-through' as const, marginTop: 2 },
  discountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  discountInput: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  discountApplyBtn: { height: 44, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  discountApplyText: { color: '#FFF', fontSize: 14, fontWeight: '700' as const },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5 },
  invoiceLabel: { fontSize: 14 },
  invoiceValue: { fontSize: 14, fontWeight: '600' as const },
  invoiceTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  invoiceTotalLabel: { fontSize: 16, fontWeight: '700' as const },
  invoiceTotalValue: { fontSize: 18, fontWeight: '800' as const },
  invoiceVatText: { fontSize: 11, marginTop: 2 },
  paymentLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tabbyPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minWidth: 0,
    paddingVertical: 2,
  },
  tabbyTaglineWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  tabbyLogoBadge: {
    flexShrink: 0,
    backgroundColor: '#3BFFC1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabbyPayTagline: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    width: '100%',
  },


  orderTypeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  orderTypeDialog: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  orderTypeTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 6,
    textAlign: 'center',
  },
  orderTypeSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  orderTypeOptions: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginBottom: 16,
  },
  orderTypeCard: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  orderTypeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  orderTypeCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  orderTypeCardDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  orderTypeCancelBtn: {
    paddingVertical: 10,
  },
  orderTypeCancelText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },

  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  orderTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderTypePillText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  orderTypeChangeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
