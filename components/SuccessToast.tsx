import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CircleCheck, ShoppingBag, Heart, X } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

interface SuccessToastProps {
  visible: boolean;
  message: string;
  buttonText?: string;
  onButtonPress?: () => void;
  onDismiss: () => void;
  icon?: 'check' | 'cart' | 'heart';
  autoDismissMs?: number;
}

export default function SuccessToast({
  visible,
  message,
  buttonText,
  onButtonPress,
  onDismiss,
  icon = 'check',
  autoDismissMs = 2500,
}: SuccessToastProps) {
  const { colors } = useApp();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-120);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismissToast();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.card,
            borderColor: colors.success,
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
            elevation: 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={dismissToast}>
          <X size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={[styles.iconWrap, { backgroundColor: icon === 'heart' ? colors.primaryLight : colors.successLight }]}>
          {icon === 'cart' ? (
            <ShoppingBag size={20} color={colors.success} />
          ) : icon === 'heart' ? (
            <Heart size={20} color={colors.primary} fill={colors.primary} />
          ) : (
            <CircleCheck size={20} color={colors.success} />
          )}
        </View>

        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>

        {buttonText && onButtonPress && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              onButtonPress();
              dismissToast();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>{buttonText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    maxWidth: 420,
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
});
