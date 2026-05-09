import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StatusBar,
  Modal,
  Animated,
  Share,
} from 'react-native';
import PetaliaLogo from '@/components/PetaliaLogo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import {
  Store,
  Star,
  Truck,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowRightLeft,
  Share as ShareIcon,
  ShieldCheck,
  Wallet,
  Power,
  BellRing,
  Eye,
  Copy,
  ExternalLink,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import * as Clipboard from 'expo-clipboard';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

export default function MerchantStoreScreen() {
  const { colors, t, user, storeInfo, toggleStoreOpen, switchRole, logout, language, isRTL, unreadMerchantNotifCount } = useApp();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const switchAnim = useRef(new Animated.Value(0)).current;
  const logoFlipAnim = useRef(new Animated.Value(0)).current;
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({
    visible: false,
    type: 'success',
    message: '',
  });

  const showAlert = useCallback((type: GlassAlertConfig['type'], message: string, title?: string) => {
    setAlertConfig({ visible: true, type, message, title });
  }, []);

  const dismissAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const isOpen = storeInfo?.isOpen ?? true;
  const merchantStoreId = String((storeInfo as { id?: string } | null)?.id || user?.id || '').trim();
  const merchantShareSlug = String((storeInfo as { username?: string } | null)?.username || '').trim();
  const merchantShareRef = merchantShareSlug || merchantStoreId;
  const storeLink = merchantShareRef
    ? `https://us-central1-glorda.cloudfunctions.net/s/${encodeURIComponent(merchantShareRef)}`
    : '';
  const storeName = storeInfo?.name || user?.storeName || '';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'ar') {
      if (hour < 12) return 'صباح الخير';
      if (hour < 17) return 'مساء الخير';
      return 'مساء الخير';
    }
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const startSwitchAnimation = useCallback(() => {
    switchAnim.setValue(0);
    logoFlipAnim.setValue(0);
    setShowSwitchModal(true);
    Animated.parallel([
      Animated.timing(switchAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoFlipAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(logoFlipAnim, { toValue: 2, duration: 800, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [switchAnim, logoFlipAnim]);

  const handleSwitchRole = useCallback(async () => {
    startSwitchAnimation();
    setTimeout(async () => {
      await switchRole();
      setShowSwitchModal(false);
      router.replace('/(customer-tabs)/home' as any);
    }, 1500);
  }, [switchRole, router, startSwitchAnimation]);

  const handleLogout = useCallback(async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/');
  }, [logout, router]);

  const handleCopyLink = useCallback(async () => {
    try {
      if (!storeLink) return;
      await Clipboard.setStringAsync(storeLink);
      setShowShareModal(false);
      showAlert('success', language === 'ar' ? 'تم نسخ رابط المتجر' : 'קישור החנות הועתק');
    } catch (e) {
      void e;
    }
  }, [storeLink, showAlert, language]);

  const handleShareLink = useCallback(async () => {
    try {
      if (!storeLink) return;
      setShowShareModal(false);
      const title = storeName || (language === 'ar' ? 'متجر Petalia' : 'חנות Petalia');
      const message = language === 'ar' ? `متجر: ${title}` : `חנות: ${title}`;
      await Share.share({
        title,
        message: `${message}\n${storeLink}`,
      });
    } catch (e) {
      void e;
    }
  }, [storeLink, storeName, language]);

  const logoFlip = logoFlipAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <View style={styles.greetingWrap}>
            <Text style={[styles.greetingText, { color: colors.text }]}>{getGreeting()} 👋</Text>
            <Text style={[styles.storeNameText, { color: colors.primary }]}>{storeName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.card }]}
            onPress={() => router.push('/(merchant-tabs)/store/notifications' as any)}
          >
            <BellRing size={20} color={colors.text} />
            {unreadMerchantNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadMerchantNotifCount > 9 ? '9+' : unreadMerchantNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Pressable
          onPress={() => router.push('/(merchant-tabs)/store/edit-store' as any)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={['#C4658A', '#D4709A', '#E88AAE']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.storeHeader, { pointerEvents: 'box-none' as const }]}
          >
            {storeInfo?.bannerImage && (
              <>
                <ExpoImage source={{ uri: storeInfo.bannerImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
              </>
            )}
            <View style={styles.storeHeaderRow}>
              {storeInfo?.storeImage ? (
                <ExpoImage source={{ uri: storeInfo.storeImage }} style={styles.storeAvatarImage} contentFit="cover" />
              ) : (
                <View style={styles.storeAvatar}>
                  <Store size={24} color="#FFF" />
                </View>
              )}
              <View style={styles.storeHeaderInfo}>
                <Text style={styles.storeBannerName}>{storeName}</Text>
                <View style={styles.partnerBadge}>
                  <ShieldCheck size={12} color="#FFF" />
                  <Text style={styles.partnerText}>Petalia {t('partner')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.storeHeaderActions}>
              <TouchableOpacity
                style={[
                  styles.storeStatusBtn,
                  {
                    backgroundColor: isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    borderColor: isOpen ? '#10B981' : '#EF4444',
                  },
                ]}
                onPress={toggleStoreOpen}
                activeOpacity={0.7}
              >
                <Power size={16} color={isOpen ? '#10B981' : '#EF4444'} />
                <Text style={[styles.storeStatusText, { color: isOpen ? '#10B981' : '#EF4444' }]}>
                  {isOpen ? t('storeOpen') : t('storeClosed')}
                </Text>
                <View style={[styles.storeStatusDot, { backgroundColor: isOpen ? '#10B981' : '#EF4444' }]} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareBtn} onPress={() => setShowShareModal(true)}>
                <ShareIcon size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Pressable>

        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
          {language === 'ar' ? 'إدارة المتجر' : 'ניהול החנות'}
        </Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/(merchant-tabs)/store/reviews' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#F59E0B12' }]}>
              <Star size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('reviews')}</Text>
            {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/(merchant-tabs)/store/delivery-branches' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#3B82F612' }]}>
              <Truck size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('deliveryBranches')}</Text>
            {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: 'transparent' }]}
            onPress={() => router.push('/(merchant-tabs)/store/wallet' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#10B98112' }]}>
              <Wallet size={20} color="#10B981" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('wallet')}</Text>
            {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{t('generalGroup')}</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/(merchant-tabs)/store/policies' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#8B5CF612' }]}>
              <ScrollText size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('policiesTerms')}</Text>
            {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: 'transparent' }]}
            onPress={() => router.push('/(merchant-tabs)/store/display-settings' as any)}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#3B82F612' }]}>
              <Eye size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{t('display')}</Text>
            {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.switchCard, { backgroundColor: colors.card }]}
          onPress={handleSwitchRole}
          activeOpacity={0.7}
        >
          <View style={[styles.switchIconWrap, { backgroundColor: colors.primary }]}>
            <Store size={18} color="#FFF" />
          </View>
          <Text style={[styles.switchLabel, { color: colors.primary }]}>{t('switchToCustomer')}</Text>
          <ArrowRightLeft size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
          <Text style={[styles.logoutText, { color: colors.error }]}>{t('logout')}</Text>
          <LogOut size={18} color={colors.error} style={{ transform: [{ scaleX: -1 }] }} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showShareModal} transparent animationType="fade">
        <TouchableOpacity style={styles.shareOverlay} activeOpacity={1} onPress={() => setShowShareModal(false)}>
          <View style={[styles.shareModal, { backgroundColor: colors.card, borderTopWidth: 0 }]}>
            <Text style={[styles.shareModalTitle, { color: colors.text }]}>{t('shareStoreBtn')}</Text>
            <Text style={[styles.shareLinkText, { color: colors.textSecondary, backgroundColor: colors.background }]} numberOfLines={1}>
              {storeLink}
            </Text>
            <View style={styles.shareActions}>
              <TouchableOpacity style={[styles.shareActionBtn, { backgroundColor: colors.primaryLight }]} onPress={handleCopyLink}>
                <Copy size={20} color={colors.primary} />
                <Text style={[styles.shareActionText, { color: colors.primary }]}>
                  {t('copyLink')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareActionBtn, { backgroundColor: colors.primary }]} onPress={handleShareLink}>
                <ExternalLink size={20} color="#FFF" />
                <Text style={[styles.shareActionText, { color: '#FFF' }]}>
                  {t('shareStoreBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.logoutOverlay}>
          <View style={[styles.logoutModal, { backgroundColor: colors.card }]}>
            <View style={[styles.logoutIconWrap, { backgroundColor: colors.errorLight }]}>
              <LogOut size={28} color={colors.error} />
            </View>
            <Text style={[styles.logoutModalTitle, { color: colors.text }]}>{t('logoutConfirmTitle')}</Text>
            <Text style={[styles.logoutModalDesc, { color: colors.textSecondary }]}>{t('logoutConfirm')}</Text>
            <View style={styles.logoutModalBtns}>
              <TouchableOpacity
                style={[styles.logoutModalBtn, { backgroundColor: colors.borderLight }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.logoutModalBtnText, { color: colors.text }]}>{t('logoutCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalBtn, { backgroundColor: colors.error }]}
                onPress={handleLogout}
              >
                <Text style={[styles.logoutModalBtnText, { color: '#FFF' }]}>{t('logoutConfirmBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSwitchModal} transparent animationType="fade">
        <View style={styles.switchOverlay}>
          <Animated.View style={[styles.switchModalContent, { opacity: switchAnim }]}>
            <Animated.View style={{ transform: [{ rotateY: logoFlip }] }}>
              <PetaliaLogo size={90} color="#E88AAE" />
            </Animated.View>
            <Text style={[styles.switchModalText, { color: '#FFF' }]}>{t('switchingToCustomer')}</Text>
          </Animated.View>
        </View>
      </Modal>

      <GlassAlert
        {...alertConfig}
        onDismiss={dismissAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  greetingWrap: {
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  storeNameText: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E88AAE',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  storeHeader: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden' as const,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  storeHeaderInfo: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  storeBannerName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  storeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  partnerText: { fontSize: 11, fontWeight: '600' as const, color: '#FFF' },
  storeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storeStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  storeStatusText: { fontSize: 14, fontWeight: '700' as const },
  storeStatusDot: { width: 7, height: 7, borderRadius: 4 },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  menuCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    marginHorizontal: 14,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  switchIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '600' as const },
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  shareModalTitle: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center', marginBottom: 16 },
  shareLinkText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareActionText: { fontSize: 14, fontWeight: '600' as const },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoutModal: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  logoutIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8 },
  logoutModalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  logoutModalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutModalBtnText: { fontSize: 15, fontWeight: '700' as const },
  switchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModalContent: {
    alignItems: 'center',
    gap: 20,
  },
  switchLogo: {
    width: 100,
    height: 100,
  },
  switchModalText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
});
