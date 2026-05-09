import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, Globe, Moon, Sun, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

export default function DisplaySettingsScreen() {
  const { colors, t, language, isRTL, setLanguage, isDarkMode, toggleDarkMode } = useApp();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('display')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <View style={styles.cardHeader}>
            <Eye size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('display')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => setLanguage(language === 'ar' ? 'he' : 'ar')}
          >
            <Text style={[styles.settingValue, { color: colors.primary }]}>{language === 'ar' ? 'עברית' : 'العربية'}</Text>
            <View style={styles.settingRight}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('language')}</Text>
              <View style={[styles.iconContainer, { backgroundColor: '#3B82F615' }]}>
                <Globe size={20} color="#3B82F6" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, { borderBottomColor: 'transparent' }]} onPress={toggleDarkMode}>
            <View style={[styles.dayNightToggle, { backgroundColor: isDarkMode ? colors.primary : colors.inputBg }]}>
              <View style={[styles.dayNightKnob, isDarkMode ? styles.dayNightKnobActive : null]} />
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {isDarkMode ? t('nightMode') : t('dayMode')}
              </Text>
              <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#6366F115' : '#F59E0B15' }]}>
                {isDarkMode ? <Moon size={20} color="#6366F1" /> : <Sun size={20} color="#F59E0B" />}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
  content: { paddingHorizontal: 20, paddingTop: 16 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 15, fontWeight: '500' as const },
  settingValue: { fontSize: 14, fontWeight: '600' as const },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNightToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dayNightKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
  },
  dayNightKnobActive: { alignSelf: 'flex-end' as const },
});
