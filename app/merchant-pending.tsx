import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, XCircle, ShieldBan, ArrowLeft, RefreshCw, Home } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

export default function MerchantPendingScreen() {
  const { merchantStatus, refreshMerchantData, switchRole, language, colors } = useApp();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAr = language === 'ar';
  const status = merchantStatus || 'pending';

  useEffect(() => {
    if (merchantStatus === 'active') {
      router.replace('/(merchant-tabs)/dashboard' as any);
    }
  }, [merchantStatus, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshMerchantData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMerchantData]);

  const handleGoHome = useCallback(async () => {
    await switchRole();
    router.replace('/(customer-tabs)/home' as any);
  }, [switchRole, router]);

  const statusConfig: Record<string, {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    description: string;
    gradientColors: [string, string, string];
    showRefresh: boolean;
  }> = {
    pending: {
      icon: <Clock size={64} color="#FFF" />,
      title: isAr ? 'طلبك قيد المراجعة' : 'Your request is under review',
      subtitle: isAr ? 'يتم مراجعة طلب تسجيلك حالياً' : 'Your registration is being reviewed',
      description: isAr
        ? 'سيتم مراجعة طلبك من قبل الإدارة والموافقة عليه في أقرب وقت. سيتم إشعارك عند تفعيل حسابك.'
        : 'Your request will be reviewed by the administration and approved as soon as possible. You will be notified when your account is activated.',
      gradientColors: ['#F59E0B', '#D97706', '#B45309'],
      showRefresh: true,
    },
    rejected: {
      icon: <XCircle size={64} color="#FFF" />,
      title: isAr ? 'تم رفض الطلب' : 'Request Rejected',
      subtitle: isAr ? 'عذراً، تم رفض طلب تسجيلك' : 'Sorry, your registration was rejected',
      description: isAr
        ? 'تم رفض طلب تسجيل حساب التاجر الخاص بك. يرجى التواصل مع الإدارة للمزيد من التفاصيل أو لإعادة تقديم الطلب.'
        : 'Your merchant registration request has been rejected. Please contact support for more details or to resubmit.',
      gradientColors: ['#EF4444', '#DC2626', '#B91C1C'],
      showRefresh: true,
    },
    suspended: {
      icon: <ShieldBan size={64} color="#FFF" />,
      title: isAr ? 'الحساب موقوف' : 'Account Suspended',
      subtitle: isAr ? 'تم إيقاف حسابك مؤقتاً' : 'Your account has been temporarily suspended',
      description: isAr
        ? 'تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الإدارة لمعرفة السبب وإعادة تفعيل الحساب.'
        : 'Your account has been temporarily suspended. Please contact support to learn why and reactivate.',
      gradientColors: ['#6B7280', '#4B5563', '#374151'],
      showRefresh: true,
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={config.gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {config.icon}
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          <View style={styles.descriptionCard}>
            <Text style={styles.description}>{config.description}</Text>
          </View>

          <View style={styles.buttonsContainer}>
            {config.showRefresh && (
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={handleRefresh}
                disabled={isRefreshing}
                activeOpacity={0.8}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <RefreshCw size={20} color="#FFF" />
                )}
                <Text style={styles.refreshBtnText}>
                  {isRefreshing
                    ? (isAr ? 'جاري التحقق...' : 'Checking...')
                    : (isAr ? 'تحقق من الحالة' : 'Check Status')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={handleGoHome}
              activeOpacity={0.8}
            >
              <Home size={20} color={config.gradientColors[0]} />
              <Text style={[styles.homeBtnText, { color: config.gradientColors[0] }]}>
                {isAr ? 'الذهاب للرئيسية' : 'Go to Home'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 80,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  descriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFF',
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  refreshBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 16,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
