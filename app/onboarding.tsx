import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Animated,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Globe } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  image: string;
  titleAr: string;
  titleHe: string;
  descAr: string;
  descHe: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=900&q=80',
    titleAr: 'أجمل الورود والباقات',
    titleHe: 'הפרחים היפים ביותר',
    descAr: 'تشكيلة واسعة من الورود الطبيعية والباقات المصممة بعناية لتناسب كل مناسبة وكل ذوق',
    descHe: 'מגוון רחב של פרחים טבעיים וזרים מעוצבים לכל אירוע וכל טעם',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=900&q=80',
    titleAr: 'كيك وشوكولاته فاخرة',
    titleHe: 'עוגות ושוקולד יוקרתיים',
    descAr: 'أشهى أنواع الكيك الطازج والشوكولاته الفاخرة من أفضل المتاجر المحلية',
    descHe: 'העוגות הטריות והשוקולד היוקרתי הטוב ביותר מהחנויות המקומיות',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=900&q=80',
    titleAr: 'هدايا لكل المناسبات',
    titleHe: 'מתנות לכל אירוע',
    descAr: 'اختار الهدية الحلوة لأحبائك مع توصيل سريع وموثوق لجميع المدن',
    descHe: 'בחר את המתנה המושלמת לאהוביך עם משלוח מהיר ואמין לכל הערים',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, setHasSeenOnboarding, language, setLanguage } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isAr = language === 'ar';

  const handleSkip = useCallback(async () => {
    await setHasSeenOnboarding();
    router.replace('/');
  }, [setHasSeenOnboarding, router]);

  const handleNext = useCallback(async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      await setHasSeenOnboarding();
      router.replace('/');
    }
  }, [currentIndex, setHasSeenOnboarding, router]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = currentIndex === slides.length - 1;

  const toggleLang = useCallback(() => {
    setLanguage(language === 'ar' ? 'he' : 'ar');
  }, [language, setLanguage]);

  const getTitle = (item: OnboardingSlide) => isAr ? item.titleAr : item.titleHe;
  const getDesc = (item: OnboardingSlide) => isAr ? item.descAr : item.descHe;

  const renderSlide = useCallback(({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={styles.slide}>
        <Image source={{ uri: item.image }} style={styles.slideImage} contentFit="cover" />
        <View style={styles.overlay} />
        <View style={styles.contentContainer}>
          <Text style={styles.slideTitle}>{getTitle(item)}</Text>
          <Text style={styles.slideDesc}>{getDesc(item)}</Text>
        </View>
      </View>
    );
  }, [isAr]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      <View style={styles.langBtnWrap}>
        <TouchableOpacity style={styles.langBtn} onPress={toggleLang} activeOpacity={0.8}>
          <Globe size={16} color="#E88AAE" />
          <Text style={styles.langBtnText}>{language === 'ar' ? 'עברית' : 'العربية'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor: '#E88AAE',
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>{isAr ? 'تخطي' : 'דלג'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextBtn, isLast && styles.getStartedBtn]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {isLast ? (isAr ? 'يلا نبدأ' : 'בוא נתחיל') : (isAr ? 'التالي' : 'הבא')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width,
    height,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 14,
    lineHeight: 46,
    textShadow: '0px 2px 10px rgba(0,0,0,0.6)',
  },
  slideDesc: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
    textShadow: '0px 1px 6px rgba(0,0,0,0.5)',
  },
  langBtnWrap: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  nextBtn: {
    backgroundColor: '#E88AAE',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  getStartedBtn: {
    paddingHorizontal: 44,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
