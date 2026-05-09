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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import { useApp } from '@/contexts/AppContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { t, isRTL, isFirebaseConfigured, registerCustomerDirectly, register } = useApp();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showAlert(t('authNameRequired'));
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showAlert(t('authValidEmailRequired'));
      return false;
    }
    if (password.length < 6) {
      showAlert(t('authPasswordMinLength'));
      return false;
    }
    if (!/[0-9]/.test(password) || !/[a-zA-Z\u0600-\u06FF]/.test(password)) {
      showAlert(t('authPasswordLettersNumbers'));
      return false;
    }
    if (password !== confirmPassword) {
      showAlert(t('authPasswordMismatch'));
      return false;
    }
    if (!agreedToTerms) {
      showAlert(t('authAgreeRequired'));
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    animatePress();
    if (!validateForm()) return;

    if (isFirebaseConfigured()) {
      setIsSubmitting(true);
      const result = await registerCustomerDirectly({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setIsSubmitting(false);

      if (result.success && result.user) {
        await register(result.user);
        router.replace('/(customer-tabs)' as any);
        return;
      }

      setAlertConfig({
        visible: true,
        type: 'error',
        title: t('authErrorTitle'),
        message: result.error || t('authRegisterFailed'),
      });
      return;
    }
    showAlert(t('authFirebaseRequired'));
  };

  const isFormValid = agreedToTerms && name.trim() && email.trim() && password && confirmPassword;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark, '#6B0F1A']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="register-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.navTitle}>{t('authRegisterTitle')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>{t('authRegisterSubtitle')}</Text>
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
              <Text style={styles.label}>{t('authFullName')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('authEnterName')}
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  testID="register-name-input"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('email')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={emailRef}
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="example@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="register-email-input"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('newPassword')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  testID="register-password-input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={20} color={Colors.textMuted} /> : <Eye size={20} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('confirmPassword')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, { flex: 1, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                  testID="register-confirm-password-input"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  {showConfirmPassword ? <EyeOff size={20} color={Colors.textMuted} /> : <Eye size={20} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>{t('authPasswordMismatch')}</Text>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && (
                <Text style={styles.matchText}>{t('authPasswordMatch')}</Text>
              )}
            </View>

            <View style={styles.termsRow}>
              <TouchableOpacity
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
                testID="register-terms-btn"
                style={styles.checkboxWrap}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Check size={14} color="#FFF" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                {t('authAgreePrefix')}{' '}
                <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>{t('termsOfService')}</Text>
                {' '}{t('authAnd')}{' '}
                <Text style={styles.termsLink} onPress={() => setShowPrivacyModal(true)}>{t('privacyPolicy')}</Text>
              </Text>
            </View>

            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.submitBtn, (!isFormValid || isSubmitting) && styles.submitBtnDisabled]}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={!isFormValid || isSubmitting}
                testID="register-submit-btn"
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitText}>
                    {isSubmitting ? t('authCreatingAccount') : t('authCreateAccount')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>{t('authAlreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login' as any)}>
                <Text style={styles.loginLink}>{t('authLoginTitle')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={showTermsModal} animationType="slide" onRequestClose={() => setShowTermsModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: Colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.modalCloseBtn}>
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>{t('termsOfService')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <Text style={[styles.modalText, { color: Colors.textSecondary }]}>{t('termsContent')}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showPrivacyModal} animationType="slide" onRequestClose={() => setShowPrivacyModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: Colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.modalCloseBtn}>
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>{t('privacyPolicy')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <Text style={[styles.modalText, { color: Colors.textSecondary }]}>{t('privacyContent')}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
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
  },
  inputGroup: {
    marginBottom: 18,
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
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
  },
  matchText: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  checkboxWrap: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 24,
  },
});
