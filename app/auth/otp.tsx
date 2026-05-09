import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

const OTP_LENGTH = 4;
const normalizeArabicDigits = (str: string) =>
  str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type: string;
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    identifier?: string;
  }>();

  const { isRTL, isFirebaseConfigured, checkOtp, requestOtp } = useApp();

  const [otp, setOtp] = useState<string>('');
  const [timer, setTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const hiddenInputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => hiddenInputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const shakeBoxes = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleOtpChange = (value: string) => {
    const normalized = normalizeArabicDigits(value).replace(/\D/g, '');
    const limited = normalized.slice(0, OTP_LENGTH);
    setOtp(limited);
    if (limited.length === OTP_LENGTH) {
      runVerify(limited);
    }
  };

  const runVerify = async (code: string) => {
    if (code.length !== 4) {
      shakeBoxes();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setAlertConfig({ visible: true, type: 'error', title: 'خطأ', message: 'الرجاء إدخال رمز التحقق كاملاً' });
      return;
    }

    setIsVerifying(true);

    const phoneNum = params.phone ?? '';

    if (!isFirebaseConfigured()) {
      setIsVerifying(false);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'غير متاح',
        message: 'التحقق برمز OTP مرتبط بـ Firebase. يرجى التأكد من الإعدادات.',
      });
      return;
    }

    const result = await checkOtp({
      phone: phoneNum,
      otp: code,
      name: params.type === 'register' ? params.name : undefined,
      email: params.type === 'register' ? params.email : undefined,
      password: params.type === 'register' ? params.password : undefined,
    });

    setIsVerifying(false);

    if (result.success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace('/auth-loading' as any);
      return;
    }

    const errorMessage =
      result.error || result.message || 'رمز التحقق غير صحيح. تأكد من الرمز الذي استلمته على جوالك أو اضغط "إعادة إرسال الرمز".';
    setAlertConfig({
      visible: true,
      type: 'error',
      title: 'رمز التحقق خاطئ',
      message: errorMessage,
    });
  };

  const handleVerify = () => {
    runVerify(otp);
  };

  const handleResend = async () => {
    if (!canResend) return;
    const phoneNum = params.phone ?? '';
    if (isFirebaseConfigured() && phoneNum) {
      const result = await requestOtp({
        phone: phoneNum,
        isRegistration: params.type === 'register',
      });
      if (!result.success) {
        setAlertConfig({ visible: true, type: 'error', title: 'خطأ', message: result.error || result.message || 'فشل إعادة الإرسال' });
        return;
      }
    }
    setTimer(60);
    setCanResend(false);
    setOtp('');
    hiddenInputRef.current?.focus();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAlertConfig({ visible: true, type: 'success', title: 'تم', message: 'تم إرسال رمز التحقق مرة أخرى' });
  };

  const displayPhone = params.phone ?? '—';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark, '#6B0F1A']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <SafeAreaView edges={['top']}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="otp-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.navTitle}>التحقق من الرقم</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={[Colors.primaryLight, '#FFF0F3']}
            style={styles.iconBg}
          >
            <ShieldCheck size={40} color={Colors.primary} />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.title}>رمز التحقق OTP</Text>
        <Text style={styles.subtitle}>
          تم إرسال رمز التحقق المكون من 4 أرقام إلى{'\n'}
          <Text style={styles.phoneHighlight}>{displayPhone}</Text>
        </Text>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => hiddenInputRef.current?.focus()}
          style={styles.otpTouchable}
        >
          <Animated.View
            style={[
              styles.otpRow,
              isRTL && styles.otpRowRTL,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {[0, 1, 2, 3].map((index) => {
              const digit = otp[index] ?? '';
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                >
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              );
            })}
          </Animated.View>
        </TouchableOpacity>

        <TextInput
          ref={hiddenInputRef}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          testID="otp-hidden-input"
        />

        <TouchableOpacity
          style={[styles.verifyBtn, (isVerifying || otp.length < OTP_LENGTH) && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={isVerifying || otp.length < OTP_LENGTH}
          testID="otp-verify-btn"
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.verifyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.verifyText}>
              {isVerifying ? 'جارٍ التحقق...' : 'تأكيد'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} testID="otp-resend-btn">
              <Text style={styles.resendActive}>إعادة إرسال الرمز</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendText}>
              إعادة الإرسال بعد{' '}
              <Text style={styles.timerText}>{timer}</Text> ثانية
            </Text>
          )}
        </View>
      </Animated.View>
      <GlassAlert {...alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingBottom: 24,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -10,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  contentCard: {
    flex: 1,
    backgroundColor: Colors.card,
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    marginTop: 16,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneHighlight: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  otpTouchable: {
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 14,
  },
  otpRowRTL: {
    flexDirection: 'row-reverse',
  },
  otpBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  verifyBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  resendRow: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timerText: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  resendActive: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
