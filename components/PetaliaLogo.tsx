import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

const kadoLogo = require('@/assets/images/kado-logo.jpeg');

interface PetaliaLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
  textColor?: string;
}

export default function PetaliaLogo({ size = 80 }: PetaliaLogoProps) {
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
