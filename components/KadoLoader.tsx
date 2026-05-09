import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useApp } from '@/contexts/AppContext';

const kadoLogo = require('@/assets/images/icon.png');

interface KadoLoaderProps {
  /** قطر الشعار بالبكسل. الافتراضي 64. */
  size?: number;
  /** نص اختياري يظهر تحت الشعار. */
  label?: string;
  /** يملأ الـ View الأب ويتمركز فيه. مفيد لشاشات التحميل الكاملة. */
  fullscreen?: boolean;
  /** يظهر داخل بطاقة (خلفية + ظل خفيف) — مناسب للمودلز/الأوفر-لاي. */
  card?: boolean;
  /** ستايل إضافي للحاوية. */
  style?: ViewStyle | ViewStyle[];
}

export default function KadoLoader({ size = 64, label, fullscreen = false, card = false, style }: KadoLoaderProps) {
  const { colors } = useApp();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    rotate.start();
    pulse.start();
    return () => {
      rotate.stop();
      pulse.stop();
    };
  }, [rotateAnim, pulseAnim]);

  const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  const ringSize = size + 16;

  const content = (
    <View style={[styles.center, fullscreen && styles.fullscreen, card && [styles.card, { backgroundColor: colors.card }], style]}>
      <View style={[styles.logoWrap, { width: ringSize, height: ringSize }]}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: colors.primary,
              opacity: ringOpacity,
              transform: [{ scale }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Image
            source={kadoLogo}
            style={{ width: size, height: size, borderRadius: size * 0.22 }}
            contentFit="contain"
          />
        </Animated.View>
      </View>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text> : null}
    </View>
  );

  if (fullscreen) {
    return (
      <View pointerEvents="none" style={[styles.fullscreenWrap, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fullscreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  fullscreenWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  card: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
