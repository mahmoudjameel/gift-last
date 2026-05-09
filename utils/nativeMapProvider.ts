import { Platform } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';

/**
 * iOS on Expo Go does not reliably support Google provider in react-native-maps.
 * Use Apple Maps there to avoid blank map, and keep Google for dev/prod builds.
 */
export function getNativeMapProvider(): typeof PROVIDER_GOOGLE | undefined {
  if (Platform.OS === 'web') return undefined;
  const isExpoGo = Constants.appOwnership === 'expo';
  if (Platform.OS === 'ios' && isExpoGo) return undefined;
  return PROVIDER_GOOGLE;
}
