import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Smartphone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import { useApp } from '@/contexts/AppContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isRTL } = useApp();
  const [phone, setPhone] = useState<string>('');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const showAlert = (msg: string) => setAlertConfig({ visible: true, type: 'error', title: 'خطأ', message: msg });
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

  const handleSendOtp = () => {
    animatePress();
    if (!phone.trim() || phone.length < 9) {
      showAlert('الرجاء إدخال رقم جوال صحيح');
      return;
    }

    router.push({
      pathname: '/auth/forgot-otp' as any,
      params: { phone: phone.trim() },
    });
  };

  const isValid = phone.trim().length >= 9;

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="forgot-back-btn">
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.navTitle}>نسيت كلمة المرور</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[Colors.primaryLight, '#FFF0F3']}
              style={styles.iconBg}
            >
              <Smartphone size={36} color={Colors.primary} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>استعادة كلمة المرور</Text>
          <Text style={styles.subtitle}>
            أدخل رقم الجوال المسجل لدينا وسنرسل لك{'\n'}رمز التحقق لإعادة تعيين كلمة المرور
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم الجوال</Text>
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
                testID="forgot-phone-input"
              />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
              onPress={handleSendOtp}
              activeOpacity={0.85}
              disabled={!isValid}
              testID="forgot-submit-btn"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitText}>إرسال رمز التحقق</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={() => router.back()} style={styles.backToLogin}>
            <Text style={styles.backToLoginText}>العودة لتسجيل الدخول</Text>
          </TouchableOpacity>
        </Animated.View>
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
    width: '100%',
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
  backToLogin: {
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
