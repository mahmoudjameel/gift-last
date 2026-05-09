import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, CircleUserRound, AtSign, Smartphone, LockKeyhole, X, KeyRound, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

export default function AccountSettingsScreen() {
  const { colors, t, user, updateUser, isRTL, logout } = useApp();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'success', message: '' });
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleSave = async () => {
    await updateUser({ name, email, phone });
    setAlertConfig({ visible: true, type: 'success', message: t('savedSuccessfully') });
  };

  const handleChangePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) return;
    setShowPasswordModal(false);
    setShowOtpModal(true);
  };

  const handleVerifyOtp = () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) return;
    setShowOtpModal(false);
    setOtp(['', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setAlertConfig({ visible: true, type: 'success', message: t('passwordChanged') });
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    await logout();
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('accountSettings')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('personalInfo')}</Text>

        <View style={[styles.formCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <View style={[styles.fieldRow, { borderBottomColor: colors.borderLight }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={name}
              onChangeText={setName}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('name')}</Text>
              <View style={[styles.fieldIcon, { backgroundColor: '#10B98115' }]}>
                <CircleUserRound size={16} color="#10B981" />
              </View>
            </View>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: colors.borderLight }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textAlign="left"
            />
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('email')}</Text>
              <View style={[styles.fieldIcon, { backgroundColor: '#3B82F615' }]}>
                <AtSign size={16} color="#3B82F6" />
              </View>
            </View>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: 'transparent' }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign="left"
            />
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('phone')}</Text>
              <View style={[styles.fieldIcon, { backgroundColor: '#F59E0B15' }]}>
                <Smartphone size={16} color="#F59E0B" />
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.passwordBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={[styles.passwordBtnText, { color: colors.primary }]}>{t('changePassword')}</Text>
          <View style={[styles.fieldIcon, { backgroundColor: colors.primaryLight }]}>
            <LockKeyhole size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t('save')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setShowDeleteModal(true)}
        >
          <Trash2 size={16} color={colors.error} />
          <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('deleteAccount')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('changePassword')}</Text>
            </View>

            <View style={[styles.modalField, { backgroundColor: colors.inputBg }]}>
              <TextInput
                style={[styles.modalInput, { color: colors.text }]}
                placeholder={t('newPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <KeyRound size={18} color={colors.textMuted} />
            </View>

            <View style={[styles.modalField, { backgroundColor: colors.inputBg }]}>
              <TextInput
                style={[styles.modalInput, { color: colors.text }]}
                placeholder={t('confirmPassword')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <LockKeyhole size={18} color={colors.textMuted} />
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: newPassword && newPassword === confirmPassword ? 1 : 0.5 }]}
              onPress={handleChangePassword}
              disabled={!newPassword || newPassword !== confirmPassword}
            >
              <Text style={styles.modalBtnText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('otpVerification')}</Text>
            </View>

            <Text style={[styles.otpDesc, { color: colors.textSecondary }]}>{t('enterOtp')}</Text>

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  style={[styles.otpInput, { borderColor: digit ? colors.primary : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text.slice(-1), index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>

            <TouchableOpacity>
              <Text style={[styles.resendText, { color: colors.primary }]}>{t('resendOtp')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: otp.join('').length === 4 ? 1 : 0.5 }]}
              onPress={handleVerifyOtp}
              disabled={otp.join('').length !== 4}
            >
              <Text style={styles.modalBtnText}>{t('verify')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteModal, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
            <View style={[styles.deleteIconWrap, { backgroundColor: colors.errorLight }]}>
              <Trash2 size={28} color={colors.error} />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>{t('deleteAccountTitle')}</Text>
            <Text style={[styles.deleteModalDesc, { color: colors.textSecondary }]}>{t('deleteAccountConfirm')}</Text>
            <View style={styles.deleteModalBtns}>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: colors.borderLight }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.deleteModalBtnText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: colors.error }]}
                onPress={handleDeleteAccount}
              >
                <Text style={[styles.deleteModalBtnText, { color: '#FFF' }]}>{t('deleteAccountBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <GlassAlert {...alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '500' as const, marginBottom: 10, marginTop: 8 },
  formCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontSize: 12, fontWeight: '500' as const },
  fieldInput: { fontSize: 15, fontWeight: '500' as const, paddingVertical: 0 },
  passwordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  passwordBtnText: { fontSize: 15, fontWeight: '600' as const },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600' as const },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' as const },
  modalField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 10,
  },
  modalInput: { flex: 1, fontSize: 15 },
  modalBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
  otpDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  otpInput: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  deleteModal: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: { fontSize: 20, fontWeight: '700' as const, marginBottom: 8 },
  deleteModalDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  deleteModalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  deleteModalBtnText: { fontSize: 15, fontWeight: '700' as const },
});
