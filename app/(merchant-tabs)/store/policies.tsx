import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ArrowLeft,
  ScrollText,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Info,
  CircleHelp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

export default function PoliciesScreen() {
  const { colors, t, isRTL } = useApp();
  const router = useRouter();

  const menuItems: { key: string; title: string; icon: typeof ScrollText; iconColor: string; page: string }[] = [
    { key: 'terms', title: t('termsOfService'), icon: ScrollText, iconColor: '#6366F1', page: 'terms' },
    { key: 'privacy', title: t('privacyPolicy'), icon: ShieldCheck, iconColor: '#10B981', page: 'privacy' },
    { key: 'faq', title: 'الأسئلة الشائعة', icon: CircleHelp, iconColor: '#8B5CF6', page: 'faq' },
    { key: 'support', title: t('support'), icon: Headphones, iconColor: '#F59E0B', page: 'support' },
    { key: 'about', title: t('aboutUs'), icon: Info, iconColor: '#3B82F6', page: 'about' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('policiesTerms')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.policyCard, { backgroundColor: colors.card, borderColor: colors.borderLight, borderWidth: 1 }]}
            onPress={() =>
              router.push({
                pathname: '/kado-info' as any,
                params: { title: item.title, page: item.page },
              })
            }
            activeOpacity={0.7}
          >
            <View style={[styles.policyIcon, { backgroundColor: item.iconColor + '15' }]}>
              <item.icon size={20} color={item.iconColor} />
            </View>
            <Text style={[styles.policyTitle, { color: colors.text }]}>{item.title}</Text>
            {isRTL ? <ChevronLeft size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, gap: 12 },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  },
  policyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    marginHorizontal: 12,
  },
  policyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: { flex: 1 },
});
