import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Upload, Check, ChevronDown, X, Store, MapPinned, Landmark, CreditCard, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/contexts/AppContext';
import { saudiCities } from '@/mocks/cities';
import { EntityType, StoreInfo } from '@/types';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import MapPickerModal from '@/components/MapPickerModal';
import { SAUDI_BANKS, OTHER_BANK_KEY, OTHER_BANK_LABEL } from '@/constants/banks';
import type { LocationCoords } from '@/utils/location';

export default function MerchantRegisterScreen() {
  const { colors, t, language, isRTL, registerStore, selectRole } = useApp();
  const router = useRouter();

  const [storeName, setStoreName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [entityType, setEntityType] = useState<EntityType | ''>('');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [nationalIdUri, setNationalIdUri] = useState<string>('');
  const [freelanceDocUri, setFreelanceDocUri] = useState<string>('');
  const [freelanceDocNumber, setFreelanceDocNumber] = useState<string>('');
  const [commercialRegNumber, setCommercialRegNumber] = useState<string>('');
  const [commercialRegUri, setCommercialRegUri] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCityName, setSelectedCityName] = useState<string>('');
  /** إحداثيات موقع المتجر من الخريطة (للفلترة والتوصيل) */
  const [storeCoords, setStoreCoords] = useState<LocationCoords | null>(null);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);

  const [selectedBankKey, setSelectedBankKey] = useState<string>('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
  const [iban, setIban] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');

  const [isRegistering, setIsRegistering] = useState(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'error', message: '' });
  const showAlertMsg = useCallback((msg: string) => setAlertConfig({ visible: true, type: 'error', message: msg }), []);
  const dismissAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);

  const pickImage = useCallback(async (setter: (uri: string) => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setter(result.assets[0].uri);
      }
    } catch (e) {
      void e;
    }
  }, []);

  const resolvedBankName = selectedBankKey === OTHER_BANK_KEY ? customBankName : selectedBankKey;

  const handleRegister = useCallback(async () => {
    if (!storeName.trim()) {
      showAlertMsg(language === 'ar' ? 'يرجى إدخال اسم المتجر' : 'אנא הכנס שם חנות');
      return;
    }
    if (!username.trim()) {
      showAlertMsg(language === 'ar' ? 'يرجى إدخال اسم المستخدم' : 'אנא הכנס שם משתמש');
      return;
    }
    if (!entityType) {
      showAlertMsg(language === 'ar' ? 'يرجى اختيار نوع الكيان' : 'אנא בחר סוג ישות');
      return;
    }
    if (!selectedCity) {
      showAlertMsg(language === 'ar' ? 'يرجى اختيار المدينة من الخريطة' : 'אנא בחר עיר מהמפה');
      return;
    }
    const matchedCity = saudiCities.find((c) => c.id === selectedCity);
    const effectiveCoords =
      storeCoords ??
      (matchedCity ? { latitude: matchedCity.lat, longitude: matchedCity.lng } : null);
    if (!effectiveCoords) {
      showAlertMsg(
        language === 'ar'
          ? 'يرجى فتح الخريطة وتأكيد موقع المتجر'
          : 'Please open the map and confirm your store location'
      );
      return;
    }
    if (iban && !/^SA\d{22}$/.test(iban.trim())) {
      showAlertMsg(language === 'ar' ? 'رقم الآيبان يجب أن يبدأ بـ SA ويتكون من 24 حرف' : 'מספר IBAN חייב להתחיל ב-SA ולהיות באורך 24 תווים');
      return;
    }
    if (!agreeTerms) {
      showAlertMsg(language === 'ar' ? 'يرجى الموافقة على الشروط والأحكام' : 'אנא הסכם לתנאים');
      return;
    }

    const cityAr =
      matchedCity?.nameAr || selectedCityName || (language === 'ar' ? selectedCityName : '') || selectedCity;

    const info: StoreInfo = {
      name: storeName.trim(),
      username: username.trim(),
      entityType: entityType as EntityType,
      nationalIdUri: entityType === 'individual' ? nationalIdUri : undefined,
      freelanceDocUri: entityType === 'individual' ? freelanceDocUri : undefined,
      freelanceDocNumber: entityType === 'individual' ? freelanceDocNumber : undefined,
      commercialRegNumber: entityType !== 'individual' ? commercialRegNumber : undefined,
      commercialRegUri: entityType !== 'individual' ? commercialRegUri : undefined,
      city: cityAr,
      cityId: selectedCity,
      latitude: effectiveCoords.latitude,
      longitude: effectiveCoords.longitude,
      locationAddress: selectedCityName?.trim() || undefined,
      isOpen: true,
      bankName: resolvedBankName || undefined,
      iban: iban || undefined,
      beneficiaryName: beneficiaryName || undefined,
    };

    setIsRegistering(true);
    try {
      await registerStore(info);
      await selectRole('merchant');
      router.replace('/merchant-pending' as any);
    } catch (e) {
      console.error('[registerStore] error:', e);
      showAlertMsg(language === 'ar' ? 'حدث خطأ أثناء تسجيل المتجر' : 'שגיאה ברישום החנות');
    } finally {
      setIsRegistering(false);
    }
  }, [storeName, username, entityType, nationalIdUri, freelanceDocUri, freelanceDocNumber, commercialRegNumber, commercialRegUri, selectedCity, selectedCityName, storeCoords, agreeTerms, resolvedBankName, iban, beneficiaryName, registerStore, selectRole, router, language, showAlertMsg]);

  const entityTypes: { key: EntityType; label: string }[] = [
    { key: 'individual', label: language === 'ar' ? 'فرد / عمل حر' : 'יחיד / עצמאי' },
    { key: 'institution', label: language === 'ar' ? 'مؤسسة' : 'מוסד' },
    { key: 'company', label: language === 'ar' ? 'شركة' : 'חברה' },
  ];

  const handleMapCitySelect = useCallback((cityName: string, coords?: LocationCoords, displayLabel?: string | null) => {
    const matched = saudiCities.find((c) => c.nameAr === cityName || c.nameEn === cityName);
    if (matched) {
      setSelectedCity(matched.id);
      setSelectedCityName(
        displayLabel || (language === 'ar' ? matched.nameAr : matched.nameEn)
      );
    } else {
      setSelectedCity(cityName);
      setSelectedCityName(displayLabel || cityName);
    }
    if (coords) {
      setStoreCoords(coords);
    }
  }, [language]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('storeRegistration')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Store size={32} color={colors.primary} />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('storeName')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder={language === 'ar' ? 'أدخل اسم المتجر' : 'הכנס שם חנות'}
          placeholderTextColor={colors.textMuted}
          value={storeName}
          onChangeText={setStoreName}
          textAlign={isRTL ? 'right' : 'left'}
        />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('username')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'הכנס שם משתמש'}
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          textAlign={isRTL ? 'right' : 'left'}
          autoCapitalize="none"
        />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {language === 'ar' ? 'نوع الكيان' : 'סוג ישות'}
        </Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: colors.inputBg, borderColor: entityType ? colors.primary : colors.border }]}
          onPress={() => setShowEntityDropdown(!showEntityDropdown)}
        >
          <ChevronDown size={18} color={colors.textSecondary} />
          <Text style={[styles.dropdownBtnText, { color: entityType ? colors.text : colors.textMuted }]}>
            {entityType ? entityTypes.find(e => e.key === entityType)?.label : (language === 'ar' ? 'اختر نوع الكيان' : 'בחר סוג ישות')}
          </Text>
        </TouchableOpacity>
        {showEntityDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            {entityTypes.map((et) => (
              <TouchableOpacity
                key={et.key}
                style={[styles.dropdownItem, entityType === et.key && { backgroundColor: colors.primaryLight }]}
                onPress={() => { setEntityType(et.key); setShowEntityDropdown(false); }}
              >
                <Text style={[styles.dropdownItemText, { color: entityType === et.key ? colors.primary : colors.text }]}>
                  {et.label}
                </Text>
                {entityType === et.key && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {entityType === 'individual' && (
          <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.docCardTitle, { color: colors.text }]}>
              {language === 'ar' ? 'مستندات العمل الحر' : 'מסמכי עצמאי'}
            </Text>

            <Text style={[styles.docFieldLabel, { color: colors.text }]}>
              {language === 'ar' ? 'رقم وثيقة العمل الحر' : 'מספר מסמך עצמאי'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={language === 'ar' ? 'رقم الوثيقة' : 'מספר מסמך'}
              placeholderTextColor={colors.textMuted}
              value={freelanceDocNumber}
              onChangeText={setFreelanceDocNumber}
              textAlign={isRTL ? 'right' : 'left'}
              keyboardType="number-pad"
            />

            <Text style={[styles.docFieldLabel, { color: colors.text }]}>
              {language === 'ar' ? 'صورة الهوية الوطنية *' : 'תמונת תעודת זהות *'}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => pickImage(setNationalIdUri)}
            >
              {nationalIdUri ? (
                <View style={styles.uploadedRow}>
                  <Check size={18} color={colors.success} />
                  <Text style={[styles.uploadedText, { color: colors.success }]}>
                    {language === 'ar' ? 'تم الرفع ✓' : 'הועלה ✓'}
                  </Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <Upload size={22} color={colors.textMuted} />
                  <Text style={[styles.uploadText, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'اضغط لرفع صورة الهوية' : 'לחץ להעלאת תעודת זהות'}
                  </Text>
                  <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'صورة أو PDF' : 'תמונה או PDF'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.docFieldLabel, { color: colors.text }]}>
              {language === 'ar' ? 'صورة شهادة العمل الحر *' : 'תעודת עצמאי *'}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => pickImage(setFreelanceDocUri)}
            >
              {freelanceDocUri ? (
                <View style={styles.uploadedRow}>
                  <Check size={18} color={colors.success} />
                  <Text style={[styles.uploadedText, { color: colors.success }]}>
                    {language === 'ar' ? 'تم الرفع ✓' : 'הועלה ✓'}
                  </Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <Upload size={22} color={colors.textMuted} />
                  <Text style={[styles.uploadText, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'اضغط لرفع شهادة العمل الحر' : 'לחץ להעלאת תעודה'}
                  </Text>
                  <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'صورة أو PDF' : 'תמונה או PDF'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {(entityType === 'institution' || entityType === 'company') && (
          <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.docCardTitle, { color: colors.text }]}>
              {entityType === 'institution'
                ? (language === 'ar' ? 'مستندات المؤسسة' : 'מסמכי מוסד')
                : (language === 'ar' ? 'مستندات الشركة' : 'מסמכי חברה')}
            </Text>

            <Text style={[styles.docFieldLabel, { color: colors.text }]}>
              {language === 'ar' ? 'رقم السجل التجاري' : 'מספר רישום מסחרי'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={language === 'ar' ? '70xxxxxxxxx' : 'הכנס מספר'}
              placeholderTextColor={colors.textMuted}
              value={commercialRegNumber}
              onChangeText={setCommercialRegNumber}
              textAlign={isRTL ? 'right' : 'left'}
              keyboardType="number-pad"
            />

            <Text style={[styles.docFieldLabel, { color: colors.text }]}>
              {language === 'ar' ? 'صورة السجل التجاري *' : 'תמונת רישום מסחרי *'}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => pickImage(setCommercialRegUri)}
            >
              {commercialRegUri ? (
                <View style={styles.uploadedRow}>
                  <Check size={18} color={colors.success} />
                  <Text style={[styles.uploadedText, { color: colors.success }]}>
                    {language === 'ar' ? 'تم الرفع ✓' : 'הועלה ✓'}
                  </Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <Upload size={22} color={colors.textMuted} />
                  <Text style={[styles.uploadText, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'اضغط لرفع صورة السجل' : 'לחץ להעלאה'}
                  </Text>
                  <Text style={[styles.uploadSubText, { color: colors.textMuted }]}>
                    {language === 'ar' ? 'صورة أو PDF' : 'תמונה או PDF'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.bankCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.bankCardHeader}>
            <Text style={[styles.bankCardSubtitle, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'أدخل بياناتك البنكية لاستلام أرباحك عند طلب السحب' : 'הכנס פרטי בנק לקבלת תשלומים'}
            </Text>
            <View style={styles.bankCardTitleRow}>
              <Landmark size={20} color={colors.primary} />
              <Text style={[styles.bankCardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'بيانات المحفظة البنكية' : 'פרטי בנק'}
              </Text>
            </View>
          </View>

          <View style={styles.bankFieldGroup}>
            <View style={styles.bankFieldLabelRow}>
              <Landmark size={16} color={colors.textSecondary} />
              <Text style={[styles.bankFieldLabel, { color: colors.text }]}>
                {language === 'ar' ? 'اسم البنك' : 'שם הבנק'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.dropdownBtn, { backgroundColor: colors.inputBg, borderColor: selectedBankKey ? colors.primary : colors.border }]}
              onPress={() => setShowBankDropdown(!showBankDropdown)}
            >
              <ChevronDown size={18} color={colors.textSecondary} />
              <Text style={[styles.dropdownBtnText, { color: selectedBankKey ? colors.text : colors.textMuted }]}>
                {selectedBankKey
                  ? (selectedBankKey === OTHER_BANK_KEY ? OTHER_BANK_LABEL : selectedBankKey)
                  : (language === 'ar' ? 'اختر البنك' : 'בחר בנק')}
              </Text>
            </TouchableOpacity>
            {showBankDropdown && (
              <ScrollView style={[styles.dropdownList, styles.bankDropdownList, { backgroundColor: colors.card, borderColor: colors.borderLight }]} nestedScrollEnabled>
                {SAUDI_BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[styles.dropdownItem, selectedBankKey === bank && { backgroundColor: colors.primaryLight }]}
                    onPress={() => { setSelectedBankKey(bank); setShowBankDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: selectedBankKey === bank ? colors.primary : colors.text }]}>
                      {bank}
                    </Text>
                    {selectedBankKey === bank && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.dropdownItem, selectedBankKey === OTHER_BANK_KEY && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setSelectedBankKey(OTHER_BANK_KEY); setShowBankDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: selectedBankKey === OTHER_BANK_KEY ? colors.primary : colors.text }]}>
                    {OTHER_BANK_LABEL}
                  </Text>
                  {selectedBankKey === OTHER_BANK_KEY && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              </ScrollView>
            )}

            {selectedBankKey === OTHER_BANK_KEY && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, marginTop: 8 }]}
                placeholder={language === 'ar' ? 'أدخل اسم البنك' : 'Enter bank name'}
                placeholderTextColor={colors.textMuted}
                value={customBankName}
                onChangeText={setCustomBankName}
                textAlign={isRTL ? 'right' : 'left'}
              />
            )}
          </View>

          <View style={styles.bankFieldGroup}>
            <View style={styles.bankFieldLabelRow}>
              <CreditCard size={16} color={colors.textSecondary} />
              <Text style={[styles.bankFieldLabel, { color: colors.text }]}>
                {language === 'ar' ? 'رقم الآيبان (IBAN)' : 'IBAN Number'}
              </Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder="SA0000000000000000000000"
              placeholderTextColor={colors.textMuted}
              value={iban}
              onChangeText={setIban}
              textAlign="left"
              autoCapitalize="characters"
              maxLength={24}
            />
            <Text style={[styles.ibanHint, { color: colors.textMuted }]}>
              {language === 'ar' ? 'رقم الآيبان يبدأ بـ IL ويتكون من 23 حرف ورقم' : 'Israeli IBAN starts with IL (23 characters)'}
            </Text>
          </View>

          <View style={styles.bankFieldGroup}>
            <View style={styles.bankFieldLabelRow}>
              <User size={16} color={colors.textSecondary} />
              <Text style={[styles.bankFieldLabel, { color: colors.text }]}>
                {language === 'ar' ? 'اسم المستفيد (صاحب الحساب)' : 'Beneficiary Name'}
              </Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder={language === 'ar' ? 'اسم صاحب الحساب' : 'Account holder name'}
              placeholderTextColor={colors.textMuted}
              value={beneficiaryName}
              onChangeText={setBeneficiaryName}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('city')}</Text>
        <TouchableOpacity
          style={[styles.input, styles.cityPicker, { backgroundColor: colors.inputBg }]}
          onPress={() => setShowMapPicker(true)}
        >
          <MapPinned size={18} color={colors.primary} />
          <Text style={[styles.cityText, { color: selectedCityName ? colors.text : colors.textMuted }]}>
            {selectedCityName || t('selectCity')}
          </Text>
        </TouchableOpacity>

        <MapPickerModal
          visible={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectCity={handleMapCitySelect}
          title={language === 'ar' ? 'اختر مدينة المتجر' : 'Select store city'}
        />

        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>{t('agreeTerms')}</Text>
          <View style={[styles.checkbox, {
            backgroundColor: agreeTerms ? colors.primary : 'transparent',
            borderColor: agreeTerms ? colors.primary : colors.border,
          }]}>
            {agreeTerms && <Check size={14} color="#FFF" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.registerBtn, { backgroundColor: (agreeTerms && !isRegistering) ? colors.primary : colors.textMuted, opacity: isRegistering ? 0.6 : 1 }]}
          onPress={handleRegister}
          disabled={!agreeTerms || isRegistering}
        >
          {!isRegistering && (isRTL ? <ArrowLeft size={20} color="#FFF" /> : <ArrowRight size={20} color="#FFF" />)}
          <Text style={styles.registerBtnText}>{isRegistering ? (language === 'ar' ? 'جاري التسجيل...' : 'Registering...') : t('registerStore')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    paddingVertical: 14,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  scrollContent: { padding: 24 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
  },
  dropdownBtn: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  dropdownBtnText: { flex: 1, fontSize: 14 },
  dropdownList: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemText: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  bankDropdownList: {
    maxHeight: 250,
  },
  docCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  docCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 16,
  },
  docFieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 12,
  },
  uploadBtn: {
    borderRadius: 14,
    paddingVertical: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadContent: {
    alignItems: 'center',
    gap: 6,
  },
  uploadText: { fontSize: 14 },
  uploadSubText: { fontSize: 11 },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadedText: { fontSize: 14, fontWeight: '600' as const },
  bankCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  bankCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bankCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bankCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  bankCardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  bankFieldGroup: {
    marginBottom: 14,
  },
  bankFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bankFieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ibanHint: {
    fontSize: 11,
    marginTop: 4,
  },
  cityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityText: { flex: 1, fontSize: 14 },
  cityList: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  cityScroll: {},
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  cityItemText: { fontSize: 14 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: { fontSize: 14 },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  registerBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
});
