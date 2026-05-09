import React from 'react';
import { Image } from 'react-native';

interface IconProps {
  size?: number;
}

export const InstagramIcon = ({ size = 20 }: IconProps) => (
  <Image
    source={require('@/assets/images/social-instagram.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export const XTwitterIcon = ({ size = 20 }: IconProps) => (
  <Image
    source={require('@/assets/images/social-x.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export const FacebookIcon = ({ size = 20 }: IconProps) => (
  <Image
    source={require('@/assets/images/social-facebook.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export const TikTokIcon = ({ size = 20 }: IconProps) => (
  <Image
    source={require('@/assets/images/social-tiktok.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export const SnapchatIcon = ({ size = 20 }: IconProps) => (
  <Image
    source={require('@/assets/images/social-snapchat.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

export const WebsiteIcon = ({ size = 20 }: IconProps) => (
  <Image
    source={require('@/assets/images/social-website.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);
