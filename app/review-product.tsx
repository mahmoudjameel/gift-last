import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';
import { submitProductReview } from '@/services/productReviews';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

export default function ReviewProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string; productId: string }>();
  const { placedOrders, user, colors, language, isRTL, refreshFirebaseData } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({
    visible: false,
    type: 'success',
    message: '',
  });

  const order = useMemo(
    () => placedOrders.find((o) => o.id === params.orderId),
    [placedOrders, params.orderId]
  );

  const lineItem = useMemo(() => {
    if (!order?.items || !params.productId) return null;
    return order.items.find((i) => String(i.id) === String(params.productId)) ?? null;
  }, [order, params.productId]);

  const merchantId = order?.storeId || order?.merchantId || '';
  const canSubmit = Boolean(
    user?.id &&
      order?.customerId &&
      user.id === order.customerId &&
      merchantId &&
      params.productId &&
      lineItem
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !lineItem || !params.productId || !order) return;
    setSubmitting(true);
    try {
      await submitProductReview({
        merchantId,
        productId: String(params.productId),
        productName: lineItem.name,
        customerId: order.customerId!,
        customerName: user?.name || order.customerName || '—',
        customerAvatar: user?.avatar,
        rating,
        comment,
        orderId: order.id,
      });
      await refreshFirebaseData();
      setAlertConfig({
        visible: true,
        type: 'success',
        title: language === 'ar' ? 'شكراً لك' : 'תודה',
        message:
          language === 'ar'
            ? 'تم إرسال تقييمك بنجاح.'
            : 'Your review has been submitted.',
        buttons: [
          {
            text: language === 'ar' ? 'حسناً' : 'אישור',
            style: 'default',
            onPress: () => router.back(),
          },
        ],
      });
    } catch (e) {
      const msg = e instanceof Error && e.message === 'already_reviewed'
        ? language === 'ar'
          ? 'لقد قيّمت هذا المنتج مسبقاً لهذا الطلب.'
          : 'You already reviewed this product for this order.'
        : language === 'ar'
          ? 'تعذر إرسال التقييم. حاول مرة أخرى.'
          : 'Could not submit your review. Please try again.';
      setAlertConfig({
        visible: true,
        type: 'error',
        message: msg,
        buttons: [{ text: language === 'ar' ? 'حسناً' : 'אישור', style: 'default' }],
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    lineItem,
    params.productId,
    order,
    merchantId,
    user?.name,
    user?.avatar,
    rating,
    comment,
    language,
    router,
    refreshFirebaseData,
  ]);

  if (!order || !lineItem || !params.productId) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: colors.text }}>
          {language === 'ar' ? 'تعذر تحميل بيانات التقييم' : 'לא ניתן לטעון נתוני ביקורת'}
        </Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{language === 'ar' ? 'رجوع' : 'חזור'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!canSubmit) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: colors.text, textAlign: 'center', paddingHorizontal: 24 }}>
          {language === 'ar'
            ? 'سجّل الدخول بنفس الحساب الذي نفّذ الطلب لتتمكن من التقييم.'
            : 'Sign in with the account that placed the order to leave a review.'}
        </Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{language === 'ar' ? 'رجوع' : 'חזור'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'ar' ? 'تقييم المنتج' : 'דרג מוצר'}
        </Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {lineItem.image ? (
            <Image source={{ uri: lineItem.image }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: colors.borderLight }]} />
          )}
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {lineItem.name}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {language === 'ar' ? 'تقييمك' : 'הדירוג שלך'}
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Star size={36} color="#F59E0B" fill={s <= rating ? '#F59E0B' : 'transparent'} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {language === 'ar' ? 'تعليقك (اختياري)' : 'ההערה שלך (אופציונלי)'}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
              color: colors.text,
            },
          ]}
          value={comment}
          onChangeText={setComment}
          placeholder={language === 'ar' ? 'شارك تجربتك مع المنتج...' : 'שתף את החוויה שלך...'}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          textAlign={isRTL ? 'right' : 'left'}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {language === 'ar' ? 'إرسال التقييم' : 'שלח ביקורת'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <GlassAlert
        {...alertConfig}
        onDismiss={() => setAlertConfig((p) => ({ ...p, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700' as const },
  scroll: { padding: 20, paddingBottom: 40 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  productName: { flex: 1, fontSize: 16, fontWeight: '600' as const },
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  input: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    marginBottom: 24,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFF', fontWeight: '600' as const },
});
