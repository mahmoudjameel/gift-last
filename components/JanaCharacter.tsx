import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Product } from '@/types';
import { productMatchesCity } from '@/utils/location';
import { ShoppingBag, Store as StoreIcon, Sparkles, TrendingUp, Tag } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

const { width: SCREEN_W } = Dimensions.get('window');

const janaImages = {
  welcome: require('@/assets/images/jana-welcome.png'),
  search: require('@/assets/images/jana-search.png'),
  excited: require('@/assets/images/jana-excited.png'),
};

type JanaMood = 'welcome' | 'search' | 'excited';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface JanaSmartSuggestion {
  type: 'product' | 'store' | 'category' | 'deal';
  label: string;
  icon: 'sparkles' | 'trending' | 'tag' | 'store';
  onPress: () => void;
}

interface JanaSearchPopupProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: 'product' | 'store') => void;
  products: Product[];
  selectedCity: string;
  colors: any;
  t: (key: string) => string;
  onProductPress?: (id: string) => void;
}

const searchGreetings = {
  ar: ['أهلاً! شو بدك تحكي؟', 'أهلين! قولي شو بدك', 'مرحبا! خليني أساعدك تلاقي', 'أهلاً! ابحث وأنا معك'],
  he: ['היי! מה בא לך לחפש?', 'אהלן! תגיד/י לי מה צריך', 'שלום! אני אעזור לך למצוא', 'יאללה, חפש/י ואני איתך'],
};

const smartTips = {
  ar: ['شفت العروض اليوم؟ مش بتندم!', 'وصلتنا باقات جديدة كتير حلوة!', 'خليني أدلك على الأفضل', 'قولي شو بدك وأنا أبحثلك!'],
  he: ['ראית את המבצעים של היום? שווה!', 'הגיעו זרים חדשים מהממים!', 'תן/י לי להוביל אותך לטוב ביותר', 'תגיד/י מה מחפשים ואני אמצא לך!'],
};

export function JanaSearchPopup({
  visible,
  onClose,
  onSelectType,
  products,
  selectedCity,
  colors,
  t,
  onProductPress,
}: JanaSearchPopupProps) {
  const { isRTL, language } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const charScale = useRef(new Animated.Value(0.3)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.5)).current;
  const btnsAnim = useRef(new Animated.Value(0)).current;
  const suggestAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const [greeting] = useState(() => pickRandom(searchGreetings[language === 'ar' ? 'ar' : 'he']));
  const [smartTip, setSmartTip] = useState(() => pickRandom(smartTips[language === 'ar' ? 'ar' : 'he']));
  const [showTip, setShowTip] = useState(false);

  const smartSuggestion = useMemo(() => {
    if (!products || products.length === 0) return null;
    const cityProducts = selectedCity === 'all'
      ? products
      : products.filter(p => p.city === selectedCity);
    if (cityProducts.length === 0) return null;

    const deals = cityProducts.filter(p => p.originalPrice && p.originalPrice > p.price);
    if (deals.length > 0) {
      const best = deals.reduce((a, b) =>
        ((b.originalPrice! - b.price) / b.originalPrice!) > ((a.originalPrice! - a.price) / a.originalPrice!) ? b : a
      );
      const discount = Math.round(((best.originalPrice! - best.price) / best.originalPrice!) * 100);
      return {
        text: `خصم ${discount}% على ${best.name} 🔥`,
        product: best,
        mood: 'excited' as JanaMood,
      };
    }

    const popular = cityProducts.filter(p => p.badge === 'الأكثر مبيعاً');
    if (popular.length > 0) {
      const top = pickRandom(popular);
      return {
        text: `${top.name} - الكل يطلبه!`,
        product: top,
        mood: 'excited' as JanaMood,
      };
    }

    const newItems = cityProducts.filter(p => p.badge === 'جديد');
    if (newItems.length > 0) {
      const item = pickRandom(newItems);
      return {
        text: `وصل جديد: ${item.name} ✨`,
        product: item,
        mood: 'welcome' as JanaMood,
      };
    }

    const random = pickRandom(cityProducts);
    return {
      text: `جرب ${random.name} - يستاهل!`,
      product: random,
      mood: 'welcome' as JanaMood,
    };
  }, [products, selectedCity]);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
      charScale.setValue(0.3);
      bubbleAnim.setValue(0);
      bubbleScale.setValue(0.5);
      btnsAnim.setValue(0);
      suggestAnim.setValue(0);
      setShowTip(false);

      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

      Animated.sequence([
        Animated.parallel([
          Animated.spring(charScale, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(bubbleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(bubbleScale, { toValue: 1, tension: 140, friction: 7, useNativeDriver: true }),
        ]),
        Animated.delay(50),
        Animated.timing(btnsAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(150),
        Animated.timing(suggestAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      const loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -5, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loopAnim.start();

      const tipTimer = setTimeout(() => {
        setShowTip(true);
        setSmartTip(pickRandom(smartTips[language === 'ar' ? 'ar' : 'he']));
      }, 4000);

      return () => {
        loopAnim.stop();
        bounceAnim.setValue(0);
        clearTimeout(tipTimer);
      };
    }
  }, [visible, language]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.popupOverlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.popupTouchArea} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.popupContent, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>

            <Animated.View style={[styles.speechBubble, { backgroundColor: colors.card, opacity: bubbleAnim, transform: [{ scale: bubbleScale }] }]}>
              <Text style={[styles.speechText, { color: colors.text }]}>{greeting}</Text>
              <View style={[styles.speechTail, { borderTopColor: colors.card }]} />
            </Animated.View>

            <Animated.View style={[styles.charContainer, { transform: [{ scale: charScale }, { translateY: bounceAnim }] }]} />

            <Animated.View style={[styles.btnsRow, { opacity: btnsAnim, transform: [{ translateY: btnsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.typeBtn, { backgroundColor: '#6B21A8', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => onSelectType('product')}
                activeOpacity={0.8}
              >
                <ShoppingBag size={18} color="#FFF" />
                <Text style={styles.typeBtnText}>{t('searchForProduct')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => onSelectType('store')}
                activeOpacity={0.8}
              >
                <StoreIcon size={18} color="#FFF" />
                <Text style={styles.typeBtnText}>{t('searchForStore')}</Text>
              </TouchableOpacity>
            </Animated.View>

            {smartSuggestion && (
              <Animated.View style={[styles.suggestCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder, opacity: suggestAnim, transform: [{ translateY: suggestAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }]}>
                <TouchableOpacity
                  style={[styles.suggestInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (smartSuggestion.product && onProductPress) {
                      onClose();
                      onProductPress(smartSuggestion.product.id);
                    }
                  }}
                >
                  <View style={[styles.suggestTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.suggestLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Sparkles size={13} color="#F59E0B" />
                      <Text style={[styles.suggestLabel, { color: '#F59E0B' }]}>{language === 'ar' ? 'توصية جنى' : 'המלצת ג׳אנה'}</Text>
                    </View>
                    <Text style={[styles.suggestText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{smartSuggestion.text}</Text>
                    {smartSuggestion.product && (
                      <Text style={[styles.suggestPrice, { color: colors.primary }]}>{smartSuggestion.product.price} ₪</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {showTip && (
              <Animated.View style={styles.tipWrap}>
                <Text style={[styles.tipText, { color: colors.textMuted }]}>{smartTip}</Text>
              </Animated.View>
            )}

          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface JanaProductReactionProps {
  product: {
    price: number;
    originalPrice?: number;
    badge?: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
    name: string;
  };
  colors: any;
}

const productReactions = {
  ar: {
    discount: ['يا حظك! عرض ما يتفوت 🔥', 'سعر حلو مره قبل لا يخلص', 'وفّر فلوسك واستمتع!', 'خصم ذهبي! لا تطوفك'],
    popular: ['الكل يطلبه! ذوقك عالي', 'من أكثر المنتجات مبيعاً 🌟', 'اختيار موفق والله', 'ترند ما شاء الله!'],
    newItem: ['وصل توه! كن أول واحد يجربه', 'جديد ومميز ما شاء الله', 'تشكيلة جديدة تستاهل التجربة ✨'],
    flowers: ['ورد يسعد القلب والروح 🌸', 'أحلى هدية هي الورد', 'باقة تفرح اللي تحبه', 'ورد وريحة حلوة!'],
    chocolate: ['شوكولاتة تذوب القلب 🍫', 'هدية ما أحد يرفضها!', 'شوكولاتة فاخرة تستاهل'],
    cake: ['كيكة تكمل الفرحة 🎂', 'لكل مناسبة كيكة مميزة', 'حلى يسعد الكل!'],
    general: ['ذوقك رفيع والله!', 'هدية مميزة لأحبابك 🎁', 'يستاهل تضيفه للسلة!', 'منتج يستحق والله', 'اختيار حلو ما شاء الله'],
  },
  he: {
    discount: ['איזה מזל! מבצע שאסור לפספס 🔥', 'מחיר מעולה לפני שיגמר', 'תחסוך/י ותהנה/י!', 'הנחה זהב! אל תפספס/י'],
    popular: ['כולם מזמינים את זה! טעם מעולה', 'מהנמכרים ביותר 🌟', 'בחירה מצוינת', 'טרנד חם!'],
    newItem: ['חדש עכשיו! תהיה/י בין הראשונים לנסות', 'חדש ומיוחד', 'קולקציה חדשה ששווה ניסיון ✨'],
    flowers: ['פרחים שמשמחים את הלב 🌸', 'המתנה הכי יפה היא פרחים', 'זר שישמח את מי שאוהבים', 'פרחים עם ריח מושלם!'],
    chocolate: ['שוקולד שממיס את הלב 🍫', 'מתנה שאי אפשר לסרב לה!', 'שוקולד יוקרתי ששווה'],
    cake: ['עוגה שמשלימה כל שמחה 🎂', 'לכל אירוע עוגה מיוחדת', 'מתוק שמשמח את כולם!'],
    general: ['יש לך טעם מעולה!', 'מתנה מיוחדת לאהובים 🎁', 'שווה להוסיף לסל!', 'מוצר ששווה מאוד', 'בחירה ממש יפה'],
  },
};

export function getJanaReaction(product: JanaProductReactionProps['product'], language: 'ar' | 'he' = 'ar'): { message: string; mood: JanaMood } {
  const lang = language === 'ar' ? 'ar' : 'he';
  const reactionMap = productReactions[lang];
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const isPopular = product.badge === 'الأكثر مبيعاً';
  const isNew = product.badge === 'جديد';
  const cat = (product.category ?? '').toLowerCase();

  if (hasDiscount) return { message: pickRandom(reactionMap.discount), mood: 'excited' };
  if (isPopular) return { message: pickRandom(reactionMap.popular), mood: 'excited' };
  if (isNew) return { message: pickRandom(reactionMap.newItem), mood: 'welcome' };
  if (cat.includes('ورد') || cat.includes('زهور') || cat.includes('باقة') || cat.includes('flower')) return { message: pickRandom(reactionMap.flowers), mood: 'excited' };
  if (cat.includes('شوكولاتة') || cat.includes('chocolate')) return { message: pickRandom(reactionMap.chocolate), mood: 'excited' };
  if (cat.includes('كيك') || cat.includes('cake')) return { message: pickRandom(reactionMap.cake), mood: 'welcome' };
  return { message: pickRandom(reactionMap.general), mood: 'welcome' };
}

const cartCTAs = {
  ar: ['ضيفه على السلة! مش رح تندم 🛒', 'هيا ضيفه قبل ما يخلص!', 'لا تتردد، ضيفه هلق!', 'هالمنتج يستاهل! اشتريه', 'اشتريه هدية، رح يفرح أحبابك!', 'شو بتنتظر؟ ضيفه للسلة!'],
  he: ['תוסיף/י לסל! לא תתחרט/י 🛒', 'יאללה, לפני שיגמר!', 'אל תהסס/י, תוסיף/י עכשיו!', 'המוצר הזה שווה!', 'קח/י כמתנה, ישמחו מאוד!', 'למה לחכות? תוסיף/י לסל!'],
};

interface JanaProductGuideProps {
  product: {
    price: number;
    originalPrice?: number;
    badge?: string;
    rating?: number;
    reviewCount?: number;
    category?: string;
    name: string;
  };
  colors: any;
  scrollY: number;
}

export function JanaProductGuide({ product, colors, scrollY }: JanaProductGuideProps) {
  const { isRTL, language } = useApp();
  const [reaction, setReaction] = useState(() => getJanaReaction(product, language === 'ar' ? 'ar' : 'he'));
  const productId = product.name;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const flyFadeOut = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasFlown = useRef(false);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    flyFadeOut.setValue(1);
    hasFlown.current = false;
    setReaction(getJanaReaction(product, language === 'ar' ? 'ar' : 'he'));

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      ]).start();
    }, 500);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loopRef.current = loop;
    loop.start();

    return () => {
      clearTimeout(timer);
      loop.stop();
      bounceAnim.setValue(0);
    };
  }, [productId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (hasFlown.current) return;
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setReaction(getJanaReaction(product, language === 'ar' ? 'ar' : 'he'));
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [productId, language]);

  useEffect(() => {
    if (scrollY > 200 && !hasFlown.current) {
      hasFlown.current = true;
      if (loopRef.current) loopRef.current.stop();
      bounceAnim.setValue(0);
      Animated.timing(flyFadeOut, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    }
  }, [scrollY]);

  return (
    <Animated.View
      style={[
        styles.productBubbleContainer,
        {
          opacity: Animated.multiply(fadeAnim, flyFadeOut),
          transform: [
            { translateY: Animated.add(slideAnim, bounceAnim) },
          ],
        },
      ]}
    >
      <View style={[styles.productBubbleCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.productBubbleContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.productBubbleTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.productBubbleNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Sparkles size={12} color="#6B21A8" />
              <Text style={styles.productBubbleName}>{language === 'ar' ? 'جنى' : 'ג׳אנה'}</Text>
            </View>
            <Text style={[styles.productBubbleMsg, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{reaction.message}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

interface JanaFloatingCTAProps {
  visible: boolean;
  colors: any;
  onAddToCart?: () => void;
}

export function JanaFloatingCTA({ visible, colors, onAddToCart }: JanaFloatingCTAProps) {
  const { language } = useApp();
  const [cartCTA] = useState(() => pickRandom(cartCTAs[language === 'ar' ? 'ar' : 'he']));
  const floatFade = useRef(new Animated.Value(0)).current;
  const floatScale = useRef(new Animated.Value(0.3)).current;
  const floatBounce = useRef(new Animated.Value(0)).current;
  const bubbleFade = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.3)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (visible && !hasAnimated.current) {
      hasAnimated.current = true;

      Animated.parallel([
        Animated.spring(floatScale, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
        Animated.timing(floatFade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.spring(bubbleScale, { toValue: 1, tension: 140, friction: 7, useNativeDriver: true }),
          Animated.timing(bubbleFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatBounce, { toValue: -3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(floatBounce, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      loopRef.current = loop;

      return () => {
        loop.stop();
        floatBounce.setValue(0);
      };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.janaFloating,
        {
          opacity: floatFade,
          transform: [{ translateY: floatBounce }, { scale: floatScale }],
        },
      ]}
    >
      <Animated.View style={[styles.cartBubble, { backgroundColor: colors.card, opacity: bubbleFade, transform: [{ scale: bubbleScale }] }]}>
        <Text style={[styles.cartBubbleText, { color: colors.text }]}>{cartCTA}</Text>
        <View style={[styles.cartBubbleTail, { borderTopColor: colors.card }]} />
      </Animated.View>
      <TouchableOpacity activeOpacity={0.8} onPress={onAddToCart}>
        <View style={[styles.textOnlyAnchor, { backgroundColor: colors.primary }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface JanaAssistantProps {
  message: string;
  mood?: JanaMood;
  visible: boolean;
  colors: any;
  position?: 'bottomRight' | 'bottomLeft';
  onPress?: () => void;
}

export function JanaAssistant({ message, mood = 'welcome', visible, colors, position = 'bottomRight', onPress }: JanaAssistantProps) {
  const floatBounce = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      if (loopRef.current) loopRef.current.stop();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatBounce, { toValue: -4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(floatBounce, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      loopRef.current = loop;
    } else {
      if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; }
      floatBounce.setValue(0);
    }
    return () => { if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; } };
  }, [visible]);

  if (!visible) return null;

  const posStyle = position === 'bottomLeft'
    ? { left: 16, right: undefined }
    : { right: 16, left: undefined };

  return (
    <Animated.View
      style={[
        styles.janaAssistant,
        posStyle,
        { transform: [{ translateY: floatBounce }] },
      ]}
    >
      <View style={[styles.assistantBubble, { backgroundColor: colors.card }]}>
        <Text style={[styles.assistantBubbleText, { color: colors.text }]}>{message}</Text>
        <View style={[styles.assistantBubbleTail, { borderTopColor: colors.card }]} />
      </View>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={[styles.textOnlyAnchor, { backgroundColor: colors.primary }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface JanaPeekProps {
  message: string;
  mood?: JanaMood;
  visible: boolean;
  colors: any;
}

export function JanaPeek({ message, mood = 'excited', visible, colors }: JanaPeekProps) {
  const bounce = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      if (loopRef.current) loopRef.current.stop();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: -5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(bounce, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      );
      loop.start();
      loopRef.current = loop;
    } else {
      if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; }
      bounce.setValue(0);
    }
    return () => { if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; } };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.peekContainer, { transform: [{ translateY: bounce }] }]}>
      <View style={[styles.peekBubble, { backgroundColor: colors.card }]}>
        <Text style={[styles.peekBubbleText, { color: colors.text }]}>{message}</Text>
        <View style={[styles.peekBubbleTail, { borderTopColor: colors.card }]} />
      </View>
      <View style={[styles.textOnlyAnchor, { backgroundColor: colors.primary }]} />
    </Animated.View>
  );
}

interface JanaSearchHeroProps {
  message: string;
  mood?: JanaMood;
  visible: boolean;
  colors: any;
  onPress?: () => void;
}

export function JanaSearchHero({ message, mood = 'search', visible, colors, onPress }: JanaSearchHeroProps) {
  const { language } = useApp();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      if (loopRef.current) loopRef.current.stop();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      );
      loop.start();
      loopRef.current = loop;
    } else {
      if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; }
      bounceAnim.setValue(0);
    }
    return () => { if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; } };
  }, [visible]);

  if (!visible) return null;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.heroContainer}>
      <Animated.View style={[styles.heroInner, { transform: [{ translateY: bounceAnim }] }]}>
        <View style={[styles.heroBubble, { backgroundColor: colors.card }]}>
          <View style={styles.heroBubbleNameRow}>
            <Sparkles size={12} color="#6B21A8" />
            <Text style={styles.heroBubbleName}>{language === 'ar' ? 'جنى' : 'ג׳אנה'}</Text>
          </View>
          <Text style={[styles.heroBubbleText, { color: colors.text }]}>{message}</Text>
          <View style={[styles.heroBubbleTail, { borderTopColor: colors.card }]} />
        </View>
        <View style={[styles.textOnlyAnchor, { backgroundColor: colors.primary }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export function getJanaSmartMessage(context: {
  products: Product[];
  selectedCity: string;
  /** يطابق عنوان «التوصيل إلى» في الواجهة (منطقة/حي) بدل أقرب مدينة سعودية داخلياً */
  displayCityLabel?: string;
  cart?: any[];
  searchQuery?: string;
  searchType?: 'product' | 'store';
  hasResults?: boolean;
  language?: 'ar' | 'he';
}): { message: string; mood: JanaMood } {
  const { products, selectedCity, displayCityLabel, cart, searchQuery, searchType, hasResults, language = 'ar' } = context;
  const isArabic = language === 'ar';

  const cityProducts = selectedCity === 'all'
    ? products
    : products.filter((p) => productMatchesCity(p.city, selectedCity));

  if (searchQuery && searchQuery.trim().length > 0) {
    if (hasResults) {
      if (searchType === 'product') {
        const msgs = isArabic
          ? ['واو لقيت لك شي حلو! 🔍', 'شوف هالنتايج، ذوقك رفيع!', 'عندك اختيارات حلوة ما شاء الله!', 'بدك رأيي؟ كلهم حلوين! 😍']
          : ['וואו, מצאתי לך משהו יפה! 🔍', 'תראה/י את התוצאות האלה, טעם מעולה!', 'יש לך בחירות מהממות!', 'אם שואלים אותי? כולן יפות! 😍'];
        return { message: pickRandom(msgs), mood: 'excited' };
      }
      const msgs = isArabic
        ? ['متاجر مره حلوة لقيتها لك! 🏪', 'أفضل المتاجر قدامك!', 'متاجر تستاهل الزيارة!']
        : ['מצאתי לך חנויות מעולות! 🏪', 'החנויות הכי טובות מולך!', 'חנויות ששווה לבקר בהן!'];
      return { message: pickRandom(msgs), mood: 'excited' };
    }
    const msgs = isArabic
      ? ['ما لقيت شي 😅 جرب كلمة ثانية', 'غيّر البحث وجرب مره ثانية', 'جرب تدور بكلمة مختلفة']
      : ['לא מצאתי 😅 נסה/י מילה אחרת', 'שנה/י את החיפוש ונסה/י שוב', 'נסה/י לחפש במילה שונה'];
    return { message: pickRandom(msgs), mood: 'search' };
  }

  const deals = cityProducts.filter(p => p.originalPrice && p.originalPrice > p.price);
  if (deals.length > 0) {
    const best = deals.reduce((a, b) =>
      ((b.originalPrice! - b.price) / b.originalPrice!) > ((a.originalPrice! - a.price) / a.originalPrice!) ? b : a
    );
    const discount = Math.round(((best.originalPrice! - best.price) / best.originalPrice!) * 100);
    return {
      message: isArabic ? `فيه خصم ${discount}% على ${best.name}! جربه 🔥` : `יש ${discount}% הנחה על ${best.name}! שווה לנסות 🔥`,
      mood: 'excited',
    };
  }

  const popular = cityProducts.filter(p => p.badge === 'الأكثر مبيعاً');
  if (popular.length > 0) {
    const top = pickRandom(popular);
    return {
      message: isArabic ? `${top.name} - الأكثر طلب! جربه` : `${top.name} - הכי מבוקש! שווה לנסות`,
      mood: 'excited',
    };
  }

  const newItems = cityProducts.filter(p => p.badge === 'جديد');
  if (newItems.length > 0) {
    const item = pickRandom(newItems);
    return {
      message: isArabic ? `وصل جديد: ${item.name} ✨` : `חדש הגיע: ${item.name} ✨`,
      mood: 'welcome',
    };
  }

  if (selectedCity !== 'all') {
    const areaLabel = (displayCityLabel && displayCityLabel.trim()) || selectedCity;
    return {
      message: isArabic ? `ابحث عن أحلى المنتجات في ${areaLabel} 🌸` : `חפש/י את המוצרים הכי יפים ב-${areaLabel} 🌸`,
      mood: 'search',
    };
  }

  const defaultMsgs = isArabic
    ? ['ابحث عن اسم المنتج أو المتجر 🔍', 'شو بدك تدور عليه اليوم؟', 'خليني أساعدك تلاقي اللي بدك إياه!']
    : ['חפש/י לפי שם מוצר או חנות 🔍', 'מה בא לך לחפש היום?', 'תן/י לי לעזור לך למצוא את מה שרוצים!'];
  return { message: pickRandom(defaultMsgs), mood: 'search' };
}

const styles = StyleSheet.create({
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupTouchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupContent: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  speechBubble: {
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    alignSelf: 'center',
    maxWidth: 260,
  },
  speechText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  speechTail: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  charContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  charImage: {
    width: 120,
    height: 210,
  },
  charName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B21A8',
    marginTop: 2,
    textAlign: 'center',
  },
  btnsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  typeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  suggestCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  suggestInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  suggestTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  suggestLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggestLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 20,
  },
  suggestPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  suggestImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  tipWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  productBubbleContainer: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  productBubbleCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  productBubbleTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  productBubbleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productBubbleName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B21A8',
  },
  productBubbleMsg: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 20,
  },
  productBubbleAvatar: {
    width: 48,
    height: 80,
    borderRadius: 14,
  },
  janaFloating: {
    position: 'absolute',
    bottom: 125,
    right: 16,
    zIndex: 998,
    alignItems: 'center',
  },
  janaFloatingImg: {
    width: 60,
    height: 100,
  },
  cartBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 180,
  },
  cartBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  cartBubbleTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  janaAssistant: {
    position: 'absolute',
    bottom: 135,
    zIndex: 998,
    alignItems: 'center',
    maxWidth: 200,
  },
  assistantBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 200,
  },
  assistantBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  assistantBubbleTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  assistantImg: {
    width: 55,
    height: 90,
  },
  peekContainer: {
    position: 'absolute',
    bottom: 125,
    right: 16,
    zIndex: 997,
    alignItems: 'center',
  },
  peekBubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: 190,
  },
  peekBubbleText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  peekBubbleTail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  peekImageWrap: {
    alignItems: 'center',
  },
  peekImage: {
    width: 50,
    height: 80,
  },
  heroContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  heroInner: {
    alignItems: 'center',
  },
  heroBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 240,
    alignItems: 'center',
  },
  heroBubbleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroBubbleName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B21A8',
  },
  heroBubbleText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  heroBubbleTail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  heroImage: {
    width: 80,
    height: 130,
  },
  textOnlyAnchor: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});
