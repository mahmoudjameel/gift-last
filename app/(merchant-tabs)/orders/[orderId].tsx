import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ArrowRight,
  ArrowLeft,
  CircleAlert,
  CheckCircle,
  XCircle,
  Truck,
  Store,
  User,
  Phone,
  Calendar,
  Receipt,
  Gift,
  MapPin,
  Navigation,
  Package,
  Clock,
  CreditCard,
  MessageSquareText,
  ClipboardList,
  ExternalLink,
  Mail,
  ChevronDown,
  Check,
  Hash,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import GoogleMapWeb from '@/components/GoogleMapWeb';
import { buildGoogleMapsUrlForOrder } from '@/utils/location';

const statusOptions = [
  { key: 'pending', labelAr: 'قيد الانتظار', labelEn: 'Pending' },
  { key: 'processing', labelAr: 'جاري التجهيز', labelEn: 'Processing' },
  { key: 'preparing', labelAr: 'قيد التحضير', labelEn: 'Preparing' },
  { key: 'ready', labelAr: 'جاهز للاستلام', labelEn: 'Ready' },
  { key: 'delivered', labelAr: 'تم التسليم', labelEn: 'Delivered' },
  { key: 'completed', labelAr: 'مكتمل', labelEn: 'Completed' },
  { key: 'cancelled', labelAr: 'ملغي', labelEn: 'Cancelled' },
  { key: 'not_received', labelAr: 'عدم استلام الطلب', labelEn: 'Not Received' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return '#22C55E';
    case 'completed': return '#10B981';
    case 'cancelled': return '#EF4444';
    case 'not_received': return '#F97316';
    case 'pending': return '#F59E0B';
    case 'processing': return '#3B82F6';
    case 'preparing': return '#8B5CF6';
    case 'ready': return '#EC4899';
    default: return '#9CA3AF';
  }
};

export default function OrderDetailsScreen() {
  const { colors, t, language, isRTL, merchantOrders, placedOrders, updateOrderStatus, getStatusLabel } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'success', message: '' });
  const dismissAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);

  const order = merchantOrders.find(o => o.id === orderId) || placedOrders.find(o => o.id === orderId);
  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 100 }}>{t('noOrders')}</Text>
      </View>
    );
  }

  const displayStatus = currentOrderStatus ?? order.status;
  const statusColor = getStatusColor(displayStatus);
  const sar = '₪';

  const getStatusText = (status: string) => {
    return getStatusLabel(status as any, language);
  };

  const shortenOrderId = (oid: string) => {
    if (!oid) return '';
    const cleanId = oid.replace(/[^a-zA-Z0-9]/g, '');
    return cleanId.slice(-5).toUpperCase();
  };

  const getStatusIcon = (status: string) => {
    const color = '#FFF';
    const size = 32;
    switch (status) {
      case 'pending': return <CircleAlert size={size} color={color} />;
      case 'confirmed': return <CheckCircle size={size} color={color} />;
      case 'delivered': return <CheckCircle size={size} color={color} />;
      case 'cancelled': return <XCircle size={size} color={color} />;
      default: return <CircleAlert size={size} color={color} />;
    }
  };

  const isGift = order.recipientName && order.recipientName !== order.customerName;
  const isBranch = order.deliveryMethod === 'branch';
  const isCancelled = displayStatus === 'cancelled' || displayStatus === 'not_received';

  const statusSteps = ['pending', 'confirmed', 'delivered'];
  const currentStepIndex = displayStatus === 'completed' ? statusSteps.length - 1 : statusSteps.indexOf(displayStatus);

  const paymentLabel = (() => {
    switch (order.paymentMethod) {
      case 'cash': return language === 'ar' ? 'نقداً عند الاستلام' : 'Cash on Delivery';
      case 'credit_card': return language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card';
      case 'bank_transfer': return language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer';
      default: return order.paymentMethod || '';
    }
  })();

  const googleMapsUrl = buildGoogleMapsUrlForOrder({
    addressCoords: order.addressCoords,
    address: order.address,
    city: order.city,
    region: typeof order.region === 'string' ? order.region : undefined,
    branchName: order.branchName,
    branchLocation: order.branchLocation,
    deliveryMethod: order.deliveryMethod,
  });

  const handleStatusChange = useCallback((statusKey: string) => {
    const opt = statusOptions.find(s => s.key === statusKey);
    const statusLabel = opt ? (language === 'ar' ? opt.labelAr : opt.labelEn) : statusKey;
    setAlertConfig({
      visible: true,
      type: 'confirm',
      title: t('confirmStatusChange'),
      message: t('statusChangeMsg'),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'default',
          onPress: async () => {
            setSelectedStatus(statusKey);
            setCurrentOrderStatus(statusKey);
            await updateOrderStatus(orderId!, statusKey);
            setTimeout(() => {
              setAlertConfig({
                visible: true,
                type: 'success',
                message: language === 'ar' ? `تم تحديث حالة الطلب إلى: ${statusLabel}` : `Order status updated to: ${statusLabel}`,
              });
            }, 300);
          },
        },
      ],
    });
  }, [language, t]);

  const handleContactCustomer = useCallback(() => {
    const chatId = order?.id || 'unknown';
    router.push(`/chat/${chatId}` as any);
  }, [router, order]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: statusColor }}>
        <View style={[styles.header, { backgroundColor: statusColor }]}>
          <TouchableOpacity onPress={() => router.back()}>
            {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}
          </Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}>
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <View style={styles.statusIconWrap}>
            {getStatusIcon(displayStatus)}
          </View>
          <Text style={styles.statusMainText}>
            {getStatusText(displayStatus)}
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

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Gift size={18} color={isGift ? '#EC4899' : colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'نوع الطلب' : 'Order Type'}
            </Text>
          </View>
          <View style={[styles.orderTypeBadge, { backgroundColor: isGift ? '#EC489920' : colors.primary + '20' }]}>
            <Text style={[styles.orderTypeText, { color: isGift ? '#EC4899' : colors.primary }]}>
              {isGift ? (language === 'ar' ? 'هدية' : 'Gift') : (language === 'ar' ? 'شخصي' : 'Personal')}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            activeOpacity={googleMapsUrl ? 0.75 : 1}
            disabled={!googleMapsUrl}
            onPress={() => googleMapsUrl && Linking.openURL(googleMapsUrl)}
          >
            <View style={styles.cardHeader}>
              {isBranch ? <Navigation size={18} color={colors.primary} /> : <Truck size={18} color={colors.primary} />}
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {isBranch
                  ? (language === 'ar' ? 'استلام من الفرع' : 'Branch Pickup')
                  : (language === 'ar' ? 'توصيل' : 'Delivery')
                }
              </Text>
              {googleMapsUrl ? (
                <ExternalLink size={16} color={colors.primary} style={{ marginStart: 'auto' }} />
              ) : null}
            </View>

            {isBranch ? (
              <>
                {order.branchName && (
                  <View style={styles.deliveryRow}>
                    <Store size={15} color={colors.textSecondary} />
                    <Text style={[styles.deliveryText, { color: colors.text }]}>{order.branchName}</Text>
                  </View>
                )}
                {order.branchLocation && (
                  <View style={styles.deliveryRow}>
                    <MapPin size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.deliveryText,
                      { color: googleMapsUrl ? colors.primary : colors.text },
                      googleMapsUrl && { textDecorationLine: 'underline' },
                    ]}>
                      {order.branchLocation}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {order.address && (
                  <View style={styles.deliveryRow}>
                    <MapPin size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.deliveryText,
                      { color: googleMapsUrl ? colors.primary : colors.text },
                      googleMapsUrl && { textDecorationLine: 'underline' },
                    ]}>
                      {order.address}
                    </Text>
                  </View>
                )}
                {order.city && (
                  <View style={styles.deliveryRow}>
                    <Navigation size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.deliveryText,
                      { color: googleMapsUrl ? colors.primary : colors.text },
                      googleMapsUrl && { textDecorationLine: 'underline' },
                    ]}>
                      {order.city}
                    </Text>
                  </View>
                )}
                {order.region && String(order.region).length > 0 && (
                  <View style={styles.deliveryRow}>
                    <MapPin size={15} color={googleMapsUrl ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.deliveryText,
                      { color: googleMapsUrl ? colors.primary : colors.text },
                      googleMapsUrl && { textDecorationLine: 'underline' },
                    ]}>
                      {order.region}
                    </Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          {order.addressCoords && order.addressCoords.latitude && order.addressCoords.longitude && Platform.OS === 'web' && (
            <View style={styles.mapContainer}>
              <GoogleMapWeb
                latitude={order.addressCoords.latitude}
                longitude={order.addressCoords.longitude}
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
                {language === 'ar' ? 'فتح في خرائط قوقل' : 'Open in Google Maps'}
              </Text>
            </TouchableOpacity>
          )}

          {!isBranch && (order.deliveryDate || order.deliveryTimeSlot) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight, marginVertical: 12 }]} />
              <View style={styles.cardHeader}>
                <Calendar size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'موعد التوصيل' : 'Delivery Schedule'}
                </Text>
              </View>
              {order.deliveryDate && (
                <View style={styles.deliveryRow}>
                  <Calendar size={15} color={colors.textSecondary} />
                  <Text style={[styles.deliveryText, { color: colors.text }]}>
                    {order.deliveryDate}
                    {(() => {
                      try {
                        const parts = order.deliveryDate.split('-');
                        if (parts.length === 3) {
                          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                          if (!isNaN(d.getTime())) {
                            const dayName = d.toLocaleDateString('ar-SA', { weekday: 'long' });
                            return ` (${dayName})`;
                          }
                        }
                      } catch (e) { }
                      return '';
                    })()}
                  </Text>
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
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <User size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isGift
                ? (language === 'ar' ? 'بيانات العميل والمستلم' : 'Customer & Recipient Data')
                : (language === 'ar' ? 'بيانات العميل' : 'Customer Data')
              }
            </Text>
          </View>

          {isGift && (
            <Text style={[styles.subSectionLabel, { color: colors.primary }]}>
              {language === 'ar' ? 'العميل (المرسل)' : 'Customer (Sender)'}
            </Text>
          )}
          <View style={styles.deliveryRow}>
            <User size={15} color={colors.textSecondary} />
            <Text style={[styles.deliveryText, { color: colors.text }]}>{order.customerName}</Text>
          </View>
          {order.customerPhone && (
            <View style={styles.deliveryRow}>
              <Phone size={15} color={colors.textSecondary} />
              <Text style={[styles.deliveryText, { color: colors.text }]}>{order.customerPhone}</Text>
            </View>
          )}
          {order.customerEmail && (
            <View style={styles.deliveryRow}>
              <Mail size={15} color={colors.textSecondary} />
              <Text style={[styles.deliveryText, { color: colors.text }]}>{order.customerEmail}</Text>
            </View>
          )}

          {isGift && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <Text style={[styles.subSectionLabel, { color: '#EC4899' }]}>
                {language === 'ar' ? 'المستلم (المُهدى إليه)' : 'Recipient'}
              </Text>
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
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Package size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'المنتجات' : 'Products'} ({order.items.length})
            </Text>
          </View>

          {order.items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.productRow,
                index < order.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
            >
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.productImage} contentFit="cover" />
              )}
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                {item.id && (
                  <View style={styles.productIdRow}>
                    <Text style={[styles.productIdText, { color: colors.textMuted }]}>#{item.id}</Text>
                    <Hash size={12} color={colors.textMuted} />
                  </View>
                )}
                <Text style={[styles.productQty, { color: colors.textSecondary }]}>
                  x{item.quantity}
                </Text>
              </View>
              <Text style={[styles.productPrice, { color: colors.primary }]}>
                {item.price * item.quantity} {sar}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Receipt size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>{order.date}</Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'التاريخ' : 'Date'}
            </Text>
          </View>

          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceValue, { color: colors.text }]}>{shortenOrderId(order.orderNumber)}</Text>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'رقم الطلب' : 'Order Number'}
            </Text>
          </View>

          <View style={[styles.invoiceRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.paymentStatusBadge, { backgroundColor: order.isPaid ? '#22C55E20' : '#EF444420' }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: order.isPaid ? '#22C55E' : '#EF4444' }}>
                {order.isPaid
                  ? (language === 'ar' ? 'مدفوع' : 'Paid')
                  : (language === 'ar' ? 'غير مدفوع' : 'Unpaid')}
              </Text>
            </View>
            <Text style={[styles.invoiceLabel, { color: colors.textSecondary }]}>
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
            <InfoRow label={language === 'ar' ? 'من' : 'From'} value={order.giftCard.fromName} colors={colors} />
            <InfoRow label={language === 'ar' ? 'إلى' : 'To'} value={order.giftCard.toName} colors={colors} />
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

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <ClipboardList size={18} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('updateStatus')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.dropdownTrigger, { borderColor: colors.borderLight, backgroundColor: colors.background }]}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            activeOpacity={0.7}
          >
            <ChevronDown size={18} color={colors.textMuted} />
            <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>
              {(() => { const o = statusOptions.find(o => o.key === (selectedStatus ?? displayStatus)); return o ? (language === 'ar' ? o.labelAr : o.labelEn) : displayStatus; })()}
            </Text>
          </TouchableOpacity>

          {showStatusDropdown && (
            <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              {statusOptions.map((opt, index) => {
                const isSelected = (selectedStatus ?? displayStatus) === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemSelected,
                      index < statusOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                    ]}
                    onPress={() => {
                      setShowStatusDropdown(false);
                      handleStatusChange(opt.key);
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected && <Check size={18} color={colors.primary} />}
                    <Text style={[
                      styles.dropdownItemText,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && { fontWeight: '700' },
                    ]}>{language === 'ar' ? opt.labelAr : opt.labelEn}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.contactBtn, { backgroundColor: colors.primary }]}
          onPress={handleContactCustomer}
        >
          <MessageSquareText size={18} color="#FFF" />
          <Text style={styles.contactBtnText}>{t('contactCustomer')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <GlassAlert {...alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

function InfoRow({ label, value, colors, isLast }: { label: string; value: string; colors: any; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: isLast ? 'transparent' : colors.borderLight }]}>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
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
    fontSize: 16,
    fontWeight: '700',
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
    justifyContent: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  orderTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  orderTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    justifyContent: 'flex-start',
  },
  deliveryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
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
    marginTop: 8,
  },
  mapLinkText: {
    fontSize: 14,
    fontWeight: '600',
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
    alignItems: 'flex-start',
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
    fontSize: 14,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1 },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownTriggerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(196, 30, 58, 0.05)',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  productIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-start',
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
  contactBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
