import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { isFirebaseConfigured } from '@/services/firebase';
import { getMerchantStatus, getCurrentMerchantId } from '@/services/merchantFirestore';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, role, isLoading, enterGuestMode, hasSeenOnboarding, user, t } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const btnAnim1 = useRef(new Animated.Value(0)).current;
  const btnAnim2 = useRef(new Animated.Value(0)).current;
  const btnAnim3 = useRef(new Animated.Value(0)).current;
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasSeenOnboarding && !redirecting) {
      setRedirecting(true);
      router.replace('/onboarding' as any);
      return;
    }
    if (!isLoading && isAuthenticated && role && !redirecting) {
      setRedirecting(true);
      try {
        if (role === 'customer') {
          router.replace('/(customer-tabs)/home' as any);
        } else {
          (async () => {
            try {
              if (isFirebaseConfigured()) {
                const mid = await getCurrentMerchantId(user?.id);
                if (mid) {
                  const status = await getMerchantStatus(mid);
                  if (status && status !== 'active') {
                    router.replace('/merchant-pending' as any);
                    return;
                  }
                }
              }
              router.replace('/(merchant-tabs)/dashboard' as any);
            } catch {
              router.replace('/(merchant-tabs)/dashboard' as any);
            }
          })();
        }
      } catch (e) {
        void e;
        setRedirecting(false);
      }
    }
  }, [isLoading, isAuthenticated, role, redirecting, hasSeenOnboarding, user]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.stagger(100, [
        Animated.spring(btnAnim1, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(btnAnim2, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(btnAnim3, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  if (isLoading || redirecting) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark, '#6B0F1A']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingDecor1} />
        <View style={styles.loadingDecor2} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
        </View>
      </View>
    );
  }

  const handleGuestMode = async () => {
    await enterGuestMode();
    router.replace('/(customer-tabs)/home' as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark, '#6B0F1A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Animated.View
            style={[
              styles.welcomeHeader,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.welcomeTitle}>{t('welcomeScreenTitle')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('welcomeScreenSubtitle')}</Text>
          </Animated.View>

          <View style={styles.buttonsContainer}>
          <Animated.View
            style={{
              opacity: btnAnim1,
              transform: [{ translateY: btnAnim1.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            }}
          >
            <TouchableOpacity
              onPress={() => router.push('/auth/login' as any)}
              activeOpacity={0.9}
              style={styles.secondaryBtn}
              testID="welcome-login-btn"
            >
              <Text style={styles.secondaryBtnText}>{t('welcomeLoginBtn')}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              opacity: btnAnim2,
              transform: [{ translateY: btnAnim2.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            }}
          >
            <TouchableOpacity
              onPress={() => router.push('/auth/register' as any)}
              activeOpacity={0.9}
              style={styles.primaryBtn}
              testID="welcome-register-btn"
            >
              <View style={styles.primaryBtnInner}>
                <Text style={styles.primaryBtnText}>{t('welcomeCreateAccountBtn')}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              opacity: btnAnim3,
              transform: [{ translateY: btnAnim3.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            }}
          >
            <TouchableOpacity
              onPress={handleGuestMode}
              activeOpacity={0.9}
              style={styles.guestBtn}
              testID="welcome-guest-btn"
            >
              <Text style={styles.guestBtnText}>{t('welcomeGuestBtn')}</Text>
            </TouchableOpacity>
          </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDecor1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  loadingDecor2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    bottom: '20%',
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorCircle3: {
    position: 'absolute',
    top: '40%',
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  buttonsContainer: { gap: 12 },
  primaryBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.2)',
    elevation: 8,
  },
  primaryBtnInner: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 18,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  secondaryBtn: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  guestBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.65)',
    textDecorationLine: 'underline' as const,
  },
});
