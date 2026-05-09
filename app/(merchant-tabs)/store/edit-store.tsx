import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  MapPinned,
  Store,
  Phone,
  Mail,
  ImagePlus,
  User,
  FileText,
  Landmark,
  CreditCard,
  Upload,
  IdCard,
  Building2,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';
import MapPickerModal from '@/components/MapPickerModal';
import type { LocationCoords } from '@/utils/location';
import { reverseGeocodeToAddress } from '@/utils/location';
import { saudiCities } from '@/mocks/cities';
import { SAUDI_BANKS, OTHER_BANK_KEY, OTHER_BANK_LABEL } from '@/constants/banks';
import { EntityType } from '@/types';

export default function EditStoreScreen() {
  const { colors, t, storeInfo, updateStoreInfo, isRTL, language, isFirebaseConfigured } = useApp();
  const router = useRouter();

  const [storeName, setStoreName] = useState(storeInfo?.name ?? '');
  const [username, setUsername] = useState(storeInfo?.username ?? '');
  const [city, setCity] = useState(storeInfo?.city ?? '');
  const [locationAddress, setLocationAddress] = useState(storeInfo?.locationAddress ?? '');
  const [description, setDescription] = useState(storeInfo?.description ?? '');
  const [phone, setPhone] = useState(storeInfo?.phone ?? '');
  const [email, setEmail] = useState(storeInfo?.email ?? '');
  const initBankKey = (() => {
    const bn = storeInfo?.bankName ?? '';
    if (!bn) return '';
    if (SAUDI_BANKS.includes(bn)) return bn;
    return bn ? OTHER_BANK_KEY : '';
  })();
  const [selectedBankKey, setSelectedBankKey] = useState(initBankKey);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [customBankName, setCustomBankName] = useState(initBankKey === OTHER_BANK_KEY ? (storeInfo?.bankName ?? '') : '');
  const [iban, setIban] = useState(storeInfo?.iban ?? '');
  const [beneficiaryName, setBeneficiaryName] = useState(storeInfo?.beneficiaryName ?? '');
  const resolvedBankName = selectedBankKey === OTHER_BANK_KEY ? customBankName : selectedBankKey;
  const [storeImage, setStoreImage] = useState(storeInfo?.storeImage ?? '');
  const [bannerImage, setBannerImage] = useState(storeInfo?.bannerImage ?? '');
  const [storeCoords, setStoreCoords] = useState<LocationCoords | null>(
    storeInfo?.latitude != null && storeInfo?.longitude != null
      ? { latitude: storeInfo.latitude, longitude: storeInfo.longitude }
      : null
  );
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'success', message: '' });
  /** يمنع إعادة فرض مدينة قديمة من storeInfo بعد أن يختار التاجر موقعاً من الخريطة */
  const cityLockedFromMapRef = useRef(false);

  useEffect(() => {
    if (storeInfo?.latitude != null && storeInfo?.longitude != null) {
      setStoreCoords({ latitude: storeInfo.latitude, longitude: storeInfo.longitude });
    }
  }, [storeInfo?.latitude, storeInfo?.longitude]);

  useEffect(() => {
    if (storeInfo?.locationAddress != null) {
      setLocationAddress(storeInfo.locationAddress);
    }
  }, [storeInfo?.locationAddress]);

  useEffect(() => {
    if (storeInfo?.city != null) setCity(storeInfo.city);
  }, [storeInfo?.city]);
  const dismissAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const [entityType, setEntityType] = useState<EntityType>(storeInfo?.entityType ?? 'individual');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [nationalIdUri, setNationalIdUri] = useState(storeInfo?.nationalIdUri ?? '');
  const [freelanceDocUri, setFreelanceDocUri] = useState(storeInfo?.freelanceDocUri ?? '');
  const [freelanceDocNumber, setFreelanceDocNumber] = useState(storeInfo?.freelanceDocNumber ?? '');
  const [commercialRegNumber, setCommercialRegNumber] = useState(storeInfo?.commercialRegNumber ?? '');
  const [commercialRegUri, setCommercialRegUri] = useState(storeInfo?.commercialRegUri ?? '');

  const [isSaving, setIsSaving] = useState(false);

  const entityTypes: { key: EntityType; label: string }[] = [
    { key: 'individual', label: language === 'ar' ? 'فرد / عمل حر' : 'Individual / Freelance' },
    { key: 'institution', label: language === 'ar' ? 'مؤسسة' : 'Institution' },
    { key: 'company', label: language === 'ar' ? 'شركة' : 'Company' },
  ];

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setStoreImage(result.assets[0].uri);
      }
    } catch (e) {
      void e;
    }
  };

  const pickBannerImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setBannerImage(result.assets[0].uri);
      }
    } catch (e) {
      void e;
    }
  };

  const pickDocImage = useCallback(async (setter: (uri: string) => void) => {
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

  const performSave = async () => {
    const docFields: Record<string, any> = {};
    if (entityType === 'individual') {
      docFields.nationalIdUri = nationalIdUri;
      docFields.freelanceDocUri = freelanceDocUri;
      docFields.freelanceDocNumber = freelanceDocNumber;
    } else {
      docFields.commercialRegNumber = commercialRegNumber;
      docFields.commercialRegUri = commercialRegUri;
    }
    const cityId =
      saudiCities.find((c) => c.nameAr === city || c.nameEn === city)?.id ||
      storeInfo?.cityId;

    if (isFirebaseConfigured()) {
      if (
        storeCoords == null ||
        typeof storeCoords.latitude !== 'number' ||
        typeof storeCoords.longitude !== 'number' ||
        Number.isNaN(storeCoords.latitude) ||
        Number.isNaN(storeCoords.longitude)
      ) {
        setAlertConfig({
          visible: true,
          type: 'error',
          message:
            language === 'ar'
              ? 'حدد موقع المتجر من الخريطة لحفظ الإحداثيات وظهورك للعملاء في الفلترة والبحث'
              : 'Pick your store on the map to save coordinates for customer search and filters',
        });
        return;
      }
    }

    const lat =
      storeCoords != null && typeof storeCoords.latitude === 'number' ? storeCoords.latitude : undefined;
    const lng =
      storeCoords != null && typeof storeCoords.longitude === 'number' ? storeCoords.longitude : undefined;

    await updateStoreInfo({
      name: storeName,
      username,
      entityType,
      city,
      cityId,
      latitude: lat,
      longitude: lng,
      locationAddress: locationAddress.trim() || undefined,
      description,
      phone,
      email,
      website: '',
      bankName: resolvedBankName || undefined,
      iban: iban || undefined,
      beneficiaryName: beneficiaryName || undefined,
      storeImage,
      bannerImage,
      ...docFields,
    });
    setAlertConfig({ visible: true, type: 'success', message: t('savedSuccessfully') });
    router.back();
  };

  const handleSave = async () => {
    if (iban && !/^SA\d{22}$/.test(iban.trim())) {
      setAlertConfig({
        visible: true,
        type: 'error',
        message: language === 'ar' ? 'رقم الآيبان يجب أن يبدأ بـ SA ويتكون من 24 حرف' : 'IBAN must start with SA and be 24 characters',
      });
      return;
    }
    setIsSaving(true);
    try {
      await performSave();
    } catch {
      setAlertConfig({
        visible: true,
        type: 'error',
        message: language === 'ar' ? 'تعذر حفظ البيانات' : 'Could not save changes',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMapCitySelect = useCallback(
    async (cityName: string, coords?: LocationCoords, displayLabel?: string | null) => {
      cityLockedFromMapRef.current = true;
      const matched = saudiCities.find((c) => c.nameAr === cityName || c.nameEn === cityName);
      setCity(matched ? matched.nameAr : cityName);
      if (coords) {
        setStoreCoords(coords);
        const langUi = language === 'ar' ? 'ar' : 'he';
        let addr = displayLabel?.trim() || '';
        if (!addr) {
          try {
            addr = await reverseGeocodeToAddress(coords, langUi);
          } catch {
            addr = '';
          }
        }
        setLocationAddress((displayLabel?.trim() || addr).trim());
      }
    },
    [language]
  );

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    icon: React.ReactNode,
    options?: { multiline?: boolean; keyboardType?: any; textAlign?: 'left' | 'right'; placeholder?: string }
  ) => (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldIconWrap, { backgroundColor: colors.primaryLight }]}>
        {icon}
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        <TextInput
          style={[
            options?.multiline ? styles.fieldInputMulti : styles.fieldInput,
            { color: colors.text, backgroundColor: colors.inputBg },
          ]}
          value={value}
          onChangeText={onChange}
          multiline={options?.multiline}
          keyboardType={options?.keyboardType}
          textAlign={options?.textAlign ?? (isRTL ? 'right' : 'left')}
          placeholder={options?.placeholder}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('editStore')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mediaSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.7}>
            {storeImage ? (
              <Image source={{ uri: storeImage }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                <Store size={32} color={colors.primary} />
              </View>
            )}
            <View style={[styles.cameraBtn, { backgroundColor: colors.primary }]}>
              <Camera size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bannerWrap, { backgroundColor: colors.card }]}
            onPress={pickBannerImage}
            activeOpacity={0.7}
          >
            {bannerImage ? (
              <Image source={{ uri: bannerImage }} style={styles.bannerImage} contentFit="cover" />
            ) : (
              <View style={[styles.bannerPlaceholder, { borderColor: colors.borderLight }]}>
                <ImagePlus size={24} color={colors.textMuted} />
                <Text style={[styles.bannerText, { color: colors.textMuted }]}>
                  {language === 'ar' ? 'بنر المتجر' : 'Store Banner'}
                </Text>
              </View>
            )}
            <View style={[styles.bannerCameraBtn, { backgroundColor: colors.primary }]}>
              <Camera size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'ar' ? 'معلومات المتجر' : 'Store Information'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {renderField(t('storeName'), storeName, setStoreName, <Store size={16} color={colors.primary} />)}
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          {renderField(t('username'), username, setUsername, <User size={16} color={colors.primary} />, { textAlign: 'left' })}
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: colors.primaryLight }]}>
              <MapPinned size={16} color={colors.primary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('storeCity')}</Text>
              <TouchableOpacity
                style={[styles.cityBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setShowMapPicker(true)}
              >
                <MapPinned size={16} color={colors.primary} />
                <View style={styles.cityTextCol}>
                  <Text style={[styles.cityNameText, { color: colors.text }]} numberOfLines={2}>
                    {city.trim() ||
                      (language === 'ar' ? 'اضغط لتحديد المدينة على الخريطة' : 'Tap map to set city')}
                  </Text>
                  {locationAddress.trim() ? (
                    <Text style={[styles.cityAddressSub, { color: colors.textSecondary }]} numberOfLines={2}>
                      {locationAddress.trim()}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          {renderField(t('storeDescription'), description, setDescription, <FileText size={16} color={colors.primary} />, { multiline: true })}
        </View>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'ar' ? 'التواصل' : 'Contact'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {renderField(t('storePhone'), phone, setPhone, <Phone size={16} color={colors.primary} />, { keyboardType: 'phone-pad', textAlign: 'left' })}
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          {renderField(t('storeEmail'), email, setEmail, <Mail size={16} color={colors.primary} />, { keyboardType: 'email-address', textAlign: 'left' })}
        </View>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('bankDetails')}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.bankCardHeader}>
            <View style={styles.bankCardTitleRow}>
              <Landmark size={20} color={colors.primary} />
              <Text style={[styles.bankCardTitle, { color: colors.text }]}>
                {language === 'ar' ? 'بيانات المحفظة البنكية' : 'Bank Details'}
              </Text>
            </View>
            <Text style={[styles.bankCardSubtitle, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'أدخل بياناتك البنكية لاستلام أرباحك عند طلب السحب' : 'Enter bank details for payouts'}
            </Text>
          </View>

          <View style={styles.bankFieldGroup}>
            <View style={styles.bankFieldLabelRow}>
              <Landmark size={16} color={colors.textSecondary} />
              <Text style={[styles.bankFieldLabel, { color: colors.text }]}>
                {language === 'ar' ? 'اسم البنك' : 'Bank Name'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.bankDropdownBtn, { backgroundColor: colors.inputBg, borderColor: selectedBankKey ? colors.primary : colors.borderLight }]}
              onPress={() => setShowBankDropdown(!showBankDropdown)}
            >
              <ChevronDown size={18} color={colors.textSecondary} />
              <Text style={[styles.bankDropdownBtnText, { color: selectedBankKey ? colors.text : colors.textMuted }]}>
                {selectedBankKey
                  ? (selectedBankKey === OTHER_BANK_KEY ? OTHER_BANK_LABEL : selectedBankKey)
                  : (language === 'ar' ? 'اختر البنك' : 'Select bank')}
              </Text>
            </TouchableOpacity>
            {showBankDropdown && (
              <ScrollView style={[styles.bankDropdownList, { backgroundColor: colors.card, borderColor: colors.borderLight }]} nestedScrollEnabled>
                {SAUDI_BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[styles.bankDropdownItem, selectedBankKey === bank && { backgroundColor: colors.primaryLight }]}
                    onPress={() => { setSelectedBankKey(bank); setShowBankDropdown(false); }}
                  >
                    <Text style={[styles.bankDropdownItemText, { color: selectedBankKey === bank ? colors.primary : colors.text }]}>
                      {bank}
                    </Text>
                    {selectedBankKey === bank && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.bankDropdownItem, selectedBankKey === OTHER_BANK_KEY && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setSelectedBankKey(OTHER_BANK_KEY); setShowBankDropdown(false); }}
                >
                  <Text style={[styles.bankDropdownItemText, { color: selectedBankKey === OTHER_BANK_KEY ? colors.primary : colors.text }]}>
                    {OTHER_BANK_LABEL}
                  </Text>
                  {selectedBankKey === OTHER_BANK_KEY && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              </ScrollView>
            )}
            {selectedBankKey === OTHER_BANK_KEY && (
              <TextInput
                style={[styles.bankCustomInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.primary }]}
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
              style={[styles.bankCustomInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.borderLight }]}
              placeholder="SA0000000000000000000000"
              placeholderTextColor={colors.textMuted}
              value={iban}
              onChangeText={setIban}
              textAlign="left"
              autoCapitalize="characters"
              maxLength={24}
            />
            <Text style={[styles.ibanHint, { color: colors.textMuted }]}>
              {language === 'ar' ? 'رقم الآيبان السعودي يتكون من 24 حرف ورقم' : 'Saudi IBAN is 24 characters'}
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
              style={[styles.bankCustomInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.borderLight }]}
              placeholder={language === 'ar' ? 'اسم صاحب الحساب' : 'Account holder name'}
              placeholderTextColor={colors.textMuted}
              value={beneficiaryName}
              onChangeText={setBeneficiaryName}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'ar' ? 'مستندات المتجر' : 'Store Documents'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.docHeaderRow}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.docSectionLabel, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'نوع الكيان' : 'Entity Type'}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 14, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.entityDropdownBtn, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}
              onPress={() => setShowEntityDropdown(!showEntityDropdown)}
            >
              <ChevronDown size={18} color={colors.textSecondary} />
              <Text style={[styles.entityDropdownBtnText, { color: colors.text }]}>
                {entityTypes.find(e => e.key === entityType)?.label}
              </Text>
            </TouchableOpacity>
            {showEntityDropdown && (
              <View style={[styles.entityDropdownList, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                {entityTypes.map((et) => (
                  <TouchableOpacity
                    key={et.key}
                    style={[styles.entityDropdownItem, entityType === et.key && { backgroundColor: colors.primaryLight }]}
                    onPress={() => { setEntityType(et.key); setShowEntityDropdown(false); }}
                  >
                    <Text style={[styles.entityDropdownItemText, { color: entityType === et.key ? colors.primary : colors.text }]}>
                      {et.label}
                    </Text>
                    {entityType === et.key && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {entityType === 'individual' ? (
            <>
              <View style={[styles.docSubCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.docSubCardTitle, { color: colors.text }]}>
                  {language === 'ar' ? 'مستندات العمل الحر' : 'Freelance Documents'}
                </Text>
                <View style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'رقم وثيقة العمل الحر' : 'Freelance Doc Number'}
                    </Text>
                    <TextInput
                      style={[styles.docInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                      value={freelanceDocNumber}
                      onChangeText={setFreelanceDocNumber}
                      placeholder={language === 'ar' ? 'رقم الوثيقة' : 'Document number'}
                      placeholderTextColor={colors.textMuted}
                      textAlign={isRTL ? 'right' : 'left'}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.docIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <FileText size={16} color={colors.primary} />
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'الهوية الوطنية' : 'National ID'}
                    </Text>
                    {nationalIdUri ? (
                      <View style={styles.docPreviewRow}>
                        <Image source={{ uri: nationalIdUri }} style={styles.docThumb} contentFit="cover" />
                        <Text style={[styles.docFileName, { color: colors.success }]} numberOfLines={1}>
                          {language === 'ar' ? 'تم الرفع ✓' : 'Uploaded ✓'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.docFileName, { color: colors.textMuted }]}>
                        {language === 'ar' ? 'لم يتم الرفع' : 'Not uploaded'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.docUploadBtn, { backgroundColor: colors.primary }]}
                    onPress={() => pickDocImage(setNationalIdUri)}
                    activeOpacity={0.7}
                  >
                    <Upload size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'وثيقة العمل الحر' : 'Freelance Document'}
                    </Text>
                    {freelanceDocUri ? (
                      <View style={styles.docPreviewRow}>
                        <Image source={{ uri: freelanceDocUri }} style={styles.docThumb} contentFit="cover" />
                        <Text style={[styles.docFileName, { color: colors.success }]} numberOfLines={1}>
                          {language === 'ar' ? 'تم الرفع ✓' : 'Uploaded ✓'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.docFileName, { color: colors.textMuted }]}>
                        {language === 'ar' ? 'لم يتم الرفع' : 'Not uploaded'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.docUploadBtn, { backgroundColor: colors.primary }]}
                    onPress={() => pickDocImage(setFreelanceDocUri)}
                    activeOpacity={0.7}
                  >
                    <Upload size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.docSubCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.docSubCardTitle, { color: colors.text }]}>
                  {entityType === 'institution'
                    ? (language === 'ar' ? 'مستندات المؤسسة' : 'Institution Documents')
                    : (language === 'ar' ? 'مستندات الشركة' : 'Company Documents')}
                </Text>
                <View style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'رقم السجل التجاري' : 'Commercial Reg. Number'}
                    </Text>
                    <TextInput
                      style={[styles.docInput, { color: colors.text, backgroundColor: colors.inputBg }]}
                      value={commercialRegNumber}
                      onChangeText={setCommercialRegNumber}
                      placeholder={language === 'ar' ? 'أدخل رقم السجل التجاري' : 'Enter registration number'}
                      placeholderTextColor={colors.textMuted}
                      textAlign={isRTL ? 'right' : 'left'}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.docIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <FileText size={16} color={colors.primary} />
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.docRow}>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docLabel, { color: colors.textSecondary }]}>
                      {language === 'ar' ? 'مستند السجل التجاري' : 'Commercial Reg. Document'}
                    </Text>
                    {commercialRegUri ? (
                      <View style={styles.docPreviewRow}>
                        <Image source={{ uri: commercialRegUri }} style={styles.docThumb} contentFit="cover" />
                        <Text style={[styles.docFileName, { color: colors.success }]} numberOfLines={1}>
                          {language === 'ar' ? 'تم الرفع ✓' : 'Uploaded ✓'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.docFileName, { color: colors.textMuted }]}>
                        {language === 'ar' ? 'لم يتم الرفع' : 'Not uploaded'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.docUploadBtn, { backgroundColor: colors.primary }]}
                    onPress={() => pickDocImage(setCommercialRegUri)}
                    activeOpacity={0.7}
                  >
                    <Upload size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            {isSaving
              ? language === 'ar'
                ? 'جاري الحفظ...'
                : 'Saving...'
              : t('save')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectCity={handleMapCitySelect}
        title={language === 'ar' ? 'اختر مدينة المتجر' : 'Select store city'}
      />
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
  mediaSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
    marginTop: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: 130,
  },
  bannerPlaceholder: {
    height: 110,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bannerText: { fontSize: 12, fontWeight: '500' as const },
  bannerCameraBtn: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  sectionLine: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.04)',
    elevation: 1,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  fieldContent: {
    flex: 1,
  },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  fieldInputMulti: {
    fontSize: 14,
    fontWeight: '500' as const,
    minHeight: 60,
    textAlignVertical: 'top',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  cityTextCol: { flex: 1, gap: 4 },
  cityNameText: { fontSize: 15, fontWeight: '700' as const },
  cityAddressSub: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17 },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  socialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' as const },
  bankCardHeader: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
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
    marginTop: 2,
  },
  bankFieldGroup: {
    paddingHorizontal: 14,
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
  bankDropdownBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  bankDropdownBtnText: { flex: 1, fontSize: 14 },
  bankDropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 250,
    overflow: 'hidden',
  },
  bankDropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankDropdownItemText: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  bankCustomInput: {
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  ibanHint: {
    fontSize: 11,
    marginTop: 4,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  docSectionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  entityDropdownBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  entityDropdownBtnText: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  entityDropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  entityDropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entityDropdownItemText: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  docSubCard: {
    borderRadius: 14,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 14,
  },
  docSubCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 14,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  docPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  docFileName: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  docUploadBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  docInput: {
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  docHintRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  docHintText: {
    fontSize: 11,
    lineHeight: 18,
  },
});
