import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Smartphone, AtSign } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import { useApp } from '@/contexts/AppContext';

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL, isFirebaseConfigured, requestOtp } = useApp();
  const [phone, setPhone] = useState<string>('');
  const [sendingOtp, setSendingOtp] = useState<boolean>(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const showAlert = (msg: string) => setAlertConfig({ visible: true, type: 'error', title: t('authErrorTitle'), message: msg });
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    animatePress();
    const cleanPhone = phone.trim();
    if (!cleanPhone || !/^(05|5)\d{8}$/.test(cleanPhone)) {
      showAlert(t('authValidSaudiPhone'));
      return;
    }

    if (!isFirebaseConfigured()) {
      showAlert(t('authPhoneLoginUnavailable'));
      return;
    }

    setSendingOtp(true);
    const normalizedPhone = cleanPhone.startsWith('0') ? cleanPhone : `0${cleanPhone}`;
    const result = await requestOtp({
      phone: normalizedPhone,
      isRegistration: false,
    });
    setSendingOtp(false);

    if (result.success) {
      router.push({
        pathname: '/auth/otp' as any,
        params: {
          type: 'login',
          phone: normalizedPhone,
          identifier: normalizedPhone,
        },
      });
    } else {
      showAlert(result.error || result.message || t('authOtpSendFailed'));
    }
  };

  const handleEmailLogin = () => {
    router.push('/auth/email-login' as any);
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password' as any);
  };

  const isFormValid = /^(05|5)\d{8}$/.test(phone.trim());

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="login-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <View style={{ width: 40 }} />
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.logoCircle}>
              <Smartphone size={30} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>{t('authLoginTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('authLoginSubtitlePhone')}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('authPhoneNumber')}</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.phonePrefix}>966+</Text>
              <TextInput
                style={[styles.input, styles.phoneInput, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="5XXXXXXXX"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                testID="login-phone-input"
              />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.submitBtn, (!isFormValid || sendingOtp) && styles.submitBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={!isFormValid || sendingOtp}
              testID="login-submit-btn"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitText}>
                  {sendingOtp ? t('authSending') : t('authSendOtp')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('authOr')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.emailLoginBtn}
            onPress={handleEmailLogin}
            activeOpacity={0.8}
            testID="login-email-btn"
          >
            <AtSign size={18} color={Colors.primary} />
            <Text style={styles.emailLoginText}>{t('authLoginWithEmail')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>{t('authForgotPasswordQ')}</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t('authNoAccount')} </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/register' as any)}>
              <Text style={styles.registerLink}>{t('authCreateNewAccount')}</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 32,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -60,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  formWrapper: {
    flex: 1,
    marginTop: -16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: 52,
  },
  phonePrefix: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginHorizontal: 16,
  },
  emailLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginBottom: 16,
  },
  emailLoginText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  forgotBtn: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
