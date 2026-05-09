import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowRight, ArrowLeft, Star, MessageSquareText, ThumbsUp, X, SendHorizontal, Inbox } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { getMerchantReviews, replyToReview, getCurrentMerchantId, type FirestoreReview } from '@/services/merchantFirestore';
import { isFirebaseConfigured } from '@/services/firebase';

type FilterType = 'all' | '5' | '4' | '3' | '2' | '1';

export default function ReviewsScreen() {
  const { colors, t, isRTL, user, language } = useApp();
  const router = useRouter();
  const [reviews, setReviews] = useState<FirestoreReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isFirebaseConfigured()) { setIsLoading(false); return; }
      try {
        const mid = await getCurrentMerchantId(user?.id);
        if (mid) {
          const data = await getMerchantReviews(mid);
          setReviews(data);
        }
      } catch (e) {
        console.warn('[reviews] error loading:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0;

  const ratingDistribution = useMemo(() => {
    if (totalReviews === 0) return [0, 0, 0, 0, 0];
    return [5, 4, 3, 2, 1].map(star =>
      Math.round((reviews.filter(r => r.rating === star).length / totalReviews) * 100)
    );
  }, [reviews, totalReviews]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: '5', label: t('filter5Stars') },
    { key: '4', label: t('filter4Stars') },
    { key: '3', label: t('filter3Stars') },
    { key: '2', label: t('filter2Stars') },
    { key: '1', label: t('filter1Star') },
  ];

  const filteredReviews = useMemo(() => {
    if (activeFilter === 'all') return reviews;
    return reviews.filter(r => r.rating === parseInt(activeFilter));
  }, [activeFilter, reviews]);

  const openReply = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setReplyText('');
    setShowReplyModal(true);
  };

  const handleSendReply = useCallback(async () => {
    if (!selectedReviewId || !replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await replyToReview(selectedReviewId, replyText.trim());
      setReviews(prev => prev.map(r =>
        r.id === selectedReviewId ? { ...r, reply: replyText.trim() } : r
      ));
      setShowReplyModal(false);
      setReplyText('');
    } catch (e) {
      console.warn('[reviews] reply error:', e);
    } finally {
      setIsSendingReply(false);
    }
  }, [selectedReviewId, replyText]);

  const renderStars = (rating: number, size: number = 14) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color="#F59E0B" fill={i <= rating ? '#F59E0B' : 'transparent'} />
      ))}
    </View>
  );

  const getRatingBarColor = (index: number) => {
    if (index === 0) return '#10B981';
    if (index === 1) return '#34D399';
    if (index === 2) return '#F59E0B';
    if (index === 3) return '#FB923C';
    return '#EF4444';
  };

  const isAr = language === 'ar';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('ratingsReviews')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : totalReviews === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.borderLight }]}>
            <Inbox size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isAr ? 'لا توجد تقييمات بعد' : 'No reviews yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {isAr ? 'ستظهر التقييمات هنا عندما يقيّم العملاء متجرك' : 'Reviews will appear here when customers rate your store'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.summaryCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryScore}>
                <Text style={[styles.avgRating, { color: colors.text }]}>{avgRating}</Text>
                {renderStars(Math.round(avgRating), 18)}
                <Text style={[styles.totalReviews, { color: colors.textSecondary }]}>
                  {totalReviews} {t('basedOnReviews')}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.borderLight }]} />

            <View style={styles.distributionContainer}>
              {[5, 4, 3, 2, 1].map((star, index) => (
                <View key={star} style={styles.distRow}>
                  <Text style={[styles.distPercent, { color: colors.textSecondary }]}>{ratingDistribution[index]}%</Text>
                  <View style={[styles.distBarBg, { backgroundColor: colors.borderLight }]}>
                    <View style={[styles.distBarFill, { width: `${ratingDistribution[index]}%`, backgroundColor: getRatingBarColor(index) }]} />
                  </View>
                  <View style={styles.distStarLabel}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.distStarText, { color: colors.textMuted }]}>{star}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  activeFilter === f.key
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 },
                ]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.filterChipText, { color: activeFilter === f.key ? '#FFF' : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('customerReviews')} ({filteredReviews.length})
          </Text>

          {filteredReviews.map((review) => (
            <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
              <View style={styles.reviewTop}>
                <View style={styles.reviewMeta}>
                  {renderStars(review.rating, 13)}
                  <Text style={[styles.reviewDate, { color: colors.textMuted }]}>{review.date}</Text>
                </View>
                <View style={styles.reviewUser}>
                  {review.customerAvatar ? (
                    <Image source={{ uri: review.customerAvatar }} style={styles.reviewAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.reviewAvatar, { backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 18, color: colors.textMuted }}>{review.customerName?.charAt(0) || '?'}</Text>
                    </View>
                  )}
                  <View style={styles.reviewUserInfo}>
                    <Text style={[styles.reviewName, { color: colors.text }]}>{review.customerName}</Text>
                    {review.productName ? (
                      <View style={[styles.productTag, { backgroundColor: colors.borderLight }]}>
                        <Text style={[styles.productTagText, { color: colors.textMuted }]}>{review.productName}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>

              {review.reply && (
                <View style={[styles.replyBox, { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary }]}>
                  <Text style={[styles.replyLabel, { color: colors.primary }]}>
                    {isAr ? 'رد المتجر' : 'Store reply'}
                  </Text>
                  <Text style={[styles.replyText, { color: colors.textSecondary }]}>{review.reply}</Text>
                </View>
              )}

              <View style={[styles.reviewActions, { borderTopColor: colors.borderLight }]}>
                {!review.reply && (
                  <TouchableOpacity style={styles.reviewActionBtn} onPress={() => openReply(review.id)}>
                    <MessageSquareText size={14} color={colors.primary} />
                    <Text style={[styles.reviewActionText, { color: colors.primary }]}>{t('reply')}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.helpfulRow}>
                  <ThumbsUp size={13} color={colors.textMuted} />
                  <Text style={[styles.helpfulText, { color: colors.textMuted }]}>{review.helpful}</Text>
                </View>
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={showReplyModal} transparent animationType="fade">
        <TouchableOpacity style={styles.replyOverlay} activeOpacity={1} onPress={() => setShowReplyModal(false)}>
          <View style={[styles.replyModal, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.replyModalHeader}>
              <View style={{ width: 20 }} />
              <Text style={[styles.replyModalTitle, { color: colors.text }]}>{t('replyToReview')}</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.replyInput, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={t('replyPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TouchableOpacity
              style={[styles.sendReplyBtn, { backgroundColor: replyText.trim() && !isSendingReply ? colors.primary : colors.borderLight }]}
              disabled={!replyText.trim() || isSendingReply}
              onPress={handleSendReply}
            >
              {isSendingReply ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <SendHorizontal size={16} color={replyText.trim() ? '#FFF' : colors.textMuted} />
              )}
              <Text style={[styles.sendReplyText, { color: replyText.trim() && !isSendingReply ? '#FFF' : colors.textMuted }]}>
                {isSendingReply ? (isAr ? 'جاري الإرسال...' : 'Sending...') : t('sendReply')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  scrollContent: { paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryTop: { alignItems: 'center' },
  summaryScore: { alignItems: 'center' },
  avgRating: { fontSize: 48, fontWeight: '800' as const, lineHeight: 52 },
  starsRow: { flexDirection: 'row', gap: 3, marginVertical: 6 },
  totalReviews: { fontSize: 12, marginTop: 2 },
  summaryDivider: { height: 1, marginVertical: 16 },
  distributionContainer: { gap: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'nowrap' },
  distStarLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 30, flexShrink: 0 },
  distStarText: { fontSize: 12, fontWeight: '600' as const },
  distBarBg: { flex: 1, height: 8, borderRadius: 4 },
  distBarFill: { height: 8, borderRadius: 4 },
  distPercent: { fontSize: 11, width: 32, textAlign: 'left' },
  filtersRow: { gap: 8, paddingBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontWeight: '600' as const },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 14 },
  reviewCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  reviewTop: { marginBottom: 10 },
  reviewUser: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 44, height: 44, borderRadius: 22 },
  reviewUserInfo: { flex: 1, marginHorizontal: 12 },
  reviewName: { fontSize: 15, fontWeight: '600' as const },
  productTag: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  productTagText: { fontSize: 11 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reviewDate: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 22 },
  replyBox: { marginTop: 12, padding: 12, borderRadius: 12, borderLeftWidth: 3 },
  replyLabel: { fontSize: 12, fontWeight: '700' as const, marginBottom: 4 },
  replyText: { fontSize: 12, lineHeight: 18 },
  reviewActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  reviewActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewActionText: { fontSize: 13, fontWeight: '500' as const },
  helpfulRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpfulText: { fontSize: 12 },
  replyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  replyModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  replyModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  replyModalTitle: { fontSize: 17, fontWeight: '700' as const },
  replyInput: { borderRadius: 14, padding: 14, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 14 },
  sendReplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  sendReplyText: { fontSize: 15, fontWeight: '700' as const },
});
