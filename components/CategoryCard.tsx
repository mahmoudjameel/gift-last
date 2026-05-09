import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  onPress?: (category: Category) => void;
}

function CategoryCardInner({ category, onPress }: CategoryCardProps) {
  const handlePress = useCallback(() => {
    onPress?.(category);
  }, [category, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={styles.card}
      testID={`category-${category.id}`}
    >
      <Image
        source={{ uri: category.image }}
        style={styles.image}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      />
      <View style={styles.labelContainer}>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.count}>{category.count} items</Text>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(CategoryCardInner);

const styles = StyleSheet.create({
  card: {
    width: 110,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  count: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },
});
