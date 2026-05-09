import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const kadoLogo = require('@/assets/images/icon.png');

interface KadoLogoProps {
  size?: number;
}

export default function KadoLogo({ size = 80 }: KadoLogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <Image
        source={kadoLogo}
        style={{ width: size, height: size, borderRadius: size * 0.18 }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
