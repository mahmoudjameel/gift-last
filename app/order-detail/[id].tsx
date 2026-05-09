import React, { useMemo, useCallback, useEffect } from 'react';
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
  MapPin,
  Clock,
  Truck,
  Store,
  Package,
  ExternalLink,
  ChevronLeft,
  Navigation,
  User,
  Phone,
  Calendar,
  CreditCard,
  Receipt,
  ArrowRight,
  ArrowLeft,
  CircleAlert,
  CheckCircle,
  Loader,
  XCircle,
  Gift,
  MessageSquareText,
  Mail,
  Hash,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import { 
  formatAddressAsAreaOnly, 
  reverseGeocodeToAreaLabel, 
  looksLikeRawCoordinatesLabel 
} from '@/utils/location';

const { width } = Dimensions.get('window');

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { placedOrders, colors, language, t, isRTL, refreshCustomerOrders } = useApp();

  useEffect(() => {
    refreshCustomerOrders();
  }, []);

  const order = useMemo(() => {
    return placedOrders.find(o => o.id === id);
  }, [placedOrders, id]);

  const [displayAddress, setDisplayAddress] = React.useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = React.useState(false);

  useEffect(() => {
    async function resolve() {
      if (!order) return;
      
      const rawAddr = order.address || '';
      // If it looks like a hash or raw coords and we have coords, try to geocode
      if ((rawAddr.length > 15 || looksLikeRawCoordinatesLabel(rawAddr)) && order.addressCoords) {
        setIsResolvingAddress(true);
        try {
          const area = await reverseGeocodeToAreaLabel(order.addressCoords, language);
          setDisplayAddress(area || rawAddr);
        } catch {
          setDisplayAddress(formatAddressAsAreaOnly(rawAddr, 40));
        } finally {
          setIsResolvingAddress(false);
        }
      } else {
        setDisplayAddress(formatAddressAsAreaOnly(rawAddr, 40));
      }
    }
    resolve();
  }, [order, language]);

  const shortenOrderId = (oid: string) => {
    if (!oid) return '';
    // Use the last 5 characters for a consistent, organized 5-digit/char display
    const cleanId = oid.replace(/[^a-zA-Z0-9]/g, '');
    return cleanId.slice(-5).toUpperCase();
  };

  const sar = '₪';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#22C55E';
      case 'cancelled': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'notReceived': return '#F97316';
      default: return '#9CA3AF';
    }
  };

  const getStatusText = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'pending': return 'قيد الانتظار';
        case 'confirmed': return 'تم التأكيد';
        case 'delivered': return 'تم التسليم';
        case 'completed': return 'مكتمل';
        case 'cancelled': return 'ملغي';
        case 'notReceived': return 'لم يستلم';
        default: return status;
      }
    }
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'notReceived': return 'Not Received';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    const color = '#FFF';
    const size = 32;
    switch (status) {
      case 'pending': return <CircleAlert size={size} color={color} />;
      case 'confirmed': return <CheckCircle size={size} color={color} />;
      case 'delivered': return <CheckCircle size={size} color={color} />;
      case 'cancelled': return <XCircle size={size} color={color} />;
      default: return <Loader size={size} color={color} />;
    }
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
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>
              {language === 'ar' ? 'رجوع' : 'חזור'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const isBranch = order.deliveryMethod === 'branch';
  const isGift = order.recipientName && order.recipientName !== order.customerName;
  const locationCoords = order.addressCoords;
  const googleMapsUrl = locationCoords
    ? `https://maps.google.com/?q=${locationCoords.latitude},${locationCoords.longitude}`
    : (order.branchLocation?.startsWith('http') ? order.branchLocation : null);

  const paymentLabel = (() => {
    switch (order.paymentMethod) {
      case 'apple_pay': return 'Apple Pay';
      case 'stc_pay': return 'STC Pay';
      case 'mada': return language === 'ar' ? 'مدى' : 'Mada';
      case 'credit_card': return language === 'ar' ? 'ماستركارد / فيزا' : 'Mastercard / Visa';
      case 'tabby': return 'Tabby';
      case 'cash': return language === 'ar' ? 'نقداً عند الاستلام' : 'מזומן בקבלה';
      case 'bank_transfer': return language === 'ar' ? 'تحويل بنكي' : 'העברה בנקאית';
      default: return order.paymentMethod || '';
    }
  })();

  const statusSteps = ['pending', 'confirmed', 'delivered'];
  const currentStepIndex = order.status === 'completed' ? statusSteps.length - 1 : statusSteps.indexOf(order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'notReceived';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: statusColor }}>
        <View style={[styles.header, { backgroundColor: statusColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'ar' ? 'تفاصيل الطلب' : 'פרטי הזמנה'}
          </Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <View style={styles.statusIconWrap}>
            {getStatusIcon(order.status)}
          </View>
          <Text style={styles.statusMainText}>
            {getStatusText(order.status)}
          </Text>
          <View style={styles.orderNumBadge}>
            <Text style={styles.orderNumText}>{shortenOrderId(order.orderNumber)}</Text>
          </View>

          {!isCancelled && (
            <View style={styles.stepsContainer}>
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isLast = index === statusSteps.length - 1;
                return (
                  <View key={step} style={styles.stepItem}>
                    <View style={[
                      styles.stepDot,
                      { backgroundColor: isActive ? '#FFF' : 'rgba(255,255,255,0.3)' }
                    ]}>
                      {isActive && <View style={styles.stepDotInner} />}
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      { color: isActive ? '#FFF' : 'rgba(255,255,255,0.5)' }
                    ]}>
                      {getStatusText(step)}
                    </Text>
                    {!isLast && (
                      <View style={[
                        styles.stepLine,
                        { backgroundColor: index < currentStepIndex ? '#FFF' : 'rgba(255,255,255,0.3)' }
                      ]} />
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {order.storeName && (
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
              {order.storeId && <ChevronLeft size={16} color={colors.textSecondary} style={{ marginRight: 'auto' }} />}
            </View>
            <Text style={[styles.storeName, { color: colors.text }]}>{order.storeName}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Gift size={18} color={isGift ? '#EC4899' : colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'نوع الطلب' : 'סוג הזמנה'}
            </Text>
          </View>
          <View style={[styles.orderTypeBadge, { backgroundColor: isGift ? '#EC489920' : colors.primary + '20' }]}>
            <Text style={[styles.orderTypeText, { color: isGift ? '#EC4899' : colors.primary }]}>
              {isGift ? (language === 'ar' ? 'هدية' : 'מתנה') : (language === 'ar' ? 'شخصي' : 'אישי')}
            </Text>
          </View>
        </View>

        {isBranch ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Navigation size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'استلام من الفرع' : 'איסוף מסניף'}
              </Text>
            </View>

            {order.branchName && (
              <Text style={[styles.branchName, { color: colors.text }]}>{order.branchName}</Text>
            )}
            {order.address && (
              <Text style={[styles.branchAddress, { color: colors.textSecondary }]}>{order.address}</Text>
            )}

            {locationCoords && Platform.OS === 'web' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => googleMapsUrl && Linking.openURL(googleMapsUrl)}
                style={styles.mapContainer}
              >
                <GoogleMapWeb
                  latitude={locationCoords.latitude}
                  longitude={locationCoords.longitude}
                  zoom={15}
                  style={styles.map}
                />
              </TouchableOpacity>
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
                {language === 'ar' ? 'توصيل' : 'משלוח'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => googleMapsUrl && Linking.openURL(googleMapsUrl)}
              activeOpacity={0.7}
              disabled={!googleMapsUrl}
            >
              {order.address && (
                <View style={styles.deliveryRow}>
                  <MapPin size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                  <Text style={[
                    styles.deliveryText,
                    { color: googleMapsUrl ? colors.primary : colors.text },
                    googleMapsUrl && { textDecorationLine: 'underline' }
                  ]}>
                    {isResolvingAddress ? '...' : displayAddress || order.address}
                  </Text>
                </View>
              )}
              {order.city && (
                <View style={styles.deliveryRow}>
                  <Navigation size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                  <Text style={[
                    styles.deliveryText,
                    { color: googleMapsUrl ? colors.primary : colors.text },
                    googleMapsUrl && { textDecorationLine: 'underline' }
                  ]}>
                    {order.city}
                  </Text>
                </View>
              )}
              {order.region && order.region.length > 0 && (
                <View style={styles.deliveryRow}>
                  <MapPin size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                  <Text style={[
                    styles.deliveryText,
                    { color: googleMapsUrl ? colors.primary : colors.text },
                    googleMapsUrl && { textDecorationLine: 'underline' }
                  ]}>
                    {order.region}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {order.addressCoords && Platform.OS === 'web' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => googleMapsUrl && Linking.openURL(googleMapsUrl)}
                style={styles.mapContainer}
              >
                <GoogleMapWeb
                  latitude={order.addressCoords.latitude}
                  longitude={order.addressCoords.longitude}
                  zoom={15}
                  style={styles.map}
                />
              </TouchableOpacity>
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
        )}

        {(order.recipientName || order.recipientPhone) && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <User size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'بيانات المستلم' : 'פרטי מקבל'}
              </Text>
            </View>

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
          </View>
        )}

        {(order.deliveryDate || order.deliveryTimeSlot) && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Calendar size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'موعد التوصيل' : 'לוח זמני משלוח'}
              </Text>
            </View>

            {order.deliveryDate && (
              <View style={styles.deliveryRow}>
                <Calendar size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.deliveryDate}</Text>
              </View>
            )}

            {order.city && (
              <View style={styles.deliveryRow}>
                <Navigation size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.city}</Text>
              </View>
            )}

            {order.deliveryOptionName && (
              <View style={styles.deliveryRow}>
                <Truck size={15} color={colors.textSecondary} />
                <Text style={[styles.deliveryText, { color: colors.text }]}>{order.deliveryOptionName}</Text>
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
                {item.id && (
                  <View style={styles.productIdRow}>
                    <Text style={[styles.productIdText, { color: colors.textSecondary }]}>#{item.id}</Text>
                    <Hash size={12} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.productQty, { color: colors.textSecondary }]}>
                  x{item.quantity}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={[styles.productPrice, { color: colors.primary }]}>
                  {item.price * item.quantity} {sar}
                </Text>
                {item.originalPrice != null && item.originalPrice > item.price && (
                  <Text style={[styles.productOriginalPrice, { color: colors.textMuted }]}>
                    {item.originalPrice * item.quantity} {sar}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Receipt size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تفاصيل الفاتورة' : 'פרטי חשבונית'}
            </Text>
          </View>

          <InfoRow label={language === 'ar' ? 'التاريخ' : 'Date'} value={order.date} colors={colors} />
          <InfoRow 
            label={language === 'ar' ? 'رقم الطلب' : 'Order Number'} 
            value={shortenOrderId(order.orderNumber)} 
            colors={colors} 
            valueStyle={{ fontSize: 13, fontWeight: '700' }}
          />

          <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
            <View style={[styles.paymentStatusBadge, { backgroundColor: order.isPaid ? '#22C55E20' : '#EF444420' }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: order.isPaid ? '#22C55E' : '#EF4444' }}>
                {order.isPaid
                  ? (language === 'ar' ? 'مدفوع' : 'Paid')
                  : (language === 'ar' ? 'غير مدفوع' : 'Unpaid')}
              </Text>
            </View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'حالة الدفع' : 'Payment Status'}
            </Text>
          </View>

          <View style={[styles.totalRow, { borderTopColor: colors.borderLight }]}>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{order.total} {sar}</Text>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              {language === 'ar' ? 'المجموع' : 'Total'}
            </Text>
          </View>
        </View>

        {order.paymentMethod && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <CreditCard size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </Text>
            </View>
            <View style={styles.deliveryRow}>
              <CreditCard size={15} color={colors.textSecondary} />
              <Text style={[styles.deliveryText, { color: colors.text }]}>{paymentLabel}</Text>
            </View>
          </View>
        )}

        {order.giftCard && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Gift size={18} color="#EC4899" />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'بطاقة الإهداء' : 'Gift Card'}
              </Text>
            </View>
            <InfoRow label={language === 'ar' ? 'من' : 'From'} value={order.giftCard.fromName || '-'} colors={colors} />
            <InfoRow label={language === 'ar' ? 'إلى' : 'To'} value={order.giftCard.toName || '-'} colors={colors} />
            <InfoRow label={language === 'ar' ? 'الرسالة' : 'Message'} value={order.giftCard.message || '-'} colors={colors} />
            <InfoRow label={language === 'ar' ? 'إخفاء الهوية' : 'Hide Identity'} value={order.giftCard.hideIdentity ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No')} colors={colors} />
            {order.giftCard.specialNotes ? <InfoRow label={language === 'ar' ? 'ملاحظات خاصة' : 'Special Notes'} value={order.giftCard.specialNotes} colors={colors} isLast /> : null}
          </View>
        )}

        {order.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'ملاحظات' : 'Notes'}
              </Text>
            </View>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{order.notes}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.contactBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/chat/c1' as any)}
          activeOpacity={0.8}
        >
          <MessageSquareText size={18} color="#FFF" />
          <Text style={styles.contactBtnText}>
            {language === 'ar' ? 'تواصل مع المتجر' : 'Contact Store'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, colors, isLast, valueStyle }: { label: string; value: string; colors: any; isLast?: boolean; valueStyle?: any }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: isLast ? 'transparent' : colors.borderLight }]}>
      <Text style={[styles.infoValue, { color: colors.text }, valueStyle]}>{value}</Text>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
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
  statusBanner: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusMainText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 10,
  },
  orderNumBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  orderNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 9,
    left: -20,
    right: '50%',
    height: 2,
    zIndex: -1,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
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
  productOriginalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  giftText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  giftMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 22,
  },
  orderTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  productIdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  contactBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
