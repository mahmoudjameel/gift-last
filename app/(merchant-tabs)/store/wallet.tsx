import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ArrowLeft,
  CreditCard,
  CircleArrowDown,
  CircleArrowUp,
  CircleMinus,
  CircleDollarSign,
  Landmark,
  User,
  Hash,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

export default function WalletScreen() {
  const { colors, t, language, isRTL, storeInfo, walletBalance, walletTransactions, requestWithdrawal } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'success', message: '' });
  const dismissAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);

  const beneficiary = storeInfo?.beneficiaryName || (language === 'ar' ? 'لم يحدد' : 'Not set');
  const bankName = storeInfo?.bankName || (language === 'ar' ? 'لم يحدد' : 'Not set');
  const iban = storeInfo?.iban || '';
  const availableBalance = walletBalance;

  const formatIban = (val: string) => {
    if (!val) return language === 'ar' ? 'لم يحدد' : 'Not set';
    return val.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setAlertConfig({
        visible: true,
        type: 'error',
        message: language === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount',
      });
      return;
    }
    if (amount > availableBalance) {
      setAlertConfig({
        visible: true,
        type: 'error',
        message: language === 'ar' ? `الرصيد المتاح ${availableBalance.toLocaleString()} ${t('sar')} فقط` : `Available balance is only ${availableBalance.toLocaleString()} ${t('sar')}`,
      });
      return;
    }

    setAlertConfig({
      visible: true,
      type: 'confirm',
      title: language === 'ar' ? 'تأكيد طلب السحب' : 'Confirm Withdrawal',
      message: language === 'ar'
        ? `هل تريد سحب ${amount.toLocaleString()} ${t('sar')} إلى حسابك البنكي؟`
        : `Withdraw ${amount.toLocaleString()} ${t('sar')} to your bank account?`,
      buttons: [
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ar' ? 'تأكيد السحب' : 'Confirm',
          style: 'default',
          onPress: async () => {
            const result = await requestWithdrawal(amount);
            if (result.success) {
              setWithdrawAmount('');
              setTimeout(() => {
                setAlertConfig({
                  visible: true,
                  type: 'success',
                  message: language === 'ar'
                    ? `تم إرسال طلب سحب ${amount.toLocaleString()} ${t('sar')} بنجاح`
                    : `Withdrawal request of ${amount.toLocaleString()} ${t('sar')} submitted`,
                });
              }, 300);
            } else {
              setTimeout(() => {
                setAlertConfig({
                  visible: true,
                  type: 'error',
                  message: language === 'ar'
                    ? (result.message || 'تعذر إرسال طلب السحب')
                    : (result.message || 'Failed to submit withdrawal request'),
                });
              }, 300);
            }
          },
        },
      ],
    });
  }, [withdrawAmount, availableBalance, language, t, requestWithdrawal]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit': return <CircleArrowDown size={20} color={colors.success} />;
      case 'debit': return <CircleMinus size={20} color={colors.error} />;
      case 'withdrawal': return <CircleArrowUp size={20} color={colors.warning} />;
      default: return <CircleDollarSign size={20} color={colors.textMuted} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit': return colors.success;
      case 'debit': return colors.error;
      case 'withdrawal': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: colors.successLight, text: colors.success };
      case 'pending': return { bg: colors.warningLight, text: colors.warning };
      case 'failed': return { bg: colors.errorLight, text: colors.error };
      default: return { bg: colors.borderLight, text: colors.textMuted };
    }
  };

  const getStatusLabel = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'completed': return 'مكتمل';
        case 'pending': return 'معلق';
        case 'failed': return 'مرفوض';
        default: return status;
      }
    }
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'failed': return 'Rejected';
      default: return status;
    }
  };

  const sortedTransactions = [...walletTransactions].sort((a, b) => {
    const aTime = a.createdAtMs ?? new Date(a.date).getTime() ?? 0;
    const bTime = b.createdAtMs ?? new Date(b.date).getTime() ?? 0;
    return bTime - aTime;
  });

  const pendingWithdrawals = sortedTransactions.filter(tx => tx.type === 'withdrawal' && tx.status === 'pending');
  const pendingTotal = pendingWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('wallet')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
      >

        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>{t('walletBalance')}</Text>
            <CreditCard size={22} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.balanceAmount}>{walletBalance.toLocaleString()}</Text>
          <Text style={styles.balanceCurrency}>{t('sar')}</Text>

          {pendingTotal > 0 && (
            <View style={styles.pendingRow}>
              <Clock size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.pendingText}>
                {language === 'ar' ? 'طلبات معلقة:' : 'Pending:'} {pendingTotal.toLocaleString()} {t('sar')}
              </Text>
            </View>
          )}

          <View style={styles.bankInfoContainer}>
            <View style={styles.bankInfoRow}>
              <View style={styles.bankInfoLabelWrap}>
                <User size={13} color="rgba(255,255,255,0.6)" />
                <Text style={styles.bankInfoLabel}>
                  {language === 'ar' ? 'اسم المستفيد' : 'Beneficiary'}
                </Text>
              </View>
              <Text style={styles.bankInfoValue}>{beneficiary}</Text>
            </View>
            <View style={styles.bankInfoDivider} />
            <View style={styles.bankInfoRow}>
              <View style={styles.bankInfoLabelWrap}>
                <Landmark size={13} color="rgba(255,255,255,0.6)" />
                <Text style={styles.bankInfoLabel}>
                  {language === 'ar' ? 'البنك' : 'Bank'}
                </Text>
              </View>
              <Text style={styles.bankInfoValue}>{bankName}</Text>
            </View>
            <View style={styles.bankInfoDivider} />
            <View style={styles.bankInfoRow}>
              <View style={styles.bankInfoLabelWrap}>
                <Hash size={13} color="rgba(255,255,255,0.6)" />
                <Text style={styles.bankInfoLabel}>
                  {language === 'ar' ? 'رقم الآيبان' : 'IBAN'}
                </Text>
              </View>
              <Text style={[styles.bankInfoValue, styles.bankInfoIban]}>{formatIban(iban)}</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {language === 'ar' ? 'سحب الرصيد' : 'Withdraw'}
        </Text>
        <View style={[styles.withdrawCard, { backgroundColor: colors.card }]}>
          <View style={styles.withdrawBalanceRow}>
            <Text style={[styles.withdrawLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'الرصيد المتاح' : 'Available'}
            </Text>
            <Text style={[styles.withdrawBalance, { color: colors.primary }]}>{availableBalance.toLocaleString()} {t('sar')}</Text>
          </View>
          <View style={[styles.withdrawInputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
            <TextInput
              style={[styles.withdrawInput, { color: colors.text }]}
              placeholder={language === 'ar' ? 'أدخل المبلغ' : 'Enter amount'}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <Text style={[styles.withdrawCurrency, { color: colors.textMuted }]}>{t('sar')}</Text>
          </View>
          {withdrawAmount && parseFloat(withdrawAmount) > availableBalance && (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {language === 'ar' ? 'المبلغ أعلى من الرصيد المتاح' : 'Amount exceeds available balance'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              { backgroundColor: (!withdrawAmount || parseFloat(withdrawAmount) > availableBalance) ? colors.textMuted : colors.primary },
            ]}
            onPress={handleWithdraw}
            disabled={!withdrawAmount || parseFloat(withdrawAmount) > availableBalance}
          >
            <Text style={styles.withdrawBtnText}>{t('withdrawRequest')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {language === 'ar' ? 'سجل العمليات' : 'Transaction History'}
        </Text>
        <View style={[styles.historyCard, { backgroundColor: colors.card }]}>
          {sortedTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noTransactions')}</Text>
          ) : (
            sortedTransactions.map((tx, index) => {
              const statusStyle = getStatusColor(tx.status);
              return (
                <View key={tx.id} style={[styles.transactionItem, index < sortedTransactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                  <View style={[styles.transactionIconWrap, { backgroundColor: tx.type === 'credit' ? colors.successLight : tx.type === 'withdrawal' ? colors.warningLight : colors.errorLight }]}>
                    {getTransactionIcon(tx.type)}
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>{tx.description}</Text>
                    <Text style={[styles.transactionDate, { color: colors.textMuted }]}>{tx.date}</Text>
                  </View>
                  <View style={styles.transactionLeft}>
                    <Text style={[styles.transactionAmount, { color: getTransactionColor(tx.type) }]}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()} {t('sar')}
                    </Text>
                    <View style={[styles.transactionStatus, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.transactionStatusText, { color: statusStyle.text }]}>
                        {getStatusLabel(tx.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

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
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' as const },
  balanceAmount: { color: '#FFF', fontSize: 36, fontWeight: '800' as const },
  balanceCurrency: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pendingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  bankInfoContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  bankInfoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  bankInfoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  bankInfoValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
    textAlign: 'left',
    marginStart: 12,
  },
  bankInfoIban: {
    fontSize: 8,
    lineHeight: 18,
    letterSpacing: 1,
  },
  bankInfoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'left',
  },
  withdrawCard: {
    borderRadius: 18,
    padding: 18,
  },
  withdrawBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  withdrawBalance: { fontSize: 18, fontWeight: '700' as const },
  withdrawLabel: { fontSize: 14, fontWeight: '500' as const },
  withdrawInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  withdrawCurrency: { fontSize: 14, fontWeight: '500' as const },
  withdrawInput: { flex: 1, fontSize: 15, marginHorizontal: 8 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: -6,
  },
  errorText: { fontSize: 13, fontWeight: '500' as const },
  withdrawBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  withdrawBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' as const },
  historyCard: {
    borderRadius: 18,
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionLeft: { gap: 4 },
  transactionRight: { flex: 1, marginHorizontal: 12 },
  transactionDesc: { fontSize: 13, fontWeight: '500' as const },
  transactionDate: { fontSize: 11, marginTop: 2 },
  transactionAmount: { fontSize: 14, fontWeight: '700' as const },
  transactionStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  transactionStatusText: { fontSize: 10, fontWeight: '600' as const },
  transactionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
