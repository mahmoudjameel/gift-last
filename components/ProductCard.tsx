import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MapPinned, CircleUserRound, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onToggleFavorite?: (id: string) => void;
  style?: object;
}

function ProductCardInner({ product, onToggleFavorite, style }: ProductCardProps) {
  const router = useRouter();
  const { colors, language, isRTL } = useApp();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    router.push(`/product/${product.id}` as any);
  }, [product.id, router]);

  const handleFavorite = useCallback(() => {
    onToggleFavorite?.(product.id);
  }, [product.id, onToggleFavorite]);

  const displayName = language === 'ar' ? product.name : product.nameEn;
  const sar = '₪';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  const writingDir = isRTL ? 'rtl' : 'ltr';
  const textAlign = 'left';
  const flexDirection = 'row';

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.card, { backgroundColor: colors.card }]}
        testID={`product-card-${product.id}`}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
          <TouchableOpacity
            onPress={handleFavorite}
            style={[styles.heartButton, isRTL ? { left: 10, right: undefined } : { right: 10, left: undefined }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart
              size={20}
              color={product.isFavorite ? colors.primary : '#FFFFFF'}
              fill={product.isFavorite ? colors.primary : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
        <View style={[styles.info, { alignItems: 'flex-start' }]}>
          <Text style={[styles.name, { color: colors.text, textAlign, writingDirection: writingDir }]} numberOfLines={1}>{displayName}</Text>
          <View style={[styles.shopRow, { flexDirection }]}>
            <CircleUserRound size={10} color={colors.textSecondary} />
            <Text style={[styles.shop, { color: colors.textSecondary, writingDirection: writingDir }]} numberOfLines={1}>{product.shopName}</Text>
          </View>
          <View style={[styles.locationRow, { flexDirection }]}>
            <MapPinned size={10} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary, writingDirection: writingDir }]}>{product.city ?? 'جدة'}</Text>
          </View>
          <View style={[styles.ratingRow, { flexDirection }]}>
            <Star size={12} color={colors.warning} fill={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.textSecondary, writingDirection: writingDir }]}>{product.rating}</Text>
          </View>
          <View style={[styles.priceRow, { flexDirection }]}>
            <Text style={[styles.price, { color: colors.primary, writingDirection: writingDir }]}>{product.price} {sar}</Text>
            {hasDiscount ? (
              <Text style={[styles.originalPrice, { color: colors.textMuted, writingDirection: writingDir }]}>{product.originalPrice} {sar}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(ProductCardInner, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.originalPrice === nextProps.product.originalPrice &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.nameEn === nextProps.product.nameEn &&
    prevProps.product.image === nextProps.product.image &&
    prevProps.product.isFavorite === nextProps.product.isFavorite &&
    prevProps.product.rating === nextProps.product.rating &&
    prevProps.product.city === nextProps.product.city &&
    prevProps.product.shopName === nextProps.product.shopName &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    padding: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 4,
    width: '100%',
  },
  shopRow: {
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  shop: {
    fontSize: 11,
  },
  locationRow: {
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
  },
  ratingRow: {
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  priceRow: {
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
});
