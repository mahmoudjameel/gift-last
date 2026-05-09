import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  Star,
  ChevronDown,
  Package,
  FileText,
  Tag,
  Percent,
  ImagePlus,
  Gift,
  Layers,
  DollarSign,
  Check,
  Hash,
  ListPlus,
  X,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Product, ProductOption } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import GlassAlert, { GlassAlertConfig } from '@/components/GlassAlert';

const FALLBACK_CATEGORIES = ['باقات', 'ورود', 'كيك', 'هدايا', 'شوكولاته'];

export default function AddProductScreen() {
  const { colors, t, isRTL, addProduct, storeInfo, user, categories: appCategories } = useApp();
  const router = useRouter();
  const CATEGORIES = useMemo(() => {
    const names = appCategories
      .filter((c) => c.id !== '0')
      .map((c) => c.name)
      .filter(Boolean);
    return names.length > 0 ? names : FALLBACK_CATEGORIES;
  }, [appCategories]);

  const [productNumber, setProductNumber] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPrice, setDiscountPrice] = useState('');
  const [hasGift, setHasGift] = useState(false);
  const [giftFee, setGiftFee] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isHidden, setIsHidden] = useState(false);
  const [alertConfig, setAlertConfig] = useState<GlassAlertConfig>({ visible: false, type: 'success', message: '' });
  const dismissAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);

  const pickImages = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setAlertConfig({ visible: true, type: 'error', message: 'يرجى السماح بالوصول للألبوم' });
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - images.length,
      });
      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(a => a.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (e) {
      void e;
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });
    setMainImageIndex(prev => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const addOption = () => {
    const newOption: ProductOption = {
      type: 'multiple_choice',
      title: '',
      required: false,
      choices: [{ label: '' }],
    };
    setOptions((prev) => [...prev, newOption]);
  };

  const updateOption = (index: number, updates: Partial<ProductOption>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const addChoice = (optionIndex: number) => {
    const newOptions = [...options];
    if (newOptions[optionIndex].choices) {
      newOptions[optionIndex].choices = [...newOptions[optionIndex].choices!, { label: '' }];
      setOptions(newOptions);
    }
  };

  const updateChoice = (optionIndex: number, choiceIndex: number, label: string) => {
    const newOptions = [...options];
    if (newOptions[optionIndex].choices) {
      const newChoices = [...newOptions[optionIndex].choices!];
      newChoices[choiceIndex] = { label };
      newOptions[optionIndex] = { ...newOptions[optionIndex], choices: newChoices };
      setOptions(newOptions);
    }
  };

  const removeChoice = (optionIndex: number, choiceIndex: number) => {
    const newOptions = [...options];
    if (newOptions[optionIndex].choices) {
      newOptions[optionIndex].choices = newOptions[optionIndex].choices!.filter((_, i) => i !== choiceIndex);
      setOptions(newOptions);
    }
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setAlertConfig({ visible: true, type: 'error', message: 'يرجى إدخال اسم المنتج' });
      return;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setAlertConfig({ visible: true, type: 'error', message: 'يرجى إدخال سعر صحيح أكبر من صفر' });
      return;
    }
    if (!category) {
      setAlertConfig({ visible: true, type: 'error', message: 'يرجى اختيار فئة المنتج' });
      return;
    }
    if (hasDiscount) {
      if (!discountPrice.trim() || isNaN(Number(discountPrice)) || Number(discountPrice) <= 0) {
        setAlertConfig({ visible: true, type: 'error', message: 'يرجى إدخال سعر الخصم بشكل صحيح' });
        return;
      }
      if (Number(discountPrice) >= Number(price)) {
        setAlertConfig({ visible: true, type: 'error', message: 'سعر الخصم يجب أن يكون أقل من السعر الأصلي' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const finalPrice = hasDiscount ? Number(discountPrice) : Number(price);

      const orderedImages = images.length > 0 && mainImageIndex > 0
        ? [images[mainImageIndex], ...images.filter((_, i) => i !== mainImageIndex)]
        : images;

      const sanitizedOptions =
        options
          .filter((o) => o.type === 'multiple_choice')
          .map((o) => ({
            type: 'multiple_choice' as const,
            title: (o.title || '').trim(),
            required: !!o.required,
            choices: (o.choices || [])
              .map((c) => ({ label: (c.label || '').trim() }))
              .filter((c) => c.label.length > 0),
          }))
          .filter((o) => o.title.length > 0 && o.choices.length > 0);
      const optionsToSave = sanitizedOptions.length > 0 ? sanitizedOptions : undefined;

      const newProduct: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sku: productNumber.trim() || undefined,
        name: name.trim(),
        nameEn: name.trim(),
        description: desc.trim(),
        price: finalPrice,
        originalPrice: hasDiscount ? Number(price) : undefined,
        image: orderedImages[0] || '',
        images: orderedImages.length > 0 ? orderedImages : [],
        category,
        categoryEn: category,
        rating: 0,
        reviewCount: 0,
        shopName: storeInfo?.name || user?.storeName || '',
        shopImage: (storeInfo as any)?.storeImage || '',
        isFavorite: false,
        inStock: qty ? Number(qty) > 0 : true,
        stock: qty ? Number(qty) : 0,
        isHidden,
        tags: [],
        badge: '',
        city: storeInfo?.city || '',
        storeId: user?.id || '',
        hasGiftCard: hasGift,
        giftCardFee: hasGift && giftFee ? Number(giftFee) : undefined,
        options: optionsToSave,
      };

      await addProduct(newProduct);
      setAlertConfig({ visible: true, type: 'success', message: t('savedSuccessfully') });
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      console.error('[addProduct] error:', e);
      const err = e as { message?: string };
      const msg =
        err?.message === 'merchant_id_missing'
          ? 'تعذر تحديد حساب التاجر الحالي. سجّل خروج ثم ادخل مرة أخرى.'
          : err?.message || 'حدث خطأ أثناء حفظ المنتج في Firebase';
      setAlertConfig({ visible: true, type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  }, [name, desc, price, qty, category, images, mainImageIndex, hasGift, giftFee, hasDiscount, discountPrice, options, isHidden, productNumber, storeInfo, user, addProduct, t, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#E88AAE', '#D4709A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {isRTL ? <ArrowRight size={22} color="#FFF" /> : <ArrowLeft size={22} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('addNewProduct')}</Text>
            <View style={{ width: 36 }} />
          </View>
          <Text style={styles.headerDesc}>{t('addNewProductDesc')}</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Package size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>معلومات المنتج</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>رقم المنتج</Text>
          <View style={styles.productNumWrap}>
            <View style={[styles.hashTag, { backgroundColor: colors.primary + '12' }]}>
              <Hash size={16} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text, flex: 1, marginBottom: 0 }]}
              value={productNumber}
              onChangeText={setProductNumber}
              placeholder="مثال: SKU-001"
              placeholderTextColor={colors.textMuted}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
          <Text style={[styles.productNumHint, { color: colors.textMuted }]}>رقم تعريفي خاص بالمنتج يظهر في الطلبات</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('productName')}</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder={t('productNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            textAlign={isRTL ? 'right' : 'left'}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('productDesc')}</Text>
          <TextInput
            style={[styles.fieldInputMulti, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t('productDescPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <DollarSign size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>السعر والكمية</Text>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('quantity')}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text, textAlign: 'center' }]}
                value={qty}
                onChangeText={setQty}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('price')}</Text>
              <View style={styles.priceInputWrap}>
                <View style={[styles.priceTag, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.priceTagText, { color: colors.primary }]}>₪</Text>
                </View>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text, textAlign: 'center', flex: 1 }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.discountToggle, { backgroundColor: hasDiscount ? '#E8383815' : colors.background, borderColor: hasDiscount ? '#E83838' : colors.borderLight }]}
            onPress={() => { setHasDiscount(!hasDiscount); if (hasDiscount) setDiscountPrice(''); }}
            activeOpacity={0.7}
          >
            <Percent size={16} color={hasDiscount ? '#E83838' : colors.textMuted} />
            <Text style={[styles.discountToggleText, { color: hasDiscount ? '#E83838' : colors.textSecondary }]}>
              {hasDiscount ? 'إزالة الخصم' : 'إضافة خصم'}
            </Text>
          </TouchableOpacity>

          {hasDiscount && (
            <View style={styles.discountWrap}>
              <Text style={[styles.fieldLabel, { color: '#E83838' }]}>السعر بعد الخصم</Text>
              <View style={styles.priceInputWrap}>
                <View style={[styles.priceTag, { backgroundColor: '#E8383815' }]}>
                  <Text style={[styles.priceTagText, { color: '#E83838' }]}>₪</Text>
                </View>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: '#E8383840', color: '#E83838', textAlign: 'center', flex: 1, fontWeight: '700' }]}
                  value={discountPrice}
                  onChangeText={setDiscountPrice}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              {price && discountPrice && Number(discountPrice) > 0 && Number(discountPrice) < Number(price) && (
                <Text style={styles.discountPercent}>
                  خصم {Math.round(((Number(price) - Number(discountPrice)) / Number(price)) * 100)}%
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Layers size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('productCategory')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.selectBtn, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <ChevronDown size={18} color={colors.textMuted} style={{ transform: [{ rotate: showCategoryPicker ? '180deg' : '0deg' }] }} />
            <Text style={[styles.selectBtnText, { color: category ? colors.text : colors.textMuted }]}>
              {category || t('selectCategory')}
            </Text>
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pickerItem, isSelected && { backgroundColor: colors.primary + '10' }]}
                    onPress={() => { setCategory(cat); setShowCategoryPicker(false); }}
                  >
                    {isSelected && <Check size={16} color={colors.primary} />}
                    <Text style={[styles.pickerItemText, { color: isSelected ? colors.primary : colors.text }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <ListPlus size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>خيارات المنتج (اختياري)</Text>
          </View>
          <Text style={[styles.hintText, { color: colors.textMuted, marginBottom: 16 }]}>
            أضف خيارات اختيار واحد يختار منها العميل عند الطلب (مثل اللون أو الحجم)
          </Text>

          <TouchableOpacity style={[styles.optionTypeBtnFull, { backgroundColor: colors.background }]} onPress={addOption}>
            <ListPlus size={18} color={colors.primary} />
            <Text style={[styles.optionTypeLabel, { color: colors.text }]}>إضافة خيار واحد</Text>
          </TouchableOpacity>

          {options.map((opt, optIdx) => (
            <View key={optIdx} style={[styles.optionCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
              <View style={styles.optionCardHeader}>
                <View style={styles.optionBadgeWrap}>
                  <Text style={[styles.optionBadge, { backgroundColor: colors.primary + '15', color: colors.primary }]}>
                    خيار واحد
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeOption(optIdx)} style={styles.removeOptionBtn}>
                  <X size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.borderLight, color: colors.text, marginBottom: 12 }]}
                value={opt.title}
                onChangeText={(val) => updateOption(optIdx, { title: val })}
                placeholder="عنوان الخيار (مثال: اللون)"
                placeholderTextColor={colors.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
              />

              {opt.choices && (
                <View style={styles.choicesWrap}>
                  {opt.choices.map((choice, choiceIdx) => (
                    <View key={choiceIdx} style={styles.choiceRow}>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.borderLight, color: colors.text, flex: 1, marginBottom: 0, height: 40 }]}
                        value={choice.label}
                        onChangeText={(val) => updateChoice(optIdx, choiceIdx, val)}
                        placeholder={`الخيار ${choiceIdx + 1}`}
                        placeholderTextColor={colors.textMuted}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                      {opt.choices!.length > 1 && (
                        <TouchableOpacity onPress={() => removeChoice(optIdx, choiceIdx)} style={styles.removeChoiceIcon}>
                          <X size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addChoiceBtn} onPress={() => addChoice(optIdx)}>
                    <Plus size={14} color={colors.primary} />
                    <Text style={[styles.addChoiceText, { color: colors.primary }]}>إضافة اختيار</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.requiredRow}>
                <Switch
                  value={opt.required}
                  onValueChange={(val) => updateOption(optIdx, { required: val })}
                  trackColor={{ false: colors.borderLight, true: colors.primary }}
                  thumbColor="#FFF"
                  style={{ transform: [{ scale: 0.8 }] }}
                />
                <Text style={[styles.requiredLabel, { color: colors.textSecondary }]}>هذا الخيار إجباري</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Gift size={18} color="#EC4899" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('giftCardOption')}</Text>
          </View>

          <View style={styles.giftRow}>
            <Switch
              value={hasGift}
              onValueChange={setHasGift}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor="#FFF"
            />
            <Text style={[styles.giftDesc, { color: colors.textSecondary }]}>
              تفعيل خيار بطاقة الإهداء لهذا المنتج
            </Text>
          </View>

          {hasGift && (
            <View style={styles.giftFeeWrap}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('giftCardFee')}</Text>
              <View style={styles.priceInputWrap}>
                <View style={[styles.priceTag, { backgroundColor: '#EC489915' }]}>
                  <Text style={[styles.priceTagText, { color: '#EC4899' }]}>₪</Text>
                </View>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.borderLight, color: colors.text, textAlign: 'center', flex: 1 }]}
                  value={giftFee}
                  onChangeText={setGiftFee}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>{t('giftCardFeeHint')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <ImagePlus size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('productImages')} ({images.length}/5)</Text>
          </View>
          <Text style={[styles.hintText, { color: colors.textMuted, marginBottom: 12, marginTop: -4 }]}>{t('setMainImage')}</Text>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                  <TouchableOpacity
                    style={[styles.starBtn, { backgroundColor: mainImageIndex === index ? colors.primary : 'rgba(0,0,0,0.45)' }]}
                    onPress={() => setMainImageIndex(index)}
                  >
                    <Star size={12} color="#FFF" fill={mainImageIndex === index ? '#FFF' : 'transparent'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                    <Trash2 size={10} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {images.length < 5 && (
            <TouchableOpacity
              style={[styles.uploadArea, { borderColor: colors.borderLight, backgroundColor: colors.background }]}
              onPress={pickImages}
              activeOpacity={0.7}
            >
              <Upload size={28} color={colors.textMuted} />
              <Text style={[styles.uploadText, { color: colors.textMuted }]}>{t('uploadImages')}</Text>
              <Text style={[styles.formatText, { color: colors.textMuted }]}>{t('imageFormats')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.borderLight, borderWidth: 1 }]}
            onPress={() => setIsHidden(!isHidden)}
            activeOpacity={0.7}
          >
            {isHidden ? <Eye size={18} color={colors.text} /> : <EyeOff size={18} color={colors.textMuted} />}
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {isHidden ? t('showProduct') : t('hideProduct')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaving}
        >
          <LinearGradient
            colors={['#E88AAE', '#D4709A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'جاري الحفظ...' : t('saveProduct')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      <GlassAlert {...alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  headerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'flex-start',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  productNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  hashTag: {
    width: 40,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productNumHint: {
    fontSize: 11,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  fieldInputMulti: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: { flex: 1 },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceTag: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceTagText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  discountToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  discountToggleText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  discountWrap: {
    marginTop: 12,
  },
  discountPercent: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#E83838',
    textAlign: 'center',
    marginTop: 6,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectBtnText: {
    fontSize: 15,
    flex: 1,
  },
  pickerDropdown: {
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  giftDesc: {
    fontSize: 13,
    flex: 1,
    marginHorizontal: 12,
  },
  giftFeeWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  hintText: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 4,
  },
  imagesRow: {
    gap: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  imageThumbWrap: { position: 'relative' },
  imageThumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  starBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadArea: {
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  formatText: {
    fontSize: 11,
  },
  saveButton: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  optionTypeBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  optionTypeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  optionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionBadgeWrap: {
    flexDirection: 'row',
  },
  optionBadge: {
    fontSize: 10,
    fontWeight: '700' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  removeOptionBtn: {
    padding: 4,
  },
  choicesWrap: {
    gap: 8,
    marginBottom: 12,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeChoiceIcon: {
    padding: 4,
  },
  addChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addChoiceText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  requiredLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
