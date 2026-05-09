import React, { useRef, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();

  const routeCount = state?.routes?.length ?? 0;
  const currentIndex = state?.index ?? 0;

  const animatedValues = useRef(
    Array.from({ length: Math.max(routeCount, 4) }, (_, i) => new Animated.Value(i === currentIndex ? 1 : 0))
  ).current;

  useEffect(() => {
    if (!state?.routes) return;
    state.routes.forEach((_, i) => {
      if (animatedValues[i]) {
        Animated.spring(animatedValues[i], {
          toValue: i === state.index ? 1 : 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      }
    });
  }, [currentIndex, animatedValues, routeCount]);

  if (!state || !state.routes || state.routes.length === 0) {
    return null;
  }

  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={[
        styles.tabBarInner,
        {
          backgroundColor: colors.tabBarBg,
          borderColor: colors.glassBorder,
          borderWidth: 1,
        },
      ]}>
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const scale = animatedValues[index]?.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1],
            }) ?? 1;

            const icon = options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? colors.primary : colors.tabBarInactive,
              size: 24,
            });

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.tabItem}
                testID={`tab-${route.name}`}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    isFocused && { backgroundColor: colors.primary + '15' },
                    { transform: [{ scale }] },
                  ]}
                >
                  {icon}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabBarInner: {
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.08)',
    elevation: 12,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    } as any : {}),
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
