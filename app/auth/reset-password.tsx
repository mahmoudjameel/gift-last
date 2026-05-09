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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import { useApp } from '@/contexts/AppContext';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { isRTL } = useApp();
  const params = useLocalSearchParams<{ phone: string }>();

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const confirmRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const showAlert = (type: 'error' | 'success', title: string, msg: string) =>
    setAlertConfig({ visible: true, type, title, message: msg });
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleReset = async () => {
    animatePress();

    if (password.length < 6) {
      showAlert('error', 'خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (!/[0-9]/.test(password) || !/[a-zA-Z\u0600-\u06FF]/.test(password)) {
      showAlert('error', 'خطأ', 'كلمة المرور يجب أن تحتوي على أحرف وأرقام');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('error', 'خطأ', 'كلمتا المرور غير متطابقتين');
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSubmitting(false);
    showAlert('success', 'تم', 'تم تغيير كلمة المرور بنجاح\nسيتم تحويلك لصفحة تسجيل الدخول بالبريد الإلكتروني');

    setTimeout(() => {
      router.replace('/auth/email-login' as any);
    }, 2000);
  };

  const isValid = password.length >= 6 && password === confirmPassword;

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="reset-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.navTitle}>كلمة مرور جديدة</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[Colors.primaryLight, '#FFF0F3']}
                style={styles.iconBg}
              >
                <KeyRound size={36} color={Colors.primary} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>تعيين كلمة مرور جديدة</Text>
            <Text style={styles.subtitle}>
              أدخل كلمة المرور الجديدة لحسابك
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور الجديدة</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  testID="reset-password-input"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={20} color={Colors.textMuted} /> : <Eye size={20} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
              {password.length > 0 && password.length < 6 && (
                <Text style={styles.hintText}>كلمة المرور يجب أن تكون 6 أحرف على الأقل</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>تأكيد كلمة المرور</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, { flex: 1, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                  testID="reset-confirm-password-input"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  {showConfirmPassword ? <EyeOff size={20} color={Colors.textMuted} /> : <Eye size={20} color={Colors.textMuted} />}
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>كلمتا المرور غير متطابقتين</Text>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && password.length >= 6 && (
                <Text style={styles.matchText}>كلمتا المرور متطابقتان ✓</Text>
              )}
            </View>

            <Animated.View style={[styles.submitWrap, { transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity
                style={[styles.submitBtn, (!isValid || isSubmitting) && styles.submitBtnDisabled]}
                onPress={handleReset}
                activeOpacity={0.85}
                disabled={!isValid || isSubmitting}
                testID="reset-submit-btn"
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitText}>
                    {isSubmitting ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
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
  formWrapper: {
    flex: 1,
    marginTop: -16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    marginTop: 24,
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
  inputGroup: {
    width: '100%',
    marginBottom: 20,
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
  hintText: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 6,
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
  submitWrap: {
    width: '100%',
    marginTop: 8,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
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
});
