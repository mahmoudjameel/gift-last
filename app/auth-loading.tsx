import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { isFirebaseConfigured } from '@/services/firebase';
import { getMerchantStatus, getCurrentMerchantId } from '@/services/merchantFirestore';
import { Image } from 'expo-image';
const kadoLogo = require('@/assets/images/kado-logo.jpeg');

export default function AuthLoadingScreen() {
  const router = useRouter();
  const { role, user } = useApp();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(flipAnim, {
          toValue: 2,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const createDotAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createDotAnimation(dotAnim1, 0).start();
    createDotAnimation(dotAnim2, 150).start();
    createDotAnimation(dotAnim3, 300).start();

    const timeout = setTimeout(async () => {
      if (role === 'merchant') {
        try {
          if (isFirebaseConfigured()) {
            const mid = await getCurrentMerchantId(user?.id);
            if (mid) {
              await getMerchantStatus(mid);
            }
          }
        } catch {}
        router.replace('/(merchant-tabs)/dashboard' as any);
      } else {
        router.replace('/(customer-tabs)/home' as any);
      }
    }, 2800);

    return () => clearTimeout(timeout);
  }, []);

  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const dot1Translate = dotAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const dot2Translate = dotAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const dot3Translate = dotAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF6F9" />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { rotateY: flipInterpolate },
              ],
            },
          ]}
        >
          <View style={styles.logoBg}>
            <Image source={kadoLogo} style={{ width: 90, height: 90, borderRadius: 16 }} contentFit="contain" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
          <Text style={styles.brandName}>KADO</Text>
          <Text style={styles.subtitle}>جارٍ تسجيل الدخول</Text>

          <View style={styles.dotsRow}>
            <Animated.View
              style={[styles.dot, { transform: [{ translateY: dot1Translate }] }]}
            />
            <Animated.View
              style={[styles.dot, { transform: [{ translateY: dot2Translate }] }]}
            />
            <Animated.View
              style={[styles.dot, { transform: [{ translateY: dot3Translate }] }]}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FCE4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#D91568',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#555555',
    opacity: 0.8,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D91568',
  },
});
