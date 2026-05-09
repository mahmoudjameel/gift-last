import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { CircleCheck, TriangleAlert, Info, CircleX, X } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

export type GlassAlertType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

export interface GlassAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface GlassAlertConfig {
  visible: boolean;
  type: GlassAlertType;
  title?: string;
  message: string;
  buttons?: GlassAlertButton[];
  onDismiss?: () => void;
}

interface GlassAlertProps extends GlassAlertConfig {}

export default function GlassAlert({ visible, type, title, message, buttons, onDismiss }: GlassAlertProps) {
  const { colors } = useApp();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      if (!buttons || buttons.length === 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const getIcon = () => {
    const size = 32;
    switch (type) {
      case 'success':
        return <CircleCheck size={size} color={colors.success} />;
      case 'error':
        return <CircleX size={size} color={colors.error} />;
      case 'warning':
        return <TriangleAlert size={size} color={colors.warning} />;
      case 'info':
        return <Info size={size} color={colors.info} />;
      case 'confirm':
        return <TriangleAlert size={size} color={colors.warning} />;
      default:
        return <Info size={size} color={colors.info} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'success': return colors.successLight;
      case 'error': return colors.errorLight;
      case 'warning': return colors.warningLight;
      case 'info': return colors.infoLight;
      case 'confirm': return colors.warningLight;
      default: return colors.infoLight;
    }
  };

  const hasButtons = buttons && buttons.length > 0;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={!hasButtons ? handleDismiss : undefined}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              {
                backgroundColor: colors.glass,
                borderColor: colors.glassBorder,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {!hasButtons && (
              <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <View style={[styles.iconWrap, { backgroundColor: getIconBg() }]}>
              {getIcon()}
            </View>

            {title ? (
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            ) : null}

            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

            {hasButtons && (
              <View style={styles.buttonsRow}>
                {buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        {
                          backgroundColor: isDestructive
                            ? colors.error
                            : isCancel
                              ? colors.borderLight
                              : colors.primary,
                        },
                      ]}
                      onPress={() => {
                        btn.onPress?.();
                        handleDismiss();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color: isCancel ? colors.text : '#FFF',
                          },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 32,
  },
  alertContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.25)',
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
