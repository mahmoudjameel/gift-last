import React, { useCallback } from 'react';
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
  ShoppingBag,
  BellOff,
  CheckCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { AppNotification } from '@/types';

const getStatusColor = (message: string) => {
  if (message.includes('التأكيد') || message.includes('Confirmed')) return '#3B82F6';
  if (message.includes('التحضير') || message.includes('Preparing')) return '#8B5CF6';
  if (message.includes('التوصيل') || message.includes('Delivered')) return '#10B981';
  if (message.includes('ملغي') || message.includes('Cancelled')) return '#EF4444';
  return '#F59E0B';
};

export default function NotificationsScreen() {
  const { colors, t, language, isRTL, customerNotifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const router = useRouter();

  const formatTime = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (language === 'ar') {
      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      return `منذ ${days} يوم`;
    }
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, [language]);

  const handleNotifPress = useCallback((notif: AppNotification) => {
    if (!notif.isRead) markNotificationRead(notif.id);
    if (notif.orderId) {
      router.push(`/order-detail/${notif.orderId}` as any);
    }
  }, [markNotificationRead, router]);

  const unreadCount = customerNotifications.filter((n) => !n.isRead).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('notifications')}</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => markAllNotificationsRead('customer')}
              style={[styles.markAllBtn, { backgroundColor: colors.borderLight }]}
            >
              <CheckCheck size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {customerNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.borderLight }]}>
              <BellOff size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noNotifications')}</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{t('noNotificationsDesc')}</Text>
          </View>
        ) : (
          customerNotifications.map((notif) => {
            const statusColor = getStatusColor(notif.message);
            return (
              <TouchableOpacity
                key={notif.id}
                activeOpacity={0.7}
                onPress={() => handleNotifPress(notif)}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: notif.isRead ? colors.glass : colors.primaryLight,
                    borderColor: notif.isRead ? colors.glassBorder : colors.primary + '20',
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.notifRow}>
                  <View style={[styles.notifIcon, { backgroundColor: statusColor + '15' }]}>
                    <ShoppingBag size={18} color={statusColor} />
                  </View>
                  <View style={styles.notifTextWrap}>
                    <Text style={[styles.notifTitle, { color: colors.text }]}>{notif.title}</Text>
                    <Text style={[styles.notifMessage, { color: colors.textSecondary }]}>{notif.message}</Text>
                    <Text style={[styles.notifTime, { color: colors.textMuted }]}>{formatTime(notif.timestamp)}</Text>
                  </View>
                </View>
                {!notif.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          })
        )}
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
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  scrollContent: { padding: 20, gap: 10 },
  notifCard: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifTextWrap: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 12,
    marginTop: 4,
  },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
});
