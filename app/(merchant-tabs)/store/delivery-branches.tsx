import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ArrowLeft,
  Truck,
  PackageCheck,
  MapPinned,
  Calendar,
  Clock,
  Plus,
  X,
  Building2,
  Link2,
  CircleDollarSign,
  Type,
  Languages,
  Save,
  Trash2,
  ChevronDown,
  Pencil,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { DeliveryOption, Branch } from '@/types';
import { saudiCities } from '@/mocks/cities';
import {
  getMerchantDeliveryOptions,
  getMerchantBranches,
  getMerchantProfile,
  saveDeliveryOption,
  saveBranch,
  updateDeliveryOption,
  updateBranch,
  deleteDeliveryOption as deleteDeliveryOptionFirestore,
  deleteBranch as deleteBranchFirestore,
  getCurrentMerchantId,
  updateMerchantFulfillmentFlags,
} from '@/services/merchantFirestore';
import { isFirebaseConfigured } from '@/services/firebase';
import { formatDeliveryPeriodLabel } from '@/utils/delivery';
import { MerchantSchedulePickerButton } from '@/components/MerchantSchedulePickerButton';
import MapPickerModal from '@/components/MapPickerModal';
import { reverseGeocodeToAddress, type LocationCoords } from '@/utils/location';

const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

const BRANCH_WORK_DAY_AR: Record<(typeof DAYS)[number], string> = {
  sat: 'السبت',
  sun: 'الأحد',
  mon: 'الاثنين',
  tue: 'الثلاثاء',
  wed: 'الأربعاء',
  thu: 'الخميس',
  fri: 'الجمعة',
};

const BRANCH_WORK_DAY_EN: Record<(typeof DAYS)[number], string> = {
  sat: 'Sat',
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
};

function parseBranchWorkDaysString(
  workDaysStr: string,
  tDay: (key: string) => string
): string[] {
  const s = workDaysStr.trim();
  if (!s) return [];
  if (s.includes('يومياً') || s.toLowerCase() === 'daily') return [...DAYS];
  const segments = s.split(/\s*[-·،,]\s*/).map((x) => x.trim()).filter(Boolean);
  const out: string[] = [];
  for (const seg of segments) {
    for (const day of DAYS) {
      if (
        seg === tDay(day) ||
        seg === BRANCH_WORK_DAY_AR[day] ||
        seg === BRANCH_WORK_DAY_EN[day]
      ) {
        if (!out.includes(day)) out.push(day);
        break;
      }
    }
  }
  return out;
}

export default function DeliveryBranchesScreen() {
  const { colors, t, language, isRTL, storeInfo, user, userLocation } = useApp();
  const router = useRouter();
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [deliveryOptionsList, setDeliveryOptionsList] = useState<DeliveryOption[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);

  useEffect(() => {
    (async () => {
      if (!isFirebaseConfigured()) return;
      const mid = await getCurrentMerchantId(user?.id);
      if (!mid) return;
      const [opts, brs, profile] = await Promise.all([
        getMerchantDeliveryOptions(mid),
        getMerchantBranches(mid),
        getMerchantProfile(mid),
      ]);
      if (opts.length > 0) setDeliveryOptionsList(opts);
      if (brs.length > 0) setBranchesList(brs);
      if (profile) {
        setDeliveryEnabled(profile.deliveryEnabled !== false);
        setPickupEnabled(profile.pickupEnabled !== false);
      }
    })();
  }, [user]);
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editingDeliveryOptionId, setEditingDeliveryOptionId] = useState<string | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [showMapCityPicker, setShowMapCityPicker] = useState(false);
  const [cityPickerTarget, setCityPickerTarget] = useState<'delivery' | 'branch'>('delivery');
  /** يُحدَّث مع كل فتح للخريطة حتى لا يُطبَّق التأكيد على نموذج خاطئ بعد await */
  const cityPickerTargetRef = useRef<'delivery' | 'branch'>('delivery');
  /** إعادة فتح نموذج التوصيل/الفرع بعد الخريطة — مودال فوق مودال لا يعمل بشكل موثوق على iOS/Android */
  const mapPickerReturnToRef = useRef<'delivery' | 'branch' | null>(null);

  const [newOptionNameAr, setNewOptionNameAr] = useState('');
  const [newOptionNameEn, setNewOptionNameEn] = useState('');
  const [newOptionCity, setNewOptionCity] = useState(storeInfo?.city || '');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [newOptionRange, setNewOptionRange] = useState('25');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [periods, setPeriods] = useState<{ from: string; to: string }[]>([{ from: '', to: '' }]);

  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState(storeInfo?.city || '');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchGoogleLink, setBranchGoogleLink] = useState('');
  const [branchSelectedDays, setBranchSelectedDays] = useState<string[]>([]);
  const [branchFromHour, setBranchFromHour] = useState('');
  const [branchToHour, setBranchToHour] = useState('');

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleBranchDay = (day: string) => {
    setBranchSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const addPeriod = () => {
    setPeriods((prev) => [...prev, { from: '', to: '' }]);
  };

  const removePeriod = (index: number) => {
    setPeriods(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const updatePeriod = (index: number, field: 'from' | 'to', value: string) => {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const toggleDeliveryOption = async (id: string) => {
    const opt = deliveryOptionsList.find((o) => o.id === id);
    if (!opt) return;
    const next = { ...opt, isActive: !opt.isActive };
    setDeliveryOptionsList((prev) => prev.map((o) => (o.id === id ? next : o)));
    try {
      const mid = await getCurrentMerchantId(user?.id);
      if (mid && isFirebaseConfigured()) await updateDeliveryOption(id, mid, next);
    } catch (e) {
      console.warn('[delivery] toggle save', e);
      setDeliveryOptionsList((prev) => prev.map((o) => (o.id === id ? opt : o)));
    }
  };

  const toggleBranch = async (id: string) => {
    const br = branchesList.find((b) => b.id === id);
    if (!br) return;
    const next = { ...br, isActive: !br.isActive };
    setBranchesList((prev) => prev.map((b) => (b.id === id ? next : b)));
    try {
      const mid = await getCurrentMerchantId(user?.id);
      if (mid && isFirebaseConfigured()) await updateBranch(id, mid, next);
    } catch (e) {
      console.warn('[branch] toggle save', e);
      setBranchesList((prev) => prev.map((b) => (b.id === id ? br : b)));
    }
  };

  const deliveryFormValid =
    newOptionNameAr.trim().length > 0 &&
    newOptionCity.trim().length > 0 &&
    newOptionPrice.trim().length > 0 &&
    selectedDays.length > 0 &&
    periods.some((p) => p.from.trim() && p.to.trim());

  const closeDeliveryModal = () => {
    setShowAddDelivery(false);
    setEditingDeliveryOptionId(null);
    resetDeliveryForm();
  };

  const handleSaveDeliveryOption = async () => {
    if (!deliveryFormValid) return;
    const validPeriods = periods
      .map((p) => ({ from: p.from.trim(), to: p.to.trim() }))
      .filter((p) => p.from && p.to);
    const existing = editingDeliveryOptionId
      ? deliveryOptionsList.find((o) => o.id === editingDeliveryOptionId)
      : undefined;
    const option: DeliveryOption = {
      id: editingDeliveryOptionId || Date.now().toString(),
      name: newOptionNameAr.trim(),
      nameEn: newOptionNameEn.trim() || newOptionNameAr.trim(),
      price: parseFloat(newOptionPrice) || 0,
      range: parseInt(newOptionRange, 10) || 25,
      workDays: selectedDays,
      periods: validPeriods,
      isActive: existing?.isActive ?? true,
      city: newOptionCity.trim(),
    };
    try {
      if (isFirebaseConfigured()) {
        const mid = await getCurrentMerchantId(user?.id);
        if (mid) {
          if (editingDeliveryOptionId) {
            await updateDeliveryOption(editingDeliveryOptionId, mid, option);
            option.id = editingDeliveryOptionId;
          } else {
            const firestoreId = await saveDeliveryOption(mid, option);
            option.id = firestoreId;
          }
        }
      }
    } catch (e) {
      console.warn('[delivery] save error:', e);
    }
    if (editingDeliveryOptionId) {
      setDeliveryOptionsList((prev) =>
        prev.map((o) => (o.id === editingDeliveryOptionId ? { ...option, id: editingDeliveryOptionId } : o))
      );
    } else {
      setDeliveryOptionsList((prev) => [...prev, option]);
    }
    setShowAddDelivery(false);
    setEditingDeliveryOptionId(null);
    resetDeliveryForm();
  };

  const resetDeliveryForm = () => {
    setNewOptionNameAr('');
    setNewOptionNameEn('');
    setNewOptionCity('');
    setNewOptionPrice('');
    setNewOptionRange('25');
    setSelectedDays([]);
    setPeriods([{ from: '', to: '' }]);
  };

  const closeBranchModal = () => {
    setShowAddBranch(false);
    setEditingBranchId(null);
    resetBranchForm();
  };

  const handleSaveBranch = async () => {
    if (!branchName.trim()) return;
    const workDaysStr =
      branchSelectedDays.length === 7
        ? language === 'ar'
          ? 'يومياً'
          : 'Daily'
        : branchSelectedDays.map((d) => t(d)).join(' - ');
    const existing = editingBranchId ? branchesList.find((b) => b.id === editingBranchId) : undefined;
    const newBranch: Branch = {
      id: editingBranchId || Date.now().toString(),
      name: branchName.trim(),
      nameEn: branchName.trim(),
      address: branchAddress,
      city: branchCity,
      googleMapsLink: branchGoogleLink,
      workDays: workDaysStr,
      workHours: `${branchFromHour} - ${branchToHour}`,
      isActive: existing?.isActive ?? true,
    };
    try {
      if (isFirebaseConfigured()) {
        const mid = await getCurrentMerchantId(user?.id);
        if (mid) {
          if (editingBranchId) {
            await updateBranch(editingBranchId, mid, newBranch);
          } else {
            const firestoreId = await saveBranch(mid, newBranch);
            newBranch.id = firestoreId;
          }
        }
      }
    } catch (e) {
      console.warn('[branch] save error:', e);
    }
    if (editingBranchId) {
      setBranchesList((prev) =>
        prev.map((b) => (b.id === editingBranchId ? { ...newBranch, id: editingBranchId } : b))
      );
    } else {
      setBranchesList((prev) => [...prev, newBranch]);
    }
    setShowAddBranch(false);
    setEditingBranchId(null);
    resetBranchForm();
  };

  const resetBranchForm = () => {
    setBranchName('');
    setBranchCity(storeInfo?.city || '');
    setBranchAddress('');
    setBranchGoogleLink('');
    setBranchSelectedDays([]);
    setBranchFromHour('');
    setBranchToHour('');
  };

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'option' | 'branch'; id: string; name: string } | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (isFirebaseConfigured()) {
        if (deleteTarget.type === 'option') {
          await deleteDeliveryOptionFirestore(deleteTarget.id);
        } else {
          await deleteBranchFirestore(deleteTarget.id);
        }
      }
    } catch (e) { console.warn('[delete] error:', e); }
    if (deleteTarget.type === 'option') {
      setDeliveryOptionsList(prev => prev.filter(o => o.id !== deleteTarget.id));
    } else {
      setBranchesList(prev => prev.filter(b => b.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const openCityPickerForDelivery = useCallback(() => {
    cityPickerTargetRef.current = 'delivery';
    setCityPickerTarget('delivery');
    if (showAddDelivery) {
      mapPickerReturnToRef.current = 'delivery';
      setShowAddDelivery(false);
      setTimeout(() => setShowMapCityPicker(true), 150);
    } else {
      mapPickerReturnToRef.current = null;
      setShowMapCityPicker(true);
    }
  }, [showAddDelivery]);

  const openCityPickerForBranch = useCallback(() => {
    cityPickerTargetRef.current = 'branch';
    setCityPickerTarget('branch');
    if (showAddBranch) {
      mapPickerReturnToRef.current = 'branch';
      setShowAddBranch(false);
      setTimeout(() => setShowMapCityPicker(true), 150);
    } else {
      mapPickerReturnToRef.current = null;
      setShowMapCityPicker(true);
    }
  }, [showAddBranch]);

  const finishMapCityPickerFlow = useCallback(() => {
    setShowMapCityPicker(false);
    const r = mapPickerReturnToRef.current;
    mapPickerReturnToRef.current = null;
    if (r === 'branch') setShowAddBranch(true);
    if (r === 'delivery') setShowAddDelivery(true);
  }, []);

  const mapPickerInitialCoords = useMemo((): LocationCoords | null => {
    const name = cityPickerTarget === 'delivery' ? newOptionCity.trim() : branchCity.trim();
    if (name) {
      const row = saudiCities.find((c) => c.nameAr === name || c.nameEn === name);
      if (row) return { latitude: row.lat, longitude: row.lng };
    }
    return userLocation;
  }, [cityPickerTarget, newOptionCity, branchCity, userLocation]);

  const mapPickerTitle = useMemo(() => {
    if (cityPickerTarget === 'delivery') {
      return language === 'ar' ? 'اختر مدينة التوصيل' : 'Choose delivery city';
    }
    return language === 'ar' ? 'اختر مدينة الفرع' : 'Choose branch city';
  }, [cityPickerTarget, language]);

  const handleMapCitySelect = useCallback(
    async (cityName: string, coords?: LocationCoords | null, displayLabel?: string | null) => {
      let final = (displayLabel || cityName || '').trim();
      if (!final && coords) {
        try {
          const langUi = language === 'ar' ? 'ar' : 'he';
          final = (await reverseGeocodeToAddress(coords, langUi))?.replace(/\s+/g, ' ').trim() || '';
        } catch (e) {
          console.warn('[delivery-branches] reverse geocode', e);
        }
      }
      if (!final && coords) {
        final = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      }
      if (cityPickerTargetRef.current === 'delivery') setNewOptionCity(final);
      else setBranchCity(final);
    },
    [language]
  );

  const schedulePickerColors = useMemo(
    () => ({
      text: colors.text,
      textMuted: colors.textMuted,
      textSecondary: colors.textSecondary,
      card: colors.card,
      border: colors.border,
      primary: colors.primary,
      background: colors.background,
    }),
    [colors]
  );

  const langUi = language === 'ar' ? 'ar' : 'he';

  const renderScheduleFromTo = (
    mode: 'datetime' | 'time',
    fromValue: string,
    toValue: string,
    setFrom: (v: string) => void,
    setTo: (v: string) => void
  ) => (
    <View style={styles.workHoursInline}>
      <MerchantSchedulePickerButton
        label={language === 'ar' ? 'من' : 'From'}
        mode={mode}
        value={fromValue}
        onChange={setFrom}
        language={langUi}
        isRTL={isRTL}
        colors={schedulePickerColors}
        parseDefaults={{ hour: 9, minute: 0 }}
      />
      <Text style={[styles.workHourDash, { color: colors.textMuted }]}>—</Text>
      <MerchantSchedulePickerButton
        label={language === 'ar' ? 'إلى' : 'To'}
        mode={mode}
        value={toValue}
        onChange={setTo}
        language={langUi}
        isRTL={isRTL}
        colors={schedulePickerColors}
        parseDefaults={{ hour: 21, minute: 0 }}
      />
    </View>
  );

  const renderFieldRow = (icon: React.ReactNode, label: string, children: React.ReactNode) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldInput, { backgroundColor: colors.inputBg }]}>
        <View style={[styles.fieldIconWrap, { backgroundColor: colors.borderLight }]}>
          {icon}
        </View>
        <View style={styles.fieldInputInner}>
          {children}
        </View>
      </View>
    </View>
  );

  const renderDayChipSelector = (selected: string[], onDayPress: (day: string) => void) => (
    <View style={styles.dayChipsWrap}>
      {DAYS.map((day) => {
        const isSelected = selected.includes(day);
        return (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayChip,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onDayPress(day)}
            activeOpacity={0.75}
          >
            <Text style={[styles.dayChipText, { color: isSelected ? '#FFF' : colors.text }]} numberOfLines={1}>
              {t(day)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('deliveryBranches')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderWidth: 1 }]}>
          <View style={[styles.toggleItem, { borderBottomColor: colors.borderLight, borderBottomWidth: 1 }]}>
            <View style={[styles.toggleIcon, { backgroundColor: '#3B82F612' }]}>
              <Truck size={20} color="#3B82F6" />
            </View>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>{t('enableDelivery')}</Text>
              <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                {language === 'ar' ? 'تفعيل خدمة التوصيل للعملاء' : 'Enable delivery service'}
              </Text>
            </View>
            <Switch
              value={deliveryEnabled}
              onValueChange={async (v) => {
                setDeliveryEnabled(v);
                try {
                  const mid = await getCurrentMerchantId(user?.id);
                  if (mid && isFirebaseConfigured()) await updateMerchantFulfillmentFlags(mid, { deliveryEnabled: v });
                } catch (e) {
                  console.warn('[delivery-branches] deliveryEnabled save', e);
                  setDeliveryEnabled(!v);
                }
              }}
              trackColor={{ false: '#E5E7EB', true: colors.success }}
              thumbColor="#FFF"
            />
          </View>
          <View style={styles.toggleItem}>
            <View style={[styles.toggleIcon, { backgroundColor: '#10B98112' }]}>
              <PackageCheck size={20} color="#10B981" />
            </View>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>{t('enablePickup')}</Text>
              <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                {language === 'ar' ? 'تفعيل الاستلام من الفرع' : 'Enable branch pickup'}
              </Text>
            </View>
            <Switch
              value={pickupEnabled}
              onValueChange={async (v) => {
                setPickupEnabled(v);
                try {
                  const mid = await getCurrentMerchantId(user?.id);
                  if (mid && isFirebaseConfigured()) await updateMerchantFulfillmentFlags(mid, { pickupEnabled: v });
                } catch (e) {
                  console.warn('[delivery-branches] pickupEnabled save', e);
                  setPickupEnabled(!v);
                }
              }}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('deliveryOptions')}</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{deliveryOptionsList.length} {language === 'ar' ? 'خيار' : 'options'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setEditingDeliveryOptionId(null);
              resetDeliveryForm();
              setNewOptionCity((prev) => (prev.trim() ? prev : storeInfo?.city || ''));
              setShowAddDelivery(true);
            }}
          >
            <Plus size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {deliveryOptionsList.map((option) => (
          <View key={option.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderWidth: 1 }]}>
            <View style={styles.itemCardHeader}>
              <View style={[styles.itemIcon, { backgroundColor: '#3B82F610' }]}>
                <Truck size={18} color="#3B82F6" />
              </View>
              <View style={styles.itemCardTitle}>
                <Text style={[styles.itemName, { color: colors.text }]}>{option.name}</Text>
                <View style={styles.itemBadgeRow}>
                  <View style={[styles.priceBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.priceBadgeText, { color: colors.primary }]}>{option.price} {t('sar')}</Text>
                  </View>
                  {option.city && (
                    <View style={[styles.cityBadge, { backgroundColor: colors.borderLight }]}>
                      <Text style={[styles.cityBadgeText, { color: colors.textSecondary }]}>{option.city}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: `${colors.primary}18` }]}
                onPress={() => {
                  setEditingDeliveryOptionId(option.id);
                  setNewOptionNameAr(option.name);
                  setNewOptionNameEn(option.nameEn || option.name);
                  setNewOptionCity(option.city);
                  setNewOptionPrice(String(option.price));
                  setNewOptionRange(String(option.range ?? 25));
                  setSelectedDays([...(option.workDays || [])]);
                  setPeriods(
                    option.periods?.length
                      ? option.periods.map((p) => ({ from: p.from, to: p.to }))
                      : [{ from: '', to: '' }]
                  );
                  setShowAddDelivery(true);
                }}
              >
                <Pencil size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: '#EF444415' }]}
                onPress={() => setDeleteTarget({ type: 'option', id: option.id, name: option.name })}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
              <Switch
                value={option.isActive}
                onValueChange={() => toggleDeliveryOption(option.id)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.itemCardBody, { borderTopColor: colors.borderLight }]}>
              <View style={styles.detailChip}>
                <Calendar size={13} color={colors.textMuted} />
                <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>
                  {option.workDays.length === 7 ? t('daily') : option.workDays.map(d => t(d)).join(' · ')}
                </Text>
              </View>
              {option.periods.map((period, i) => (
                <View key={i} style={styles.detailChip}>
                  <Clock size={13} color={colors.textMuted} />
                  <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>
                    {formatDeliveryPeriodLabel(period, langUi)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={styles.sectionTitleWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('manageBranches')}</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{branchesList.length} {language === 'ar' ? 'فرع' : 'branches'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setEditingBranchId(null);
              resetBranchForm();
              setShowAddBranch(true);
            }}
          >
            <Plus size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {branchesList.map((branch) => (
          <View key={branch.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderWidth: 1 }]}>
            <View style={styles.itemCardHeader}>
              <View style={[styles.itemIcon, { backgroundColor: '#10B98110' }]}>
                <Building2 size={18} color="#10B981" />
              </View>
              <View style={styles.itemCardTitle}>
                <Text style={[styles.itemName, { color: colors.text }]}>{branch.name}</Text>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: branch.isActive ? '#10B98120' : '#EF444420' }
                ]}>
                  <View style={[styles.statusDotInner, { backgroundColor: branch.isActive ? '#10B981' : '#EF4444' }]} />
                  <Text style={[styles.statusDotText, { color: branch.isActive ? '#10B981' : '#EF4444' }]}>
                    {branch.isActive ? t('active') : t('hidden')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: `${colors.primary}18` }]}
                onPress={() => {
                  setEditingBranchId(branch.id);
                  setBranchName(branch.name);
                  setBranchCity(branch.city);
                  setBranchAddress(branch.address);
                  setBranchGoogleLink(branch.googleMapsLink || '');
                  setBranchSelectedDays(parseBranchWorkDaysString(branch.workDays, t));
                  const wh = (branch.workHours || '').trim();
                  const dashIdx = wh.indexOf(' - ');
                  if (dashIdx >= 0) {
                    setBranchFromHour(wh.slice(0, dashIdx).trim());
                    setBranchToHour(wh.slice(dashIdx + 3).trim());
                  } else {
                    setBranchFromHour('');
                    setBranchToHour('');
                  }
                  setShowAddBranch(true);
                }}
              >
                <Pencil size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: '#EF444415' }]}
                onPress={() => setDeleteTarget({ type: 'branch', id: branch.id, name: branch.name })}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
              <Switch
                value={branch.isActive}
                onValueChange={() => toggleBranch(branch.id)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.itemCardBody, { borderTopColor: colors.borderLight }]}>
              <View style={styles.detailChip}>
                <MapPinned size={13} color={colors.textMuted} />
                <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>{branch.address}</Text>
              </View>
              <View style={styles.detailChip}>
                <Building2 size={13} color={colors.textMuted} />
                <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>{branch.city}</Text>
              </View>
              <View style={styles.detailChip}>
                <Calendar size={13} color={colors.textMuted} />
                <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>{branch.workDays}</Text>
              </View>
              <View style={styles.detailChip}>
                <Clock size={13} color={colors.textMuted} />
                <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>{branch.workHours}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showAddDelivery} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeDeliveryModal} style={[styles.modalCloseBtn, { backgroundColor: colors.borderLight }]}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('addDeliveryOption')}</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalBody}
            >
              {renderFieldRow(
                <Type size={16} color={colors.textMuted} />,
                t('optionNameAr'),
                <TextInput
                  style={[styles.fieldTextInput, { color: colors.text }]}
                  value={newOptionNameAr}
                  onChangeText={setNewOptionNameAr}
                  textAlign={isRTL ? 'right' : 'left'}
                  placeholder={language === 'ar' ? 'مثال: توصيل الرياض' : 'e.g. Riyadh Delivery'}
                  placeholderTextColor={colors.textMuted}
                />
              )}

              {renderFieldRow(
                <Languages size={16} color={colors.textMuted} />,
                t('optionNameEn'),
                <TextInput
                  style={[styles.fieldTextInput, { color: colors.text }]}
                  value={newOptionNameEn}
                  onChangeText={setNewOptionNameEn}
                  textAlign="left"
                  placeholder="e.g. Riyadh Delivery"
                  placeholderTextColor={colors.textMuted}
                />
              )}

              {renderFieldRow(
                <MapPinned size={16} color={colors.textMuted} />,
                t('city'),
                <TouchableOpacity
                  style={[styles.fieldTouchable, styles.fieldTouchableRow]}
                  onPress={openCityPickerForDelivery}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.fieldTouchableText,
                      { color: newOptionCity.trim() ? colors.text : colors.textMuted, flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {newOptionCity.trim()
                      ? newOptionCity
                      : language === 'ar'
                        ? 'اضغط لفتح الخريطة واختيار المدينة'
                        : 'Tap map to choose or change city'}
                  </Text>
                  <ChevronDown size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {renderFieldRow(
                <CircleDollarSign size={16} color={colors.textMuted} />,
                t('deliveryPrice'),
                <View style={styles.fieldInputInner}>
                  <TextInput
                    style={[styles.fieldTextInput, { color: colors.text }]}
                    value={newOptionPrice}
                    onChangeText={setNewOptionPrice}
                    keyboardType="numeric"
                    textAlign="center"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.unitText, { color: colors.textMuted }]}>{t('sar')}</Text>
                </View>
              )}

              <View style={[styles.scheduleCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.scheduleCardHeader}>
                  <Calendar size={18} color={colors.primary} />
                  <Text style={[styles.scheduleCardTitle, { color: colors.text }]}>{t('selectWorkDays')}</Text>
                </View>
                {renderDayChipSelector(selectedDays, toggleDay)}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text, fontSize: 15, fontWeight: '700' }]}>
                {t('deliveryPeriods')}
              </Text>
              <Text style={[styles.periodHint, { color: colors.textMuted }]}>{t('deliveryPeriodsTimeHint')}</Text>
              {periods.map((period, index) => (
                <View key={index} style={[styles.deliveryPeriodCard, { backgroundColor: colors.inputBg }]}>
                  {periods.length > 1 && (
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, padding: 4 }}
                      onPress={() => removePeriod(index)}
                    >
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.periodTimeSectionLabel, { color: colors.textSecondary }]}>
                    {language === 'ar' ? `فترة ${index + 1}` : `Slot ${index + 1}`}
                  </Text>
                  {renderScheduleFromTo(
                    'datetime',
                    period.from,
                    period.to,
                    (v) => updatePeriod(index, 'from', v),
                    (v) => updatePeriod(index, 'to', v)
                  )}
                </View>
              ))}
              <TouchableOpacity style={[styles.addPeriodBtn, { borderColor: colors.border }]} onPress={addPeriod}>
                <Plus size={14} color={colors.primary} />
                <Text style={[styles.addPeriodText, { color: colors.primary }]}>{t('addPeriod')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.branchSubmitBtn, { backgroundColor: deliveryFormValid ? colors.primary : colors.borderLight }]}
                onPress={handleSaveDeliveryOption}
                disabled={!deliveryFormValid}
              >
                <Save size={18} color={deliveryFormValid ? '#FFF' : colors.textMuted} />
                <Text style={[styles.branchSubmitText, { color: deliveryFormValid ? '#FFF' : colors.textMuted }]}>
                  {editingDeliveryOptionId ? t('saveChanges') : language === 'ar' ? 'إضافة خيار التوصيل' : 'Add Delivery Option'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddBranch} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeBranchModal} style={[styles.modalCloseBtn, { backgroundColor: colors.borderLight }]}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingBranchId ? t('editBranch') : t('addBranch')}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {renderFieldRow(
                <Building2 size={16} color={colors.textMuted} />,
                t('branchName'),
                <TextInput
                  style={[styles.fieldTextInput, { color: colors.text }]}
                  value={branchName}
                  onChangeText={setBranchName}
                  textAlign={isRTL ? 'right' : 'left'}
                  placeholder={language === 'ar' ? 'مثال: فرع العليا' : 'e.g. Olaya Branch'}
                  placeholderTextColor={colors.textMuted}
                />
              )}

              {renderFieldRow(
                <MapPinned size={16} color={colors.textMuted} />,
                t('city'),
                <TouchableOpacity
                  style={[styles.fieldTouchable, styles.fieldTouchableRow]}
                  onPress={openCityPickerForBranch}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.fieldTouchableText,
                      { color: branchCity.trim() ? colors.text : colors.textMuted, flex: 1 },
                    ]}
                    numberOfLines={1}
                  >
                    {branchCity.trim()
                      ? branchCity
                      : language === 'ar'
                        ? 'اضغط لفتح الخريطة واختيار المدينة'
                        : 'Tap map to choose or change city'}
                  </Text>
                  <ChevronDown size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {renderFieldRow(
                <MapPinned size={16} color={colors.textMuted} />,
                t('branchAddress'),
                <TextInput
                  style={[styles.fieldTextInput, { color: colors.text }]}
                  value={branchAddress}
                  onChangeText={setBranchAddress}
                  textAlign={isRTL ? 'right' : 'left'}
                  placeholder={language === 'ar' ? 'العنوان التفصيلي' : 'Detailed address'}
                  placeholderTextColor={colors.textMuted}
                />
              )}

              {renderFieldRow(
                <Link2 size={16} color={colors.textMuted} />,
                t('branchGoogleMapsLink'),
                <TextInput
                  style={[styles.fieldTextInput, { color: colors.text }]}
                  value={branchGoogleLink}
                  onChangeText={setBranchGoogleLink}
                  textAlign="left"
                  placeholder="https://maps.google.com/..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}

              <View style={[styles.scheduleCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.scheduleCardHeader}>
                  <Calendar size={18} color={colors.primary} />
                  <Text style={[styles.scheduleCardTitle, { color: colors.text }]}>{t('branchWorkDaysLabel')}</Text>
                </View>
                {renderDayChipSelector(branchSelectedDays, toggleBranchDay)}
                <View style={[styles.scheduleDivider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.scheduleCardHeader}>
                  <Clock size={18} color={colors.primary} />
                  <Text style={[styles.scheduleCardTitle, { color: colors.text }]}>{t('workingHours')}</Text>
                </View>
                {renderScheduleFromTo('time', branchFromHour, branchToHour, setBranchFromHour, setBranchToHour)}
              </View>

              <TouchableOpacity
                style={[styles.branchSubmitBtn, { backgroundColor: branchName.trim() ? colors.primary : colors.borderLight }]}
                onPress={handleSaveBranch}
                disabled={!branchName.trim()}
              >
                <Save size={18} color={branchName.trim() ? '#FFF' : colors.textMuted} />
                <Text style={[styles.branchSubmitText, { color: branchName.trim() ? '#FFF' : colors.textMuted }]}>
                  {editingBranchId ? t('saveChanges') : language === 'ar' ? 'إضافة الفرع' : 'Add Branch'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.branchCancelBtn, { borderColor: colors.border }]}
                onPress={closeBranchModal}
              >
                <Text style={[styles.branchCancelText, { color: colors.text }]}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} animationType="fade" transparent>
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteDialog, { backgroundColor: colors.card }]}>
            <View style={[styles.deleteIconWrap, { backgroundColor: '#EF444415' }]}>
              <Trash2 size={28} color="#EF4444" />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.text }]}>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </Text>
            <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
              {language === 'ar'
                ? `هل أنت متأكد من حذف "${deleteTarget?.name}"؟`
                : `Are you sure you want to delete "${deleteTarget?.name}"?`}
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteActionBtn, styles.deleteCancelBtn, { borderColor: colors.border }]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={[styles.deleteCancelText, { color: colors.text }]}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteActionBtn, styles.deleteConfirmBtn]}
                onPress={confirmDelete}
              >
                <Trash2 size={16} color="#FFF" />
                <Text style={styles.deleteConfirmText}>
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MapPickerModal
        visible={showMapCityPicker}
        onClose={finishMapCityPickerFlow}
        onSelectCity={async (cityName, coords, displayLabel) => {
          await handleMapCitySelect(cityName, coords, displayLabel);
        }}
        initialCoords={mapPickerInitialCoords ?? undefined}
        title={mapPickerTitle}
      />
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

  toggleRow: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  toggleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleInfo: { flex: 1, marginHorizontal: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '600' as const },
  toggleDesc: { fontSize: 12, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWrap: {},
  sectionTitle: { fontSize: 17, fontWeight: '700' as const },
  sectionCount: { fontSize: 12, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  itemCardTitle: { flex: 1, marginHorizontal: 12 },
  itemName: { fontSize: 15, fontWeight: '600' as const },
  itemBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceBadgeText: { fontSize: 12, fontWeight: '700' as const },
  cityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cityBadgeText: { fontSize: 12, fontWeight: '500' as const },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotText: { fontSize: 12, fontWeight: '600' as const },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailChipText: { fontSize: 13 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700' as const },
  modalBody: { paddingHorizontal: 20, paddingBottom: 56 },

  fieldRow: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fieldInputInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  fieldIconWrap: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTextInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  fieldTouchable: {
    flex: 1,
    paddingVertical: 13,
  },
  fieldTouchableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldTouchableText: {
    fontSize: 15,
  },
  fieldRowDouble: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fieldHalf: { flex: 1 },
  unitText: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginLeft: 4,
  },

  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dayBtn: {
    flex: 1,
    minWidth: 44,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  dayBtnText: { fontSize: 13, fontWeight: '600' as const },

  periodCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  periodNameInput: {
    fontSize: 14,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  periodNamePicker: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  periodNameOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  periodNameOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  periodTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  periodTimeInput: { flex: 1, fontSize: 14, textAlign: 'center' },
  periodTimeSep: { fontSize: 16, fontWeight: '500' as const },

  addPeriodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addPeriodText: { fontSize: 14, fontWeight: '600' as const },

  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700' as const },

  deliveryPeriodCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  scheduleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  scheduleCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  scheduleDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  dayChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  workHoursInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workHourDash: {
    fontSize: 18,
    fontWeight: '500' as const,
    paddingTop: 20,
  },
  periodHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: -4,
  },
  periodTimeSectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 4,
  },

  branchSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  branchSubmitText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  branchCancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 10,
  },
  branchCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },

  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  deleteDialog: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteCancelBtn: {
    borderWidth: 1.5,
  },
  deleteCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deleteConfirmBtn: {
    backgroundColor: '#EF4444',
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
