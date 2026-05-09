import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import PetaliaLogo from '@/components/PetaliaLogo';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CircleUserRound,
  BellRing,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  ArrowRightLeft,
  Eye,
  ScrollText,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { GuestLoginCard } from '@/components/GuestLoginPrompt';

export default function ProfileScreen() {
  const { switchRole, logout, user, colors, t, language, isRTL, isGuest, unreadCustomerNotifCount } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchTitle, setSwitchTitle] = useState('');
  const switchAnim = useRef(new Animated.Value(0)).current;
  const logoFlipAnim = useRef(new Animated.Value(0)).current;

  const startSwitchAnimation = useCallback((title: string) => {
    setSwitchTitle(title);
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

  const handleSwitchToMerchant = useCallback(async () => {
    if (user?.hasStore) {
      startSwitchAnimation(t('switchingToPartner'));
      setTimeout(async () => {
        await switchRole();
        setShowSwitchModal(false);
        router.replace('/(merchant-tabs)/dashboard' as any);
      }, 1500);
    } else {
      startSwitchAnimation(t('switchingToBePartner'));
      setTimeout(() => {
        setShowSwitchModal(false);
        router.push('/merchant-register' as any);
      }, 1500);
    }
  }, [switchRole, router, user, startSwitchAnimation, t]);

  const handleLogout = useCallback(async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/');
  }, [logout, router]);

  const logoFlip = logoFlipAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }} />
        <GuestLoginCard />
      </View>
    );
  }

  const menuItems = [
    { key: 'policies', label: t('policiesTerms'), icon: ScrollText, iconColor: '#6366F1', route: '/(customer-tabs)/profile/policies' },
    { key: 'display', label: t('display'), icon: Eye, iconColor: '#3B82F6', route: '/(customer-tabs)/profile/display-settings' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.topBar}>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>{t('profile')}</Text>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.card }]}
            onPress={() => router.push('/(customer-tabs)/profile/notifications' as any)}
          >
            <BellRing size={20} color={colors.text} />
            {unreadCustomerNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCustomerNotifCount > 9 ? '9+' : unreadCustomerNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 20 },
        ]}
      >
        <TouchableOpacity
          style={styles.idCard}
          activeOpacity={0.92}
          onPress={() => router.push('/(customer-tabs)/profile/account-settings' as any)}
        >
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.idCardGradient}
          >
            <View style={styles.idCardContent}>
              <View style={styles.idCardRight}>
                {user?.avatar ? (
                  <ExpoImage source={{ uri: user.avatar }} style={styles.idAvatar} contentFit="cover" />
                ) : (
                  <View style={styles.idAvatarPlaceholder}>
                    <CircleUserRound size={36} color="#FFF" />
                  </View>
                )}
                <View style={styles.idTextBlock}>
                  <Text style={styles.idName}>{user?.name ?? (language === 'ar' ? 'مستخدم' : 'משתמש')}</Text>
                  <Text style={styles.idEmail}>{user?.email ?? ''}</Text>
                </View>
              </View>
            </View>
            <View style={styles.idCardDecor} pointerEvents="none">
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('profileSectionSettings')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 ? <View style={[styles.menuDivider, { backgroundColor: colors.borderLight }]} /> : null}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.65}
              >
                <item.icon size={20} color={item.iconColor} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.partnerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          onPress={handleSwitchToMerchant}
          activeOpacity={0.65}
        >
          <View style={[styles.partnerIcon, { backgroundColor: colors.primary }]}>
            <Store size={18} color="#FFF" />
          </View>
          <Text style={[styles.partnerLabel, { color: colors.primary }]} numberOfLines={2}>
            {user?.hasStore ? t('switchToMerchant') : t('joinAsPartner')}
          </Text>
          <ArrowRightLeft size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.borderLight, backgroundColor: colors.glass }]}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.65}
        >
          <LogOut size={18} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.logoutModal, { backgroundColor: colors.card }]}>
            <View style={[styles.logoutIconWrap, { backgroundColor: colors.errorLight }]}>
              <LogOut size={28} color={colors.error} />
            </View>
            <Text style={[styles.logoutTitle, { color: colors.text }]}>{t('logoutConfirmTitle')}</Text>
            <Text style={[styles.logoutDesc, { color: colors.textSecondary }]}>{t('logoutConfirm')}</Text>
            <View style={styles.logoutBtns}>
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
        <View style={styles.overlay}>
          <Animated.View style={[styles.switchContent, { opacity: switchAnim }]}>
            <Animated.View style={{ transform: [{ rotateY: logoFlip }] }}>
              <PetaliaLogo size={90} color="#D91568" />
            </Animated.View>
            <Text style={styles.switchText}>{switchTitle}</Text>
          </Animated.View>
        </View>
      </Modal>
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
  topBarTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
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
    backgroundColor: '#D91568',
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
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginStart: 52,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  idCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
  },
  idCardGradient: {
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  idCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  idCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  idAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  idAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  idTextBlock: {
    flex: 1,
    gap: 4,
  },
  idName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  idEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  idCardDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -30,
    left: -20,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    right: 30,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  partnerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  overlay: {
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
  logoutTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  logoutDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  logoutBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutModalBtnText: { fontSize: 15, fontWeight: '700' },
  switchContent: {
    alignItems: 'center',
    gap: 20,
  },
  switchLogo: {
    width: 100,
    height: 100,
  },
  switchText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
