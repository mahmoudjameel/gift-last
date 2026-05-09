import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LogIn, LockKeyhole } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

interface GuestLoginPromptProps {
  visible: boolean;
  onClose: () => void;
}

export function GuestLoginModal({ visible, onClose }: GuestLoginPromptProps) {
  const { colors, t, exitGuestMode } = useApp();
  const router = useRouter();

  const handleLogin = async () => {
    onClose();
    await exitGuestMode();
    router.replace('/');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <LockKeyhole size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('loginRequired')}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('loginRequiredDesc')}</Text>
          <TouchableOpacity style={[styles.loginBtn, { backgroundColor: colors.primary }]} onPress={handleLogin}>
            <LogIn size={18} color="#FFF" />
            <Text style={styles.loginBtnText}>{t('loginNow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function GuestLoginCard() {
  const { colors, t, exitGuestMode } = useApp();
  const router = useRouter();

  const handleLogin = async () => {
    await exitGuestMode();
    router.replace('/');
  };

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
        <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryLight }]}>
          <LockKeyhole size={24} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('loginRequired')}</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{t('loginRequiredDesc')}</Text>
        <TouchableOpacity style={[styles.cardBtn, { backgroundColor: colors.primary }]} onPress={handleLogin}>
          <LogIn size={16} color="#FFF" />
          <Text style={styles.cardBtnText}>{t('loginNow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cancelBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  cardBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
