import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Heart,
  ShoppingBag,
  CalendarHeart,
  X,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import ProductCard from '@/components/ProductCard';
import { allStores } from '@/mocks/stores';
import { Occasion, ReminderType, OccasionType } from '@/types';
import { GuestLoginCard } from '@/components/GuestLoginPrompt';
import { useRouter, useLocalSearchParams } from 'expo-router';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import SuccessToast from '@/components/SuccessToast';
import CalendarPicker from '@/components/CalendarPicker';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48 - 12) / 2;

type MainTab = 'favorites' | 'orders' | 'occasions';
type FavSubTab = 'products' | 'stores';
type OrderSubTab = 'new' | 'previous';

export default function MyListScreen() {
  const { colors, t, language, isRTL, favoriteProducts, toggleFavorite, favoriteStoreIds, toggleFavoriteStore, occasions, addOccasion, removeOccasion, isGuest, customerOrders, storesById, refreshCustomerOrders } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [mainTab, setMainTab] = useState<MainTab>('favorites');
  const [favSubTab, setFavSubTab] = useState<FavSubTab>('products');
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTab>('new');
  const [showAddOccasion, setShowAddOccasion] = useState<boolean>(false);
  const [occasionName, setOccasionName] = useState<string>('');
  const [occasionDate, setOccasionDate] = useState<string>('');
  const [occasionType, setOccasionType] = useState<OccasionType>('birthday');
  const [occasionReminder, setOccasionReminder] = useState<ReminderType>('2days');
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'confirm', message: '' });
  const dismissAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);

  useEffect(() => {
    if (params.tab === 'occasions') {
      setMainTab('occasions');
    } else if (params.tab === 'orders') {
      setMainTab('orders');
    }
  }, [params.tab]);

  useEffect(() => {
    if (mainTab === 'orders') {
      refreshCustomerOrders();
    }
  }, [mainTab]);
  const [showFavToast, setShowFavToast] = useState(false);
  const [favToastMessage, setFavToastMessage] = useState('');

  const newOrders = useMemo(() => customerOrders.filter(o => o.status === 'pending' || o.status === 'confirmed'), [customerOrders]);
  const previousOrders = useMemo(() => customerOrders.filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled' || o.status === 'notReceived'), [customerOrders]);

  const handleToggleFavorite = useCallback((id: string) => {
    const isFav = favoriteProducts.some(p => p.id === id);
    toggleFavorite(id);
    setFavToastMessage(isFav ? (language === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites') : (language === 'ar' ? 'تمت الإضافة للمفضلة' : 'Added to favorites'));
    setShowFavToast(true);
  }, [toggleFavorite, favoriteProducts, language]);

  const favoriteStores = useMemo(() => {
    return favoriteStoreIds
      .map((id) => (storesById[id] as { id: string; name: string; username: string; city: string; logo: string } | undefined) ?? allStores.find((s) => s.id === id))
      .filter(Boolean) as Array<{ id: string; name: string; username: string; city: string; logo: string }>;
  }, [favoriteStoreIds, storesById]);

  const occasionTypes: { key: OccasionType; label: string }[] = [
    { key: 'anniversary', label: t('occasionAnniversary') },
    { key: 'birthday', label: t('occasionBirthday') },
    { key: 'ramadan', label: t('occasionRamadan') },
    { key: 'eid', label: t('occasionEid') },
    { key: 'love', label: t('occasionLove') },
    { key: 'other', label: t('occasionOther') },
  ];

  const getOccasionTypeLabel = useCallback((type: OccasionType) => {
    return occasionTypes.find(o => o.key === type)?.label || type;
  }, [language]);

  const handleSaveOccasion = useCallback(() => {
    if (!occasionName.trim()) return;
    const newOccasion: Occasion = {
      id: Date.now().toString(),
      name: occasionName.trim(),
      type: occasionType,
      date: occasionDate || new Date().toISOString().split('T')[0],
      reminder: occasionReminder,
    };
    addOccasion(newOccasion);
    setOccasionName('');
    setOccasionDate('');
    setOccasionType('birthday');
    setOccasionReminder('2days');
    setShowAddOccasion(false);
  }, [occasionName, occasionType, occasionDate, occasionReminder, addOccasion]);

  const handleAddToGoogleCalendar = useCallback((occ: Occasion) => {
    const eventDate = occ.date || new Date().toISOString().split('T')[0];
    const startDate = eventDate.replace(/-/g, '');
    const endDate = startDate;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(occ.name)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(occ.name)}`;
    Linking.openURL(url);
  }, []);


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
    switch (status) {
      case 'pending': return t('statusPending');
      case 'confirmed': return t('statusConfirmed');
      case 'delivered': return t('statusDelivered');
      case 'completed': return language === 'ar' ? 'مكتمل' : 'Completed';
      case 'cancelled': return t('statusCancelled');
      case 'notReceived': return language === 'ar' ? 'لم يستلم' : 'Not Received';
      default: return status;
    }
  };

  const shortenOrderId = (oid: string) => {
    if (!oid) return '';
    const cleanId = oid.replace(/[^a-zA-Z0-9]/g, '');
    return cleanId.slice(-5).toUpperCase();
  };


  const mainTabs: { key: MainTab; label: string; icon: typeof Heart }[] = [
    { key: 'favorites', label: t('favorites'), icon: Heart },
    { key: 'orders', label: t('myOrders'), icon: ShoppingBag },
    { key: 'occasions', label: t('occasions'), icon: CalendarHeart },
  ];

  const renderMainTabs = () => (
    <View style={[styles.mainTabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {mainTabs.map((tab) => {
        const isActive = mainTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setMainTab(tab.key)}
            style={[styles.mainTab, isActive && { backgroundColor: colors.primary }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <tab.icon size={16} color={isActive ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.mainTabText, { color: isActive ? '#FFF' : colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSubTabs = (tabs: { key: string; label: string }[], active: string, onPress: (k: string) => void) => (
    <View style={[styles.subTabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onPress(tab.key)}
            style={[styles.subTab, { backgroundColor: isActive ? colors.primary : colors.borderLight }]}
          >
            <Text style={[styles.subTabText, { color: isActive ? '#FFF' : colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderEmpty = (Icon: typeof Heart, title: string, desc: string) => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.borderLight }]}>
        <Icon size={40} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc}</Text>
    </View>
  );

  const renderFavorites = () => (
    <>
      {renderSubTabs(
        [{ key: 'products', label: t('favoriteProducts') }, { key: 'stores', label: t('favoriteStores') }],
        favSubTab,
        (k) => setFavSubTab(k as FavSubTab)
      )}
      {favSubTab === 'products' ? (
        favoriteProducts.length === 0 ? renderEmpty(Heart, t('noFavorites'), t('noFavoritesDesc')) : (
          <View style={styles.productGrid}>
            {favoriteProducts.map((product) => (
              <View key={product.id} style={{ width: PRODUCT_WIDTH }}>
                <ProductCard product={product} onToggleFavorite={handleToggleFavorite} />
              </View>
            ))}
          </View>
        )
      ) : (
        favoriteStores.length === 0 ? renderEmpty(Heart, t('noFavorites'), t('noFavoritesDesc')) : (
          <View style={styles.storeGrid}>
            {favoriteStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                onPress={() => router.push(`/store/${store.id}` as any)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: store.logo }} style={styles.storeCardLogo} contentFit="cover" />
                <Text style={[styles.storeCardName, { color: colors.text }]} numberOfLines={1}>{store.name}</Text>
                <Text style={[styles.storeCardUsername, { color: colors.textSecondary }]}>{store.username}</Text>
                <View style={[styles.storeCardBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.storeCardCity, { color: colors.textMuted }]}>{store.city}</Text>
                  <TouchableOpacity
                    style={[styles.storeCardFavBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavoriteStore(store.id);
                    }}
                  >
                    <Heart size={14} color={colors.primary} fill={colors.primary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )
      )}
    </>
  );

  const renderOrders = () => (
    <>
      {renderSubTabs(
        [{ key: 'new', label: t('newOrders') }, { key: 'previous', label: t('previousOrders') }],
        orderSubTab,
        (k) => setOrderSubTab(k as OrderSubTab)
      )}
      {(orderSubTab === 'new' ? newOrders : previousOrders).length === 0 ? (
        renderEmpty(ShoppingBag, t('myOrders'), t('noOrdersDesc'))
      ) : (
        (orderSubTab === 'new' ? newOrders : previousOrders).map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push(`/order-detail/${order.id}` as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.orderCardBg, { backgroundColor: getStatusColor(order.status) }]}>
              <View style={styles.orderCardOverlay} />
              <View style={[styles.orderCardContent, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                {order.productImage ? (
                  <View style={styles.orderCardImageWrap}>
                    <Image source={{ uri: order.productImage }} style={styles.orderCardImage} contentFit="cover" />
                  </View>
                ) : (
                  <View style={styles.orderCardImageWrap}>
                    <View style={[styles.orderCardImage, { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }]}>
                      <ShoppingBag size={24} color="#FFF" />
                    </View>
                  </View>
                )}
                <View style={[styles.orderCardInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.orderCardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.orderCardNumber}>{shortenOrderId(order.orderNumber)}</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Text style={[styles.orderStatus, { color: '#FFF' }]}>
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.orderCardProduct, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{order.productName}</Text>
                  <View style={[styles.orderCardBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.orderCardPrice}>{order.total} {t('sar')}</Text>
                    <Text style={styles.orderCardDate}>{order.date}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </>
  );


  const renderOccasions = () => (
    <>
      <TouchableOpacity
        style={[styles.addOccasionBtn, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddOccasion(true)}
      >
        <Text style={styles.addOccasionText}>+ {t('addOccasion')}</Text>
      </TouchableOpacity>
      {occasions.length === 0 ? (
        renderEmpty(CalendarHeart, t('noOccasions'), t('noOccasionsDesc'))
      ) : (
        occasions.map((occ) => (
          <View key={occ.id} style={styles.giftCard}>
            <View style={[styles.giftCardBg, { backgroundColor: colors.primary }]}>
              <View style={[styles.giftCardDecor1, isRTL ? { left: -30, right: undefined } : { right: -30, left: undefined }]} />
              <View style={[styles.giftCardDecor2, isRTL ? { right: -20, left: undefined } : { left: -20, right: undefined }]} />
              <View style={styles.giftCardContent}>
                <View style={[styles.giftCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={() => handleAddToGoogleCalendar(occ)}
                    style={styles.giftCardActionBtn}
                  >
                    <Calendar size={14} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setAlertConfig({
                      visible: true,
                      type: 'confirm',
                      title: t('confirmDelete'),
                      message: t('deleteMsg'),
                      buttons: [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: t('delete'),
                          style: 'destructive',
                          onPress: () => removeOccasion(occ.id),
                        },
                      ],
                    });
                  }} style={styles.giftCardActionBtn}>
                    <Trash2 size={14} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>
                <View style={styles.giftCardCenter}>
                  {occ.type && (
                    <Text style={styles.giftCardType}>{getOccasionTypeLabel(occ.type)}</Text>
                  )}
                  <Text style={styles.giftCardName}>{occ.name}</Text>
                </View>
                <View style={[styles.giftCardBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.giftCardMetaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Clock size={12} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.giftCardMetaText}>
                      {occ.reminder === '10hours' ? t('before10Hours') : occ.reminder === '2days' ? t('before2Days') : t('before1Week')}
                    </Text>
                  </View>
                  <View style={[styles.giftCardMetaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Calendar size={12} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.giftCardMetaText}>{occ.date}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </>
  );

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <View style={styles.guestHeader}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('myList')}</Text>
          </View>
        </SafeAreaView>
        <GuestLoginCard />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderMainTabs()}
        {mainTab === 'favorites' && renderFavorites()}
        {mainTab === 'orders' && renderOrders()}
        {mainTab === 'occasions' && renderOccasions()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showAddOccasion} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('addOccasion')}</Text>
              <TouchableOpacity onPress={() => setShowAddOccasion(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('occasionName')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={t('enterOccasionName')}
              placeholderTextColor={colors.textMuted}
              value={occasionName}
              onChangeText={setOccasionName}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('occasionType')}</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, { backgroundColor: colors.inputBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setShowTypePicker(true)}
            >
              <Text style={[styles.dateText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {getOccasionTypeLabel(occasionType)}
              </Text>
              <CalendarHeart size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('occasionDate')}</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, { backgroundColor: colors.inputBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setShowCalendarPicker(true)}
            >
              <Text style={[styles.dateText, { color: occasionDate ? colors.text : colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                {occasionDate || t('selectDate')}
              </Text>
              <Calendar size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('reminderTime')}</Text>
            <View style={[styles.reminderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {(['1week', '2days', '10hours'] as ReminderType[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setOccasionReminder(r)}
                  style={[
                    styles.reminderBtn,
                    { backgroundColor: occasionReminder === r ? colors.primary : colors.inputBg },
                  ]}
                >
                  <Text style={[styles.reminderText, { color: occasionReminder === r ? '#FFF' : colors.textSecondary }]}>
                    {r === '10hours' ? t('before10Hours') : r === '2days' ? t('before2Days') : t('before1Week')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveOccasion}>
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>

            <CalendarPicker
              visible={showCalendarPicker}
              onClose={() => setShowCalendarPicker(false)}
              onSelect={(date) => setOccasionDate(date)}
              selectedDate={occasionDate}
            />

            {showTypePicker && (
              <View style={styles.pickerOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowTypePicker(false)} />
                <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
                  <View style={styles.pickerHeader}>
                    <Text style={[styles.pickerTitle, { color: colors.primary }]}>{t('chooseOccasion')}</Text>
                    <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                      <Text style={[styles.pickerDoneText, { color: colors.primary }]}>{t('done')}</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                    {occasionTypes.map((ot) => (
                      <TouchableOpacity
                        key={ot.key}
                        onPress={() => {
                          setOccasionType(ot.key);
                          setShowTypePicker(false);
                        }}
                        style={[
                          styles.pickerItem,
                          occasionType === ot.key && { backgroundColor: colors.borderLight },
                        ]}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          { color: occasionType === ot.key ? colors.text : colors.textMuted },
                          occasionType === ot.key && { fontWeight: '700' },
                        ]}>
                          {ot.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <GlassAlert {...alertConfig} onDismiss={dismissAlert} />
      <SuccessToast
        visible={showFavToast}
        message={favToastMessage}
        onDismiss={() => setShowFavToast(false)}
        autoDismissMs={1500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guestHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' as const },
  mainTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    width: '100%',
  },
  mainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    backgroundColor: 'transparent',
  },
  mainTabText: { fontSize: 13, fontWeight: '600' as const },
  subTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  subTabText: { fontSize: 13, fontWeight: '600' as const },
  scrollContent: { paddingTop: 8 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  storeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  storeCard: {
    width: (width - 52) / 2,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  storeCardLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
  },
  storeCardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 2,
  },
  storeCardUsername: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  storeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  storeCardCity: {
    fontSize: 12,
  },
  storeCardFavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const },
  emptyDesc: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  orderCardBg: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  orderCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 18,
  },
  orderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  orderCardImageWrap: {},
  orderCardImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  orderCardInfo: {
    flex: 1,
    gap: 6,
  },
  orderCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatus: { fontSize: 11, fontWeight: '600' },
  orderCardProduct: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCardDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  orderCardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  addOccasionBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addOccasionText: { color: '#FFF', fontSize: 15, fontWeight: '700' as const },
  giftCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
    elevation: 6,
  },
  giftCardBg: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  giftCardDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  giftCardDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  giftCardContent: {
    padding: 18,
    gap: 12,
  },
  giftCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  giftCardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftCardCenter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  giftCardType: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  giftCardName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  giftCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  giftCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  giftCardMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  pickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: 350,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pickerList: {
    paddingHorizontal: 16,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const },
  fieldLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8, marginTop: 16 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { flex: 1, fontSize: 14 },
  reminderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  reminderText: { fontSize: 12, fontWeight: '600' as const },
  saveBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
});
