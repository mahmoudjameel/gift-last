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
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import { useApp } from '@/contexts/AppContext';

export default function ForgotOTPScreen() {
  const router = useRouter();
  const { isRTL } = useApp();
  const params = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [timer, setTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const inputRefs = useRef<(TextInput | null)[]>([null, null, null, null]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.split('').slice(0, 4);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 4) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 3);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  // TODO: [PRODUCTION] Replace mock OTP verification with real SMS API integration
  // - Integrate Twilio, Vonage, or similar SMS gateway for sending OTP codes
  // - Verify OTP code against server-side generated code (not client-side)
  // - Implement rate limiting for OTP requests
  // - Add OTP expiration (e.g., 5 minutes)
  // - Handle SMS delivery failures gracefully
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 4) {
      shakeBoxes();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setAlertConfig({ visible: true, type: 'error', title: 'خطأ', message: 'الرجاء إدخال رمز التحقق كاملاً' });
      return;
    }

    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsVerifying(false);
    router.push({
      pathname: '/auth/reset-password' as any,
      params: { phone: params.phone },
    });
  };

  // TODO: [PRODUCTION] Implement real OTP resend via SMS API (Twilio/Vonage)
  const handleResend = () => {
    if (!canResend) return;
    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '']);
    inputRefs.current[0]?.focus();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAlertConfig({ visible: true, type: 'success', title: 'تم', message: 'تم إرسال رمز التحقق مرة أخرى' });
  };

  const maskedPhone = params.phone
    ? params.phone.replace(/(\d{2})(\d+)(\d{2})/, '$1****$3')
    : '******';

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="forgot-otp-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.navTitle}>رمز التحقق</Text>
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
          <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
        </Text>

        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {otp.map((digit, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
              ]}
            >
              <TextInput
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={styles.otpInput}
                value={digit}
                onChangeText={(val) => handleOtpChange(val, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={Platform.OS === 'web' ? 4 : 1}
                selectTextOnFocus
                testID={`forgot-otp-input-${index}`}
              />
            </View>
          ))}
        </Animated.View>

        <TouchableOpacity
          style={[styles.verifyBtn, isVerifying && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={isVerifying}
          testID="forgot-otp-verify-btn"
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
            <TouchableOpacity onPress={handleResend} testID="forgot-otp-resend-btn">
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
  otpRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 32,
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
  otpInput: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    width: '100%',
    height: '100%',
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
