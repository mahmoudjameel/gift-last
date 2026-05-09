import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
  Share as NativeShare,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  Star,
  ShoppingBag,
  Minus,
  Plus,
  Share,
  MapPinned,
  ChevronLeft,
  CircleCheck,
  Sparkles,
  User,
  X,
  Gift,
  Package,
  Info,
  ChevronDown,
  MessageSquare,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import * as Haptics from 'expo-haptics';
import { GuestLoginModal } from '@/components/GuestLoginPrompt';
import SuccessToast from '@/components/SuccessToast';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import { JanaProductGuide, JanaFloatingCTA } from '@/components/JanaCharacter';
import { GiftCardData } from '@/types';
import { getMergedProductReviews, type FirestoreReview } from '@/services/productReviews';

const { width } = Dimensions.get('window');

const GIFT_CARD_IMAGE = 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=400';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { products, toggleFavorite, addToCart, cart, clearCart, isGuest, colors, t, language, isRTL, storesById } = useApp();
  const [quantity, setQuantity] = useState<number>(1);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const [cityAlertConfig, setCityAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'warning', message: '' });
  const pendingGiftCardRef = useRef<GiftCardData | undefined>(undefined);
  const cartToastNavigated = useRef(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryScrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showGiftAlert, setShowGiftAlert] = useState(false);
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [giftFromName, setGiftFromName] = useState('');
  const [giftToName, setGiftToName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [hideIdentity, setHideIdentity] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [wantGiftCard, setWantGiftCard] = useState(false);
  const [wantGiftWrap, setWantGiftWrap] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showFavToast, setShowFavToast] = useState(false);
  const [favToastMsg, setFavToastMsg] = useState('');
  const pageFadeAnim = useRef(new Animated.Value(0)).current;
  const [productScrollY, setProductScrollY] = useState(0);
  const [productReviews, setProductReviews] = useState<FirestoreReview[]>([]);

  const product = useMemo(
    () => products.find((p) => p.id === id),
    [products, id]
  );

  const store = useMemo(() => {
    const sid = product?.storeId;
    if (!sid) return null;
    return storesById[sid] ?? null;
  }, [product?.storeId, storesById]);

  React.useEffect(() => {
    Animated.timing(pageFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    return () => {
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
    };
  }, []);

  const reloadProductReviews = useCallback(async (productId: string) => {
    const list = await getMergedProductReviews(productId);
    setProductReviews(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!product?.id) {
        setProductReviews([]);
        return;
      }
      reloadProductReviews(product.id);
    }, [product?.id, reloadProductReviews])
  );

  const sameCategoryProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category === product.category && p.city === product.city)
      .slice(0, 6);
  }, [products, product]);

  const diffCategoryProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category !== product.category && p.city === product.city)
      .slice(0, 6);
  }, [products, product]);

  const choiceOptions = useMemo(() => {
    if (!product?.options?.length) return [];
    return product.options.filter(
      (o) =>
        o.type === 'multiple_choice' &&
        (o.choices || []).some((c) => (c.label || '').trim().length > 0)
    );
  }, [product?.options]);

  const [pickedByIndex, setPickedByIndex] = useState<Record<number, string>>({});

  React.useEffect(() => {
    setPickedByIndex({});
  }, [product?.id]);

  const selectedOptionsForCart = useCallback((): Record<string, string> | undefined => {
    if (choiceOptions.length === 0) return undefined;
    const out: Record<string, string> = {};
    choiceOptions.forEach((opt, i) => {
      const v = pickedByIndex[i]?.trim();
      if (!v) return;
      const title =
        (opt.title || '').trim() || (language === 'ar' ? `خيار ${i + 1}` : `Option ${i + 1}`);
      out[title] = v;
    });
    return Object.keys(out).length > 0 ? out : undefined;
  }, [choiceOptions, pickedByIndex, language]);

  const optionsSatisfied = useMemo(() => {
    return choiceOptions.every((opt, i) => {
      if (!opt.required) return true;
      return !!pickedByIndex[i]?.trim();
    });
  }, [choiceOptions, pickedByIndex]);

  const onCartSuccess = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setAddedToCart(true);
    cartToastNavigated.current = false;
    setShowCartToast(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setAddedToCart(false), 2000);
    if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
  }, [scaleAnim]);

  const clearCartAndAdd = useCallback(async (giftCard?: GiftCardData) => {
    if (!product) return;
    await clearCart();
    const result = await addToCart(product, quantity, giftCard, selectedOptionsForCart());
    if (result.success) {
      onCartSuccess();
    }
  }, [product, quantity, clearCart, addToCart, onCartSuccess, selectedOptionsForCart]);

  const doAddToCart = useCallback(async (giftCard?: GiftCardData) => {
    if (!product) return;
    const result = await addToCart(product, quantity, giftCard, selectedOptionsForCart());
    if (!result.success && result.error === 'city_conflict') {
      pendingGiftCardRef.current = giftCard;
      const existingCity = cart[0]?.product?.city || '';
      const newCity = product.city || '';
      setCityAlertConfig({
        visible: true,
        type: 'warning',
        title: language === 'ar' ? 'منتجات من مدينة مختلفة' : 'Products from Different City',
        message: language === 'ar'
          ? `سلة التسوق تحتوي على منتجات من "${existingCity}". هل تريد إفراغ السلة وإضافة هذا المنتج من "${newCity}"؟`
          : `Your cart has products from "${existingCity}". Clear the cart and add this product from "${newCity}"?`,
        buttons: [
          {
            text: language === 'ar' ? 'إفراغ السلة وإضافة' : 'Clear & Add',
            style: 'destructive',
            onPress: () => {
              clearCartAndAdd(pendingGiftCardRef.current);
            },
          },
          {
            text: language === 'ar' ? 'إلغاء' : 'Cancel',
            style: 'cancel',
          },
        ],
      });
      return;
    }
    if (result.success) {
      onCartSuccess();
    }
  }, [product, quantity, addToCart, cart, language, onCartSuccess, clearCartAndAdd, selectedOptionsForCart]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    if (choiceOptions.length > 0 && !optionsSatisfied) {
      setCityAlertConfig({
        visible: true,
        type: 'error',
        title: language === 'ar' ? 'خيارات مطلوبة' : 'Options required',
        message:
          language === 'ar'
            ? 'يرجى اختيار جميع الخيارات الإجبارية قبل الإضافة إلى السلة.'
            : 'Please select all required options before adding to cart.',
        buttons: [
          {
            text: language === 'ar' ? 'حسناً' : 'OK',
            style: 'default',
            onPress: () => setCityAlertConfig((p) => ({ ...p, visible: false })),
          },
        ],
      });
      return;
    }
    if (product.hasGiftCard) {
      setShowGiftAlert(true);
      return;
    }
    doAddToCart();
  }, [product, isGuest, doAddToCart, choiceOptions.length, optionsSatisfied, language]);

  const handleGiftAlertYes = useCallback(() => {
    setShowGiftAlert(false);
    setShowGiftForm(true);
  }, []);

  const handleGiftAlertSkip = useCallback(() => {
    setShowGiftAlert(false);
    doAddToCart();
  }, [doAddToCart]);

  const handleGiftFormSubmit = useCallback(() => {
    const giftCard: GiftCardData = {
      fromName: giftFromName,
      toName: giftToName,
      message: giftMessage,
      hideIdentity,
      specialNotes,
    };
    setShowGiftForm(false);
    doAddToCart(giftCard);
    setGiftFromName('');
    setGiftToName('');
    setGiftMessage('');
    setHideIdentity(false);
    setSpecialNotes('');
  }, [giftFromName, giftToName, giftMessage, hideIdentity, specialNotes, doAddToCart]);

  const handleToggleFavorite = useCallback(() => {
    if (!product) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const wasFav = product.isFavorite;
    toggleFavorite(product.id);
    setFavToastMsg(wasFav ? (language === 'ar' ? 'تم الإزالة من المفضلة' : 'Removed from favorites') : (language === 'ar' ? 'تمت الإضافة للمفضلة' : 'Added to favorites'));
    setShowFavToast(true);
  }, [product, toggleFavorite, language]);

  const handleShareProduct = useCallback(async () => {
    if (!product?.id) return;
    try {
      const shareUrl = `https://us-central1-glorda.cloudfunctions.net/p/${encodeURIComponent(product.id)}`;
      const productTitle = language === 'ar' ? product.name : product.nameEn;
      const message = language === 'ar' ? `منتج: ${productTitle}` : `Product: ${productTitle}`;

      await NativeShare.share({
        title: productTitle,
        message: `${message}\n${shareUrl}`,
      });
    } catch (error) {
      console.warn('[shareProduct] failed:', error);
    }
  }, [product, language]);

  const productImages = useMemo(() => {
    if (product?.images && product.images.length > 0) return product.images;
    return product ? [product.image] : [];
  }, [product]);

  const handleGalleryScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setActiveImageIndex(index);
  }, []);

  const scrollToImage = useCallback((index: number) => {
    setActiveImageIndex(index);
    galleryScrollRef.current?.scrollTo({ x: index * width, animated: true });
  }, []);

  const reviewStats = useMemo(() => {
    if (!product) return { avg: 0, count: 0 };
    if (productReviews.length > 0) {
      const sum = productReviews.reduce((s, r) => s + r.rating, 0);
      return { avg: sum / productReviews.length, count: productReviews.length };
    }
    return {
      avg: product.rating ?? 0,
      count: product.reviewCount ?? 0,
    };
  }, [product, productReviews]);

  if (!product) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {language === 'ar' ? 'المنتج غير موجود' : 'Product not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.backButtonText}>{language === 'ar' ? 'رجوع' : 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const sar = '₪';
  const tabs = [
    { key: 'description' as const, label: t('productDescription') },
    { key: 'reviews' as const, label: t('ratingsAndReviews') },
  ];

  const layoutDir = isRTL ? 'rtl' : 'ltr';
  const textAlign = 'left' as const;
  const writingDir = isRTL ? ('rtl' as const) : ('ltr' as const);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.card, opacity: pageFadeAnim, direction: layoutDir }]}
    >
      <StatusBar barStyle="light-content" />

      <SuccessToast
        visible={showCartToast}
        message={t('addedToCartSuccess')}
        icon="cart"
        buttonText={t('viewCart')}
        onButtonPress={() => {
          cartToastNavigated.current = true;
          setShowCartToast(false);
          router.push('/cart' as any);
        }}
        onDismiss={() => setShowCartToast(false)}
        autoDismissMs={5000}
      />

      <SuccessToast
        visible={showFavToast}
        message={favToastMsg}
        icon="heart"
        onDismiss={() => setShowFavToast(false)}
        autoDismissMs={1500}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setProductScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.imageContainer}>
          <ScrollView
            ref={galleryScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScroll}
            scrollEventThrottle={16}
          >
            {productImages.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.productImage} contentFit="cover" transition={300} />
            ))}
          </ScrollView>

          {productImages.length > 1 && (
            <View style={[styles.imageCounter, isRTL ? styles.imageCounterRTL : styles.imageCounterLTR]}>
              <Text style={styles.imageCounterText}>{activeImageIndex + 1} / {productImages.length}</Text>
            </View>
          )}

          <SafeAreaView edges={['top']} style={[styles.topBar, { direction: layoutDir }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
              {isRTL ? <ArrowRight size={20} color="#FFFFFF" /> : <ArrowLeft size={20} color="#FFFFFF" />}
            </TouchableOpacity>
            <View style={[styles.topBarRight, { direction: layoutDir }]}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleShareProduct}>
                <Share size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleToggleFavorite}>
                <Heart
                  size={20}
                  color={product.isFavorite ? '#FF4B6E' : '#FFFFFF'}
                  fill={product.isFavorite ? '#FF4B6E' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={[styles.content, { backgroundColor: colors.card, direction: layoutDir }]}>
          {product.tags?.includes('handmade') && (
            <View
              style={[
                styles.tagBadge,
                {
                  backgroundColor: colors.glass,
                  borderColor: colors.glassBorder,
                  borderWidth: 1,
                  alignSelf: 'flex-start',
                },
              ]}
            >
              <Sparkles size={14} color={colors.textSecondary} />
              <Text style={[styles.tagBadgeText, { color: colors.textSecondary, textAlign, writingDirection: writingDir }]}>
                {t('handmade')}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.productName,
              { color: colors.text, textAlign, writingDirection: writingDir, width: '100%' },
            ]}
          >
            {language === 'ar' ? product.name : product.nameEn}
          </Text>

          <View style={[styles.priceRow, { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={[styles.price, { color: colors.primary, writingDirection: writingDir }]}>
                {product.price} {sar}
              </Text>
              {hasDiscount && (
                <Text style={[styles.originalPrice, { color: colors.textMuted, writingDirection: writingDir }]}>
                  {product.originalPrice} {sar}
                </Text>
              )}
            </View>
            <View />
          </View>

          <TouchableOpacity
            style={[styles.storeCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, flexDirection: 'row' }]}
            onPress={() => product.storeId && router.push(`/store/${product.storeId}` as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.storeCardContent, { flexDirection: 'row' }]}>
              <View style={[styles.storeCardLogoWrap, { backgroundColor: colors.card }]}>
                <Image
                  source={{ uri: store?.logo || product.shopImage || product.image }}
                  style={styles.storeCardLogo}
                  contentFit="cover"
                />
              </View>
              <View style={[styles.storeCardInfo, { alignItems: 'flex-start' }]}>
                <Text
                  style={[styles.storeCardName, { color: colors.text, textAlign, writingDirection: writingDir }]}
                  numberOfLines={1}
                >
                  {store?.name ?? product.shopName ?? (language === 'ar' ? 'المتجر' : 'Store')}
                </Text>
                <View style={[styles.storeCardCityRow, { flexDirection: 'row' }]}>
                  <MapPinned size={14} color={colors.textSecondary} />
                  <Text style={[styles.storeCardCity, { color: colors.textSecondary, textAlign, writingDirection: writingDir }]}>
                    {store?.city ?? product.city ?? '—'}
                  </Text>
                </View>
                {store && (store.rating > 0 || store.reviewCount > 0) ? (
                  <View style={[styles.storeCardRatingRow, { flexDirection: 'row' }]}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.storeCardRating, { color: colors.text, writingDirection: writingDir }]}>{store.rating?.toFixed(1) ?? '—'}</Text>
                    <Text style={[styles.storeCardReviewCount, { color: colors.textMuted, writingDirection: writingDir }]}>
                      ({store.reviewCount ?? 0} {language === 'ar' ? 'تقييم' : 'reviews'})
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <ChevronLeft size={20} color={colors.textMuted} style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }} />
          </TouchableOpacity>

          {choiceOptions.length > 0 && (
            <View style={[styles.productOptionsSection, { borderTopColor: colors.borderLight }]}>
              <Text
                style={[
                  styles.productOptionsHeading,
                  { color: colors.textSecondary, textAlign, writingDirection: writingDir },
                ]}
              >
                {language === 'ar' ? 'خيارات المنتج' : 'Product options'}
              </Text>
              {choiceOptions.map((opt, i) => (
                <View key={i} style={[styles.productOptionBlock, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.productOptionTitle, { color: colors.text, textAlign, writingDirection: writingDir }]}>
                    {(opt.title || '').trim() ||
                      (language === 'ar' ? `خيار ${i + 1}` : `Option ${i + 1}`)}
                    {opt.required ? <Text style={{ color: colors.error }}> *</Text> : null}
                  </Text>
                  <View style={[styles.optionChipsRow, { flexDirection: 'row', justifyContent: 'flex-start' }]}>
                    {(opt.choices || [])
                      .map((c) => (c.label || '').trim())
                      .filter(Boolean)
                      .map((label, j) => {
                        const selected = pickedByIndex[i] === label;
                        return (
                          <TouchableOpacity
                            key={`${i}-${j}-${label}`}
                            onPress={() => setPickedByIndex((prev) => ({ ...prev, [i]: label }))}
                            activeOpacity={0.85}
                            style={[
                              styles.optionChip,
                              {
                                borderColor: selected ? colors.primary : colors.borderLight,
                                backgroundColor: selected ? colors.primary + '22' : colors.glass,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '600' as const,
                                color: selected ? colors.primary : colors.text,
                                textAlign: 'center',
                                writingDirection: writingDir,
                              }}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              ))}
            </View>
          )}

          <JanaProductGuide product={product} colors={colors} scrollY={productScrollY} />

          {product.hasGiftCard && (
            <View style={[styles.giftOptionsRow, { direction: layoutDir }]}>
              <TouchableOpacity
                style={[styles.giftOptionCard, { backgroundColor: wantGiftCard ? '#E8F5E9' : colors.glass, borderColor: wantGiftCard ? '#4CAF50' : colors.glassBorder, borderWidth: 1 }]}
                onPress={() => setWantGiftCard(!wantGiftCard)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.giftOptionCheck,
                    {
                      borderColor: wantGiftCard ? '#4CAF50' : colors.border,
                      backgroundColor: wantGiftCard ? '#4CAF50' : 'transparent',
                      [isRTL ? 'right' : 'left']: 8,
                    },
                  ]}
                >
                  {wantGiftCard && <CircleCheck size={14} color="#FFF" />}
                </View>
                <Gift size={24} color={wantGiftCard ? '#4CAF50' : colors.primary} />
                <Text
                  style={[
                    styles.giftOptionText,
                    { color: colors.primary, textDecorationLine: 'underline', writingDirection: writingDir },
                  ]}
                >
                  {t('addGiftCard')}
                </Text>
              </TouchableOpacity>
              
            </View>
          )}

          <View style={[styles.tabsContainer, { borderBottomColor: colors.borderLight, flexDirection: 'row' }]}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab.key ? colors.primary : colors.textMuted, textAlign: 'center', writingDirection: writingDir },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'description' && (
            <View style={[styles.tabContent, { direction: layoutDir }]}>
              <Text
                style={[styles.description, { color: colors.textSecondary, textAlign, writingDirection: writingDir }]}
                numberOfLines={descExpanded ? undefined : 4}
              >
                {product.description}
              </Text>
              {product.description.length > 120 && (
                <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)} style={{ alignSelf: 'flex-start' }}>
                  <Text style={[styles.readMoreText, { color: colors.primary, textAlign, writingDirection: writingDir }]}>
                    {descExpanded ? '' : t('readMore')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={[styles.tabContent, { direction: layoutDir }]}>
              <View style={[styles.ratingOverview, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
                <View style={styles.ratingLeft}>
                  <Text style={[styles.ratingBig, { color: colors.text, textAlign, writingDirection: writingDir }]}>
                    {reviewStats.count > 0 || (product.rating ?? 0) > 0
                      ? reviewStats.avg.toFixed(1)
                      : '—'}
                  </Text>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        color="#F59E0B"
                        fill={s <= Math.round(reviewStats.avg || product.rating || 0) ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                  </View>
                  <Text style={[styles.ratingCount, { color: colors.textMuted, textAlign, writingDirection: writingDir }]}>
                    {reviewStats.count} {t('basedOnReviews')}
                  </Text>
                </View>
              </View>

              {productReviews.length === 0 ? (
                <Text
                  style={[
                    styles.description,
                    { color: colors.textMuted, textAlign, writingDirection: writingDir, marginTop: 16, width: '100%' as const },
                  ]}
                >
                  {t('noReviews')}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ direction: layoutDir }}
                  contentContainerStyle={styles.reviewsRow}
                >
                  {productReviews.map((review) => (
                    <View
                      key={review.id}
                      style={[
                        styles.reviewCard,
                        { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, direction: layoutDir },
                      ]}
                    >
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12} color="#F59E0B" fill={s <= review.rating ? '#F59E0B' : 'transparent'} />
                          ))}
                        </View>
                        <View style={styles.reviewUser}>
                          <Text
                            style={[styles.reviewName, { color: colors.text, textAlign, writingDirection: writingDir }]}
                            numberOfLines={1}
                          >
                            {review.customerName || (language === 'ar' ? 'عميل' : 'Customer')}
                          </Text>
                          {review.customerAvatar ? (
                            <Image source={{ uri: review.customerAvatar }} style={styles.reviewAvatarImg} contentFit="cover" />
                          ) : (
                            <View style={[styles.reviewAvatar, { backgroundColor: colors.primaryLight }]}>
                              <User size={14} color={colors.primary} />
                            </View>
                          )}
                        </View>
                      </View>
                      {review.comment ? (
                        <Text
                          style={[styles.reviewNote, { color: colors.textSecondary, textAlign, writingDirection: writingDir }]}
                          numberOfLines={4}
                        >
                          {review.comment}
                        </Text>
                      ) : null}
                      {review.date ? (
                        <Text style={[styles.reviewTime, { color: colors.textMuted, textAlign, writingDirection: writingDir }]}>
                          {review.date}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {sameCategoryProducts.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <Text
                style={[styles.sectionLabel, { color: colors.text, textAlign, writingDirection: writingDir, width: '100%' as const }]}
              >
                {t('youMayAlsoLike')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ direction: layoutDir }}
                contentContainerStyle={styles.recRow}
              >
                {sameCategoryProducts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.recCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
                    onPress={() => router.push(`/product/${p.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: p.image }} style={styles.recImage} contentFit="cover" />
                    <View style={styles.recInfo}>
                      <Text
                        style={[styles.recName, { color: colors.text, textAlign, writingDirection: writingDir }]}
                        numberOfLines={1}
                      >
                        {language === 'ar' ? p.name : p.nameEn}
                      </Text>
                      <Text style={[styles.recPrice, { color: colors.primary, textAlign, writingDirection: writingDir }]}>
                        {p.price} {sar}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {diffCategoryProducts.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <Text
                style={[styles.sectionLabel, { color: colors.text, textAlign, writingDirection: writingDir, width: '100%' as const }]}
              >
                {t('moreFromCity')} {product.city ?? 'جدة'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ direction: layoutDir }}
                contentContainerStyle={styles.recRow}
              >
                {diffCategoryProducts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.recCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
                    onPress={() => router.push(`/product/${p.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: p.image }} style={styles.recImage} contentFit="cover" />
                    <View style={styles.recInfo}>
                      <Text
                        style={[styles.recName, { color: colors.text, textAlign, writingDirection: writingDir }]}
                        numberOfLines={1}
                      >
                        {language === 'ar' ? p.name : p.nameEn}
                      </Text>
                      <Text style={[styles.recPrice, { color: colors.primary, textAlign, writingDirection: writingDir }]}>
                        {p.price} {sar}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      <JanaFloatingCTA visible={productScrollY > 200} colors={colors} onAddToCart={handleAddToCart} />

      <SafeAreaView
        edges={['bottom']}
        style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.borderLight, direction: layoutDir }]}
      >
        <View style={[styles.bottomContent, { direction: layoutDir }]}>
          <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleAddToCart}
              style={[
                styles.addToCartBtn,
                {
                  backgroundColor: addedToCart ? colors.success : colors.primary,
                  flexDirection: 'row',
                },
              ]}
              activeOpacity={0.85}
              testID="add-to-cart-btn"
            >
              {addedToCart ? (
                <>
                  <CircleCheck size={20} color="#FFFFFF" />
                  <Text style={[styles.addToCartText, { writingDirection: writingDir }]}>{t('addedToCart')}</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={20} color="#FFFFFF" />
                  <Text style={[styles.addToCartText, { writingDirection: writingDir }]}>{t('addToCart')}</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
          
        </View>
      </SafeAreaView>

      <Modal visible={showGiftAlert} transparent animationType="fade" onRequestClose={() => setShowGiftAlert(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.alertCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.alertClose} onPress={() => setShowGiftAlert(false)}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.alertTitle, { color: colors.text }]}>{t('giftCardAlert')}</Text>
            <View style={styles.alertBody}>
              <View style={[styles.alertIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Gift size={32} color={colors.primary} />
              </View>
              <Text style={[styles.alertMessage, { color: colors.text }]}>{t('giftCardAlertMsg')}</Text>
            </View>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertBtn, { backgroundColor: colors.primary }]}
                onPress={handleGiftAlertYes}
                activeOpacity={0.85}
              >
                <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
                <Text style={styles.alertBtnTextWhite}>{t('giftCardYes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertBtn, { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 2 }]}
                onPress={handleGiftAlertSkip}
                activeOpacity={0.85}
              >
                <ArrowRight size={18} color={colors.primary} style={{ marginLeft: 6 }} />
                <Text style={[styles.alertBtnTextOutline, { color: colors.primary }]}>{t('giftCardSkip')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showGiftForm} transparent animationType="slide" onRequestClose={() => setShowGiftForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.giftFormCard, { backgroundColor: colors.card }]}>
              <View style={styles.giftFormHandle} />
              <View style={styles.giftFormHeader}>
                <TouchableOpacity onPress={() => setShowGiftForm(false)}>
                  <X size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.giftFormTitleRow}>
                  <Text style={[styles.giftFormTitle, { color: colors.text }]}>{t('chooseGiftCard')}</Text>
                  <View style={[styles.giftFormIcon, { backgroundColor: colors.primaryLight }]}>
                    <Gift size={20} color={colors.primary} />
                  </View>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.giftFormScroll}>
                <View style={styles.giftCardImageWrap}>
                  <Image source={{ uri: GIFT_CARD_IMAGE }} style={styles.giftCardImage} contentFit="cover" />
                </View>
                <Text style={[styles.giftCardFeeText, { color: colors.text }]}>
                  {t('giftCardFeeLabel')} {product.giftCardFee ?? 0} {sar}
                </Text>

                <Text style={[styles.giftSectionTitle, { color: colors.text }]}>{t('giftCardMessage')}</Text>
                <Text style={[styles.giftSectionNote, { color: colors.textMuted }]}>{t('giftCardMessageNote')}</Text>

                <View style={[styles.toggleRow, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('hideIdentity')}</Text>
                  <Switch
                    value={hideIdentity}
                    onValueChange={setHideIdentity}
                    trackColor={{ false: '#E5E7EB', true: colors.primary }}
                    thumbColor="#FFF"
                  />
                </View>

                {hideIdentity && (
                  <View style={[styles.infoBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                    <Info size={16} color={colors.primary} />
                    <Text style={[styles.infoBoxText, { color: colors.primary }]}>{t('hideIdentityInfo')}</Text>
                  </View>
                )}

                {!hideIdentity && (
                  <View style={styles.nameFieldsRow}>
                    <View style={styles.nameFieldWrap}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>* {t('giftTo')}</Text>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, color: colors.text }]}
                        value={giftToName}
                        onChangeText={setGiftToName}
                        placeholder={t('writeNamePlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    </View>
                    <View style={styles.nameFieldWrap}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>* {t('giftFrom')}</Text>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, color: colors.text }]}
                        value={giftFromName}
                        onChangeText={setGiftFromName}
                        placeholder={t('writeNamePlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    </View>
                  </View>
                )}

                {hideIdentity && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>* {t('giftTo')}</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, color: colors.text }]}
                      value={giftToName}
                      onChangeText={setGiftToName}
                      placeholder={t('writeNamePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                )}

                <TextInput
                  style={[styles.wishInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, color: colors.text }]}
                  value={giftMessage}
                  onChangeText={(text) => { if (text.length <= 200) setGiftMessage(text); }}
                  placeholder={t('giftWish')}
                  placeholderTextColor={colors.textMuted}
                  textAlign={isRTL ? 'right' : 'left'}
                  multiline
                  numberOfLines={4}
                />
                <Text style={[styles.charCount, { color: colors.textMuted }]}>{giftMessage.length}/200</Text>

                <View style={[styles.specialNotesSection, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.giftSectionTitle, { color: colors.text }]}>{t('specialNotes')}</Text>
                  <View style={styles.specialNotesRow}>
                    <ChevronLeft size={18} color={colors.textMuted} />
                    <Text style={[styles.specialNotesQuestion, { color: colors.textSecondary }]}>{t('specialNotesQuestion')}</Text>
                    <View style={[styles.specialNotesIcon, { backgroundColor: colors.primaryLight }]}>
                      <MessageSquare size={16} color={colors.primary} />
                    </View>
                  </View>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1, color: colors.text, height: 80, textAlignVertical: 'top', marginTop: 8 }]}
                    value={specialNotes}
                    onChangeText={setSpecialNotes}
                    placeholder={t('notes') + '...'}
                    placeholderTextColor={colors.textMuted}
                    textAlign={isRTL ? 'right' : 'left'}
                    multiline
                  />
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              <TouchableOpacity
                style={[styles.giftFormSubmit, { backgroundColor: colors.primary }]}
                onPress={handleGiftFormSubmit}
                activeOpacity={0.85}
              >
                <Text style={styles.giftFormSubmitText}>{t('addToCart')}</Text>
                <ShoppingBag size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <GuestLoginModal visible={showGuestModal} onClose={() => setShowGuestModal(false)} />
      <GlassAlert {...cityAlertConfig} onDismiss={() => setCityAlertConfig(prev => ({ ...prev, visible: false }))} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 18, fontWeight: '600' as const, marginBottom: 16 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#FFFFFF', fontWeight: '600' as const },
  imageContainer: { width: width, height: width * 1.1, position: 'relative' },
  productImage: { width: width, height: width * 1.1 },
  imageCounter: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  imageCounterLTR: { left: 16 },
  imageCounterRTL: { right: 16 },
  imageCounterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  topBarRight: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -30 },
  tagBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 10 },
  tagBadgeText: { fontSize: 12, fontWeight: '600' as const },
  productName: { fontSize: 26, fontWeight: '800' as const, marginBottom: 8, width: '100%' },
  priceRow: { alignItems: 'center', gap: 12, marginBottom: 20, width: '100%' },
  price: { fontSize: 24, fontWeight: '800' as const },
  originalPrice: { fontSize: 16, textDecorationLine: 'line-through' as const, marginTop: 4 },
  storeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, marginBottom: 16 },
  storeCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  storeCardLogoWrap: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  storeCardLogo: { width: 56, height: 56, borderRadius: 14 },
  storeCardInfo: { flex: 1, minWidth: 0 },
  storeCardName: { fontSize: 17, fontWeight: '700' as const, marginBottom: 4 },
  storeCardCityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  storeCardCity: { fontSize: 13 },
  storeCardRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeCardRating: { fontSize: 13, fontWeight: '600' as const },
  storeCardReviewCount: { fontSize: 12 },
  productOptionsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginBottom: 16,
  },
  productOptionsHeading: { fontSize: 13, fontWeight: '600' as const, marginBottom: 12 },
  productOptionBlock: { marginBottom: 14 },
  productOptionTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 10 },
  optionChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  giftOptionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  giftOptionCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, gap: 8, position: 'relative', minHeight: 100 },
  giftOptionCheck: { position: 'absolute', top: 8, width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  giftOptionText: { fontSize: 13, fontWeight: '600' as const, textAlign: 'center' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 0 },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  tabContent: { paddingTop: 16, paddingBottom: 8 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 18 },
  sectionLabel: { fontSize: 18, fontWeight: '700' as const, marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 24 },
  readMoreText: { fontSize: 14, fontWeight: '600' as const, marginTop: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  specLabel: { fontSize: 15, fontWeight: '600' as const },
  specValue: { fontSize: 15 },
  ratingOverview: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  ratingLeft: { alignItems: 'center', gap: 6 },
  ratingBig: { fontSize: 36, fontWeight: '800' as const },
  ratingStars: { flexDirection: 'row', gap: 3 },
  ratingCount: { fontSize: 12, marginTop: 2 },
  reviewsRow: { paddingHorizontal: 0, gap: 12 },
  reviewCard: { borderRadius: 14, padding: 14, width: 260, minHeight: 120 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  reviewName: { fontSize: 14, fontWeight: '600' as const },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewNote: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  reviewTime: { fontSize: 11 },
  recRow: { gap: 10, paddingBottom: 4 },
  recCard: { width: 140, borderRadius: 14, overflow: 'hidden' },
  recImage: { width: 140, height: 120 },
  recInfo: { padding: 10 },
  recName: { fontSize: 13, fontWeight: '600' as const, marginBottom: 4 },
  recPrice: { fontSize: 14, fontWeight: '700' as const },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  bottomContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 17, fontWeight: '700' as const, minWidth: 24, textAlign: 'center' },
  addToCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, height: 54, gap: 8 },
  addToCartText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertCard: { width: width * 0.88, borderRadius: 24, padding: 24, alignItems: 'center' },
  alertClose: { position: 'absolute', top: 16, left: 16, zIndex: 1 },
  alertTitle: { fontSize: 20, fontWeight: '800' as const, marginBottom: 20 },
  alertBody: { alignItems: 'center', gap: 16, marginBottom: 24, flexDirection: 'row' },
  alertIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertMessage: { fontSize: 16, fontWeight: '600' as const, textAlign: 'center', lineHeight: 26, flex: 1 },
  alertButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  alertBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 6 },
  alertBtnTextWhite: { fontSize: 16, fontWeight: '700' as const, color: '#FFF' },
  alertBtnTextOutline: { fontSize: 16, fontWeight: '700' as const },
  giftFormCard: { width: '100%', height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'absolute', bottom: 0 },
  giftFormHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 10 },
  giftFormHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  giftFormTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  giftFormTitle: { fontSize: 18, fontWeight: '700' as const },
  giftFormIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  giftFormScroll: { paddingHorizontal: 20 },
  giftCardImageWrap: { alignItems: 'center', marginBottom: 12 },
  giftCardImage: { width: 160, height: 120, borderRadius: 14 },
  giftCardFeeText: { fontSize: 14, fontWeight: '600' as const, textAlign: 'center', marginBottom: 20 },
  giftSectionTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 6 },
  giftSectionNote: { fontSize: 13, marginBottom: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, marginBottom: 10 },
  toggleLabel: { fontSize: 15, fontWeight: '600' as const },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  infoBoxText: { fontSize: 13, lineHeight: 20, flex: 1 },
  nameFieldsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  nameFieldWrap: { flex: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  fieldInput: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  wishInput: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, height: 100, textAlignVertical: 'top', marginTop: 14 },
  charCount: { fontSize: 12, textAlign: 'left', marginTop: 4 },
  specialNotesSection: { borderTopWidth: 1, paddingTop: 16, marginTop: 16 },
  specialNotesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  specialNotesQuestion: { flex: 1, fontSize: 14 },
  specialNotesIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  giftFormSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginBottom: 24, paddingVertical: 16, borderRadius: 18, gap: 8 },
  giftFormSubmitText: { color: '#FFF', fontSize: 17, fontWeight: '700' as const },
});
