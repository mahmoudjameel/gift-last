import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CircleCheck,
  MapPin,
  Clock,
  Truck,
  Store,
  Package,
  ExternalLink,
  ChevronLeft,
  Home,
  Navigation,
  User,
  Phone,
  Calendar,
  CreditCard,
  Receipt,
  Star,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { hasReviewedOrderProduct } from '@/services/productReviews';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import { JanaAssistant } from '@/components/JanaCharacter';

const { width } = Dimensions.get('window');

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const { placedOrders, colors, language, t } = useApp();

  const order = useMemo(() => {
    return placedOrders.find(o => o.id === params.orderId);
  }, [placedOrders, params.orderId]);

  const uniqueOrderItems = useMemo(() => {
    if (!order?.items?.length) return [];
    const m = new Map<string, (typeof order.items)[0]>();
    for (const it of order.items) {
      const id = it.id != null ? String(it.id) : '';
      if (id && !m.has(id)) m.set(id, it);
    }
    return Array.from(m.values());
  }, [order?.items]);

  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!order?.customerId || uniqueOrderItems.length === 0) {
      setReviewedProductIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const next = new Set<string>();
      for (const it of uniqueOrderItems) {
        const pid = it.id != null ? String(it.id) : '';
        if (!pid) continue;
        try {
          const done = await hasReviewedOrderProduct(order.customerId!, order.id, pid);
          if (done) next.add(pid);
        } catch {
          void 0;
        }
      }
      if (!cancelled) setReviewedProductIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.customerId, uniqueOrderItems]);

  const sar = '₪';
  const isRTL = language === 'ar';

  const isBranch = order?.deliveryMethod === 'branch';

  const janaMessage = useMemo(() => {
    if (isBranch) {
      return language === 'ar'
        ? 'المتجر بيجهز طلبك! تابع حالة الطلب في صفحة الطلبات وتقدر تتواصل مع المتجر من زر تواصل مع المتجر 📋'
        : 'החנות מכינה את ההזמנה שלך! עקוב/י אחרי הסטטוס בדף ההזמנות ותוכל/י ליצור קשר עם החנות 📋';
    }
    return language === 'ar'
      ? 'المتجر استلم طلبك! تابع حالة طلبك في صفحة الطلبات وتواصل مع المتجر لأي استفسار 📦'
      : 'החנות קיבלה את ההזמנה שלך! עקוב/י אחרי הסטטוס בדף ההזמנות ולכל שאלה אפשר לפנות לחנות 📦';
  }, [isBranch, language]);

  const shortenOrderId = (oid: string) => {
    if (!oid) return '';
    const cleanId = oid.replace(/[^a-zA-Z0-9]/g, '');
    return cleanId.slice(-5).toUpperCase();
  };

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>
            {language === 'ar' ? 'الطلب غير موجود' : 'ההזמנה לא נמצאה'}
          </Text>
          <TouchableOpacity
            style={[styles.homeBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(customer-tabs)/home' as any)}
          >
            <Text style={styles.homeBtnText}>
              {language === 'ar' ? 'العودة للرئيسية' : 'חזרה לדף הבית'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const branchCoords = order.addressCoords;
  const googleMapsUrl = branchCoords
    ? `https://maps.google.com/?q=${branchCoords.latitude},${branchCoords.longitude}`
    : (order.branchLocation?.startsWith('http') ? order.branchLocation : null);

  const paymentLabel = (() => {
    switch (order.paymentMethod) {
      case 'apple_pay': return 'Apple Pay';
      case 'stc_pay': return 'STC Pay';
      case 'mada': return language === 'ar' ? 'مدى' : 'מאדה';
      case 'credit_card': return language === 'ar' ? 'ماستركارد / فيزا' : 'מאסטרקארד / ויזה';
      case 'tabby': return 'Tabby';
      case 'cash': return language === 'ar' ? 'نقداً' : 'מזומן';
      default: return order.paymentMethod || '';
    }
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.primary }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.replace('/(customer-tabs)/home' as any)}>
            <Home size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'ar' ? 'تأكيد الطلب' : 'אישור הזמנה'}
          </Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.successBanner, { backgroundColor: colors.primary }]}>
          <View style={styles.successIconWrap}>
            <CircleCheck size={48} color="#FFF" />
          </View>
          <Text style={styles.thankYouText}>
            {language === 'ar' ? 'شكراً لك!' : 'תודה רבה!'}
          </Text>
          <Text style={styles.successSubtext}>
            {language === 'ar' ? 'تم تأكيد طلبك بنجاح' : 'ההזמנה שלך אושרה בהצלחה'}
          </Text>
          <View style={styles.orderNumBadge}>
            <Text style={styles.orderNumText}>{shortenOrderId(order.orderNumber)}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Receipt size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تفاصيل الفاتورة' : 'פרטי חשבונית'}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>{order.date}</Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'التاريخ' : 'תאריך'}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>{shortenOrderId(order.orderNumber)}</Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'رقم الطلب' : 'מספר הזמנה'}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CreditCard size={14} color={colors.primary} />
              <Text style={[styles.invoiceValue, { color: colors.text }]}>{paymentLabel}</Text>
            </View>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'طريقة الدفع' : 'אמצעי תשלום'}
            </Text>
          </View>

          <View style={[styles.invoiceRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>
              {order.isPaid
                ? (language === 'ar' ? 'مدفوع' : 'שולם')
                : (language === 'ar' ? 'غير مدفوع' : 'לא שולם')}
            </Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'حالة الدفع' : 'סטטוס תשלום'}
            </Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{order.total} {sar}</Text>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              {language === 'ar' ? 'المجموع' : 'סה״כ'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          activeOpacity={0.7}
          onPress={() => order.storeId && router.push(`/store/${order.storeId}` as any)}
        >
          <View style={styles.cardHeader}>
            <Store size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'المتجر' : 'חנות'}
            </Text>
            <ChevronLeft size={16} color={colors.textSecondary} style={{ marginRight: 'auto' }} />
          </View>
          <Text style={[styles.storeName, { color: colors.text }]}>{order.storeName}</Text>
        </TouchableOpacity>

        {isBranch ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Navigation size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'استلام من الفرع' : 'איסוף מהסניף'}
              </Text>
            </View>

            {order.branchName && (
              <Text style={[styles.branchName, { color: colors.text }]}>{order.branchName}</Text>
            )}
            {order.address && (
              <Text style={[styles.branchAddress, { color: colors.textSecondary }]}>{order.address}</Text>
            )}

            {branchCoords && Platform.OS === 'web' && (
              <View style={styles.mapContainer}>
                <GoogleMapWeb
                  latitude={branchCoords.latitude}
                  longitude={branchCoords.longitude}
                  zoom={15}
                  style={styles.map}
                />
              </View>
            )}

            {googleMapsUrl && (
              <TouchableOpacity
                style={[styles.mapLinkBtn, { backgroundColor: colors.primary + '12' }]}
                onPress={() => Linking.openURL(googleMapsUrl)}
                activeOpacity={0.7}
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text style={[styles.mapLinkText, { color: colors.primary }]}>
                  {language === 'ar' ? 'فتح في خرائط قوقل' : 'פתח ב-Google Maps'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Truck size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'تفاصيل التوصيل' : 'פרטי משלוח'}
              </Text>
            </View>

            {order.address && (
              <View style={styles.deliveryRow}>
                <MapPin size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.address}</Text>
              </View>
            )}

            {order.recipientName && (
              <View style={styles.deliveryRow}>
                <User size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.recipientName}</Text>
              </View>
            )}

            {order.recipientPhone && (
              <View style={styles.deliveryRow}>
                <Phone size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.recipientPhone}</Text>
              </View>
            )}

            {order.deliveryDate && (
              <View style={styles.deliveryRow}>
                <Calendar size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.deliveryDate}</Text>
              </View>
            )}

            {order.deliveryTimeSlot && (
              <View style={styles.deliveryRow}>
                <Clock size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.deliveryTimeSlot}</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Package size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'المنتجات' : 'מוצרים'} ({order.items.length})
            </Text>
          </View>

          {order.items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.productRow,
                index < order.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                const productId = item.id;
                if (productId) router.push(`/product/${productId}` as any);
              }}
            >
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.productImage} contentFit="cover" />
              )}
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.productQty, { color: colors.textSecondary }]}>
                  x{item.quantity}
                </Text>
              </View>
              <Text style={[styles.productPrice, { color: colors.primary }]}>
                {item.price * item.quantity} {sar}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {order.customerId && uniqueOrderItems.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'قيّم منتجاتك' : 'דרג את הרכישה שלך'}
              </Text>
            </View>
            <Text style={[styles.rateHint, { color: colors.textSecondary }]}>
              {language === 'ar'
                ? 'تقييمك يظهر في صفحة المنتج وفي تقييمات المتجر لمساعدة العملاء.'
                : 'הביקורת שלך תופיע בדף המוצר ובביקורות החנות.'}
            </Text>
            {uniqueOrderItems.map((it, idx) => {
              const pid = String(it.id);
              const done = reviewedProductIds.has(pid);
              return (
                <View
                  key={pid}
                  style={[
                    styles.rateRow,
                    {
                      borderBottomColor: colors.borderLight,
                      borderBottomWidth: idx < uniqueOrderItems.length - 1 ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}
                >
                  <Text style={[styles.rateProductName, { color: colors.text }]} numberOfLines={2}>
                    {it.name}
                  </Text>
                  {done ? (
                    <Text style={[styles.ratedBadge, { color: colors.success }]}>
                      {language === 'ar' ? 'تم التقييم' : 'דורג'}
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.rateBtn, { backgroundColor: colors.primary }]}
                      onPress={() =>
                        router.push(
                          `/review-product?orderId=${encodeURIComponent(order.id)}&productId=${encodeURIComponent(pid)}` as any
                        )
                      }
                    >
                      <Star size={14} color="#FFF" />
                      <Text style={styles.rateBtnText}>
                        {language === 'ar' ? 'تقييم' : 'דרג'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {order.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'ملاحظات' : 'הערות'}
              </Text>
            </View>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{order.notes}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.homeBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(customer-tabs)/home' as any)}
          activeOpacity={0.85}
        >
          <Home size={18} color="#FFF" />
          <Text style={styles.homeBtnText}>
            {language === 'ar' ? 'العودة للرئيسية' : 'חזרה לדף הבית'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <JanaAssistant
        message={janaMessage}
        mood={isBranch ? 'excited' : 'welcome'}
        visible={true}
        colors={colors}
        position="bottomRight"
      />
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
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  successBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  thankYouText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  successSubtext: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  orderNumBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  orderNumText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  invoiceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  branchName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 13,
    marginBottom: 12,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  mapLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  deliveryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  productQty: {
    fontSize: 12,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  rateHint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  rateProductName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  ratedBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rateBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
