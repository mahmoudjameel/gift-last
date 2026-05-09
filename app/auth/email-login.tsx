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
import { ArrowLeft, ArrowRight, Eye, EyeOff, AtSign } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { loginWithEmailPassword } from '@/services/firebaseAuth';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

export default function EmailLoginScreen() {
  const router = useRouter();
  const { login, isRTL } = useApp();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const passwordRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const showAlert = (msg: string) => setAlertConfig({ visible: true, type: 'error', title: 'خطأ', message: msg });
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const validateForm = (): boolean => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showAlert('الرجاء إدخال بريد إلكتروني صحيح');
      return false;
    }
    if (!password || password.length < 6) {
      showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    animatePress();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await loginWithEmailPassword(email.trim(), password);
      if (result.success && result.user) {
        await login(result.user);
        setIsLoading(false);
        router.replace('/auth-loading' as any);
      } else {
        setIsLoading(false);
        showAlert(result.error || 'فشل تسجيل الدخول. تأكد من البريد وكلمة المرور');
      }
    } catch (e: any) {
      setIsLoading(false);
      showAlert(e?.message || 'حدث خطأ غير متوقع');
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password' as any);
  };

  const isFormValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 6;

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="email-login-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <View style={{ width: 40 }} />
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.logoCircle}>
              <AtSign size={30} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>الدخول بالبريد الإلكتروني</Text>
            <Text style={styles.headerSubtitle}>سجّل دخولك باستخدام بريدك وكلمة المرور</Text>
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
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="example@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="email-login-email-input"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  testID="email-login-password-input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={20} color={Colors.textMuted} /> : <Eye size={20} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.submitBtn, (!isFormValid || isLoading) && styles.submitBtnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={!isFormValid || isLoading}
                testID="email-login-submit-btn"
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitText}>
                    {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>ليس لديك حساب؟ </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/register' as any)}>
                <Text style={styles.registerLink}>إنشاء حساب جديد</Text>
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
    fontSize: 24,
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
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
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
