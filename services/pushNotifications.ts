/**
 * Expo Push Notifications — تسجيل التوكن وعرض الإشعارات.
 * يتكامل مع Cloud Functions عبر حقل expoPushToken في Firestore (users / merchants).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Petalia',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E88AAE',
    });
  }
}

function resolveExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const eas = extra?.eas as { projectId?: string } | undefined;
  return (
    (extra?.easProjectId as string | undefined) ||
    eas?.projectId ||
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

/**
 * يعيد توكن Expo Push (للإرسال عبر https://exp.host/--/api/v2/push/send أو expo-server-sdk في Functions).
 */
export async function registerForExpoPushTokenAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!Device.isDevice) {
    console.warn('[Push] Push tokens require a physical device');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[Push] Notification permission not granted');
    return null;
  }

  await ensureAndroidNotificationChannel();

  const projectId = resolveExpoProjectId();
  try {
    const opts = projectId ? { projectId } : undefined;
    const push = await Notifications.getExpoPushTokenAsync(opts as { projectId: string });
    return push.data ?? null;
  } catch (e) {
    console.warn('[Push] getExpoPushTokenAsync failed — set extra.eas.projectId in app.json (EAS):', e);
    return null;
  }
}

export async function presentLocalNotification(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}, sound: true },
    trigger: null,
  });
}

export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export function getNotificationData(response: Notifications.NotificationResponse): Record<string, unknown> {
  return (response.notification.request.content.data ?? {}) as Record<string, unknown>;
}
