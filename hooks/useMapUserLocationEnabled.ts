import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * يفعّل نقطة «موقعي» على الخريطة فقط عند منح إذن الموقع —
 * يقلل كراشات Google/Apple Maps عند عرض المستخدم بدون إذن.
 */
export function useMapUserLocationEnabled(visible: boolean): boolean {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') {
      setGranted(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!cancelled) setGranted(status === 'granted');
      } catch {
        if (!cancelled) setGranted(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  return granted;
}
