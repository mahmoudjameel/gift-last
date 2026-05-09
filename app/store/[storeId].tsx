import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  MessageSquareText,
  Share as ShareIcon,
  MapPinned,
  Star,
  User,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { getMerchantById } from '@/services/firestore';
import { getMergedMerchantReviews, type FirestoreReview } from '@/services/productReviews';
import { formatAddressAsAreaOnly } from '@/utils/location';
import { getOrCreateDirectConversation } from '@/services/chat';
import ProductCard from '@/components/ProductCard';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48 - 12) / 2;

const mockStores: Record<string, {
  id: string;
  name: string;
  username: string;
  city: string;
  rating: number;
  reviewCount: number;
  description: string;
  logo: string;
  banner: string;
  isOpen: boolean;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  snapchat?: string;
  website?: string;
  chatId: string;
}> = {
  s1: {
    id: 's1',
    name: 'زاهية | ورد طبيعي',
    username: '@zahia_flowers',
    city: 'الرياض',
    rating: 4.8,
    reviewCount: 234,
    description: 'التوصيل متوفر في الرياض والخرج للطلبات او الاستفسارات التواصل مع 0550772934',
    logo: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200',
    banner: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&h=300&fit=crop',
    isOpen: true,
    instagram: 'zahia_flowers',
    twitter: 'zahia_flowers',
    facebook: 'zahia.flowers',
    website: 'https://zahia.sa',
    chatId: 'c1',
  },
  s2: {
    id: 's2',
    name: 'حلويات السعادة',
    username: '@happiness_sweets',
    city: 'جدة',
    rating: 4.9,
    reviewCount: 189,
    description: 'أشهى الحلويات والكيك الطازج يومياً. توصيل لجميع أحياء جدة ومكة.',
    logo: 'https://images.unsplash.com/photo-1486427944544-d2c246c4d3f5?w=200',
    banner: 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=800&h=300&fit=crop',
    isOpen: true,
    instagram: 'happiness_sweets',
    tiktok: 'happiness_sweets',
    chatId: 'c2',
  },
  s3: {
    id: 's3',
    name: 'هدايا فاخرة',
    username: '@luxury_gifts',
    city: 'الرياض',
    rating: 4.7,
    reviewCount: 156,
    description: 'هدايا فاخرة لكل المناسبات. صناديق هدايا مميزة بتغليف احترافي.',
    logo: 'https://images.unsplash.com/photo-1549465220-1a8b9238f7e8?w=200',
    banner: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800&h=300&fit=crop',
    isOpen: true,
    instagram: 'luxury_gifts_sa',
    chatId: 'c3',
  },
  s4: {
    id: 's4',
    name: 'شوكو آرت',
    username: '@choco_art',
    city: 'مكة المكرمة',
    rating: 4.6,
    reviewCount: 98,
    description: 'شوكولاتة بلجيكية فاخرة مصنوعة يدوياً بأجود المكونات.',
    logo: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=200',
    banner: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800&h=300&fit=crop',
    isOpen: true,
    instagram: 'choco_art_sa',
    snapchat: 'choco_art',
    chatId: 'c1',
  },
  s5: {
    id: 's5',
    name: 'حدائق الزهور',
    username: '@flower_gardens',
    city: 'الدمام',
    rating: 4.4,
    reviewCount: 65,
    description: 'باقات ورود طبيعية طازجة يومياً من أجود المزارع.',
    logo: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200',
    banner: 'https://images.unsplash.com/photo-1457089328109-e5d9bd499571?w=800&h=300&fit=crop',
    isOpen: true,
    instagram: 'flower_gardens_sa',
    tiktok: 'flower_gardens',
    chatId: 'c2',
  },
};

export default function StoreProfileScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const { products, toggleFavorite, colors, t, language, favoriteStoreIds, toggleFavoriteStore, isRTL, storesById, user, isGuest } = useApp();
  const [fetchedStore, setFetchedStore] = useState<typeof mockStores[string] | null>(null);
  const [storeReviews, setStoreReviews] = useState<FirestoreReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const store = useMemo(() => {
    const id = storeId ?? '';
    return (storesById[id] as typeof mockStores[string] | undefined) ?? mockStores[id] ?? fetchedStore ?? null;
  }, [storeId, storesById, fetchedStore]);

  useEffect(() => {
    const id = storeId ?? '';
    if (!id || mockStores[id] || storesById[id]) return;
    getMerchantById(id).then((s) => s && setFetchedStore(s as typeof mockStores[string]));
  }, [storeId, storesById]);

  useEffect(() => {
    const id = storeId ?? '';
    if (!id) {
      setStoreReviews([]);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    getMergedMerchantReviews(id)
      .then((list) => {
        if (!cancelled) setStoreReviews(list);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const storeProducts = useMemo(() => {
    if (!storeId) return [];
    return products.filter(p => p.storeId === storeId);
  }, [products, storeId]);

  const isFav = useMemo(() => favoriteStoreIds.includes(storeId ?? ''), [favoriteStoreIds, storeId]);

  const handleToggleFavorite = useCallback((id: string) => toggleFavorite(id), [toggleFavorite]);

  const handleFollow = useCallback(() => {
    if (storeId) {
      toggleFavoriteStore(storeId);
    }
  }, [storeId, toggleFavoriteStore]);

  const [messageLoading, setMessageLoading] = useState(false);
  const handleMessage = useCallback(async () => {
    if (!storeId || !store) return;
    if (isGuest || !user?.id) {
      router.push('/auth/login' as any);
      return;
    }
    setMessageLoading(true);
    try {
      const conv = await getOrCreateDirectConversation(user.id, storeId);
      if (conv) router.push(`/chat/${conv.id}` as any);
    } finally {
      setMessageLoading(false);
    }
  }, [store, storeId, user?.id, isGuest, router]);

  const handleShare = useCallback(async () => {
    try {
      if (!storeId) return;
      const shareUrl = `https://us-central1-glorda.cloudfunctions.net/s/${encodeURIComponent(storeId)}`;
      const storeTitle = store?.name ?? (language === 'ar' ? 'متجر KADO' : 'חנות KADO');
      const message = language === 'ar' ? `متجر: ${storeTitle}` : `חנות: ${storeTitle}`;
      await Share.share({
        title: storeTitle,
        message: `${message}\n${shareUrl}`,
      });
    } catch (e) {
      void e;
    }
  }, [store, storeId, language]);

  if (!store) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {language === 'ar' ? 'المتجر غير موجود' : 'החנות לא נמצאה'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.errorBackBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.errorBackBtnText}>{language === 'ar' ? 'رجوع' : 'חזור'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.bannerContainer}>
          <Image source={{ uri: store.banner }} style={styles.bannerImage} contentFit="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.15)']}
            style={styles.bannerOverlay}
          />
          <SafeAreaView edges={['top']} style={styles.bannerNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.bannerNavBtn}>
              {isRTL ? <ArrowRight size={20} color="#FFF" /> : <ArrowLeft size={20} color="#FFF" />}
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.profileSection}>
          <View style={[styles.storeLogoContainer, { borderColor: colors.background, backgroundColor: colors.background }]}>
            <Image source={{ uri: store.logo }} style={styles.storeLogo} contentFit="cover" />
          </View>

          <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
          <Text style={[styles.storeUsername, { color: colors.textSecondary }]}>{store.username}</Text>

          <View style={styles.infoRow}>
            <View style={[styles.statusBadge, { backgroundColor: store.isOpen ? colors.successLight : colors.errorLight }]}>
              <View style={[styles.statusDot, { backgroundColor: store.isOpen ? colors.success : colors.error }]} />
              <Text style={[styles.statusText, { color: store.isOpen ? colors.success : colors.error }]}>
                {store.isOpen ? (language === 'ar' ? 'مفتوح' : 'פתוח') : (language === 'ar' ? 'مغلق' : 'סגור')}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.text }]}>{store.rating}</Text>
              <Text style={[styles.reviewCount, { color: colors.textMuted }]}>({store.reviewCount})</Text>
            </View>
            <View style={styles.cityRow}>
              <MapPinned size={14} color={colors.textSecondary} />
              <Text style={[styles.cityText, { color: colors.textSecondary }]} numberOfLines={2}>
                {formatAddressAsAreaOnly(
                  ('locationAddress' in store && (store as { locationAddress?: string }).locationAddress) || '',
                  40
                ) || store.city}
              </Text>
            </View>
          </View>

          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
              onPress={handleMessage}
              activeOpacity={0.8}
              disabled={messageLoading}
            >
              <MessageSquareText size={18} color="#FFF" />
              <Text style={styles.actionBtnPrimaryText}>
                {messageLoading ? (language === 'ar' ? '...' : '...') : (language === 'ar' ? 'مراسلة' : 'הודעה')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnIcon, { borderColor: isFav ? colors.primary : colors.border, backgroundColor: isFav ? colors.primaryLight : 'transparent' }]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              <Heart size={18} color={isFav ? colors.primary : colors.textSecondary} fill={isFav ? colors.primary : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnIcon, { borderColor: colors.border }]}
              onPress={handleShare}
            >
              <ShareIcon size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {store.description ? (
            <View style={[styles.descCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
              <Text style={[styles.descText, { color: colors.textSecondary }]}>{store.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.reviewsSection}>
          <Text style={[styles.reviewsSectionTitle, { color: colors.text }]}>
            {t('ratingsReviews')}
          </Text>
          {reviewsLoading ? (
            <Text style={[styles.reviewsLoadingText, { color: colors.textMuted }]}>{t('loading')}</Text>
          ) : storeReviews.length === 0 ? (
            <Text style={[styles.reviewsEmpty, { color: colors.textMuted }]}>{t('noReviews')}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeReviewsRow}
            >
              {storeReviews.map((review) => (
                <View
                  key={review.id}
                  style={[styles.storeReviewCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
                >
                  <View style={styles.storeReviewTop}>
                    <View style={styles.storeReviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} color="#F59E0B" fill={s <= review.rating ? '#F59E0B' : 'transparent'} />
                      ))}
                    </View>
                    <View style={styles.storeReviewUser}>
                      {review.customerAvatar ? (
                        <Image source={{ uri: review.customerAvatar }} style={styles.storeReviewAvatarImg} contentFit="cover" />
                      ) : (
                        <View style={[styles.storeReviewAvatar, { backgroundColor: colors.borderLight }]}>
                          <User size={14} color={colors.textMuted} />
                        </View>
                      )}
                      <Text style={[styles.storeReviewName, { color: colors.text }]} numberOfLines={1}>
                        {review.customerName || (language === 'ar' ? 'عميل' : 'לקוח')}
                      </Text>
                    </View>
                  </View>
                  {review.productName ? (
                    <Text style={[styles.storeReviewProduct, { color: colors.primary }]} numberOfLines={1}>
                      {review.productName}
                    </Text>
                  ) : null}
                  {review.comment ? (
                    <Text style={[styles.storeReviewComment, { color: colors.textSecondary }]} numberOfLines={3}>
                      {review.comment}
                    </Text>
                  ) : null}
                  {review.reply ? (
                    <View style={[styles.storeReviewReply, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.storeReviewReplyLabel, { color: colors.primary }]}>
                        {language === 'ar' ? 'رد المتجر' : 'תגובת החנות'}
                      </Text>
                      <Text style={[styles.storeReviewReplyText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {review.reply}
                      </Text>
                    </View>
                  ) : null}
                  {review.date ? (
                    <Text style={[styles.storeReviewDate, { color: colors.textMuted }]}>{review.date}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.productsSectionWrapper}>
          <View style={styles.sectionTitleWrap}>
            <Text
              style={[
                styles.productsSectionTitle,
                {
                  color: colors.text,
                  textAlign: isRTL ? 'left' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            >
              {t('storeProducts')}
            </Text>
          </View>
          <View style={styles.productGrid}>
            {storeProducts.map((product) => (
              <View key={product.id} style={{ width: PRODUCT_WIDTH }}>
                <ProductCard product={product} onToggleFavorite={handleToggleFavorite} />
              </View>
            ))}
          </View>
          {storeProducts.length === 0 && (
            <View style={styles.emptyProducts}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('noProductsAvailable')}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  errorBackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  scrollContent: {},
  bannerContainer: {
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  bannerNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: -50,
  },
  storeLogoContainer: {
    borderWidth: 4,
    borderRadius: 60,
    padding: 2,
    marginBottom: 12,
  },
  storeLogo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 4,
    textAlign: 'left',
    width: '100%',
  },
  storeUsername: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'left',
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  reviewCount: {
    fontSize: 13,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'left',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    flex: 1,
    maxWidth: 180,
  },
  actionBtnPrimaryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  actionBtnIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  descCard: {
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 14,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
  },
  reviewsSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  reviewsSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
    textAlign: 'left',
  },
  reviewsLoadingText: { fontSize: 14, marginBottom: 8, textAlign: 'left' },
  reviewsEmpty: { fontSize: 14, marginBottom: 8, textAlign: 'left' },
  storeReviewsRow: { gap: 12, paddingBottom: 4 },
  storeReviewCard: {
    width: 260,
    borderRadius: 14,
    padding: 14,
    marginRight: 4,
  },
  storeReviewTop: { marginBottom: 8 },
  storeReviewStars: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  storeReviewUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeReviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeReviewAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  storeReviewName: { flex: 1, fontSize: 14, fontWeight: '600' as const, textAlign: 'left' },
  storeReviewProduct: { fontSize: 12, fontWeight: '600' as const, marginBottom: 6, textAlign: 'left' },
  storeReviewComment: { fontSize: 13, lineHeight: 20, marginBottom: 8, textAlign: 'left' },
  storeReviewReply: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  storeReviewReplyLabel: { fontSize: 11, fontWeight: '700' as const, marginBottom: 4 },
  storeReviewReplyText: { fontSize: 12, lineHeight: 18, textAlign: 'left' },
  storeReviewDate: { fontSize: 11, textAlign: 'left' },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsSectionWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  productsSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sectionTitleWrap: {
    width: '100%',
    marginBottom: 14,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
  },
});
