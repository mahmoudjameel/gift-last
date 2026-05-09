import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { isFirebaseConfigured } from '@/services/firebase';
import {
  registerForExpoPushTokenAsync,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getNotificationData,
  presentLocalNotification,
} from '@/services/pushNotifications';
import { saveExpoPushToken } from '@/services/merchantFirestore';
import { subscribeCustomerOrderStatusChanges, subscribeMerchantNewOrders } from '@/services/orderPushTriggers';

/**
 * تسجيل Expo Push وحفظ التوكن في Firestore + مستمعات تحديث الطلبات + التنقل عند الضغط على إشعار.
 * ضع المكوّن داخل AppProvider وداخل شجرة expo-router.
 */
export function PushNotificationBootstrap() {
  const router = useRouter();
  const { isAuthenticated, isGuest, user, role, language, pushNotification } = useApp();
  const lastTokenRegistration = useRef<{ userId: string; token: string; role: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isGuest || !user?.id || !isFirebaseConfigured()) {
      lastTokenRegistration.current = null;
      return;
    }

    const cleanups: Array<() => void> = [];

    (async () => {
      try {
        const token = await registerForExpoPushTokenAsync();
        if (!token) return;
        const appRole = role === 'merchant' ? 'merchant' : 'customer';
        const prev = lastTokenRegistration.current;
        const needSave =
          !prev ||
          prev.userId !== user.id ||
          prev.token !== token ||
          prev.role !== appRole;
        if (needSave) {
          const platform: 'ios' | 'android' | 'web' | 'unknown' =
            Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'unknown';
          await saveExpoPushToken(user.id, token, appRole, platform);
          lastTokenRegistration.current = { userId: user.id, token, role: appRole };
        }
      } catch (e) {
        console.warn('[PushNotificationBootstrap] token save:', e);
      }
    })();

    const subRecv = addNotificationReceivedListener((notification) => {
      const data = (notification.request.content.data ?? {}) as Record<string, unknown>;
      const type = String(data.type ?? '');
      const title = String(notification.request.content.title ?? '');
      const body = String(notification.request.content.body ?? '');
      const orderId = data.orderId ? String(data.orderId) : undefined;
      if (type === 'order_status' && orderId) {
        pushNotification({
          type: 'order_status',
          title: title || (language === 'ar' ? 'تحديث الطلب' : 'Order update'),
          message: body || '',
          targetRole: 'customer',
          orderId,
        });
      }
      if (type === 'new_order' && orderId) {
        pushNotification({
          type: 'new_order',
          title: title || (language === 'ar' ? 'طلب جديد' : 'New order'),
          message: body || '',
          targetRole: 'merchant',
          orderId,
        });
      }
    });
    cleanups.push(() => subRecv.remove());

    const subResp = addNotificationResponseListener((response) => {
      const data = getNotificationData(response);
      const type = String(data.type ?? '');
      const orderId = data.orderId ? String(data.orderId) : '';
      const chatId = data.chatId ? String(data.chatId) : '';
      const target = String(data.targetRole ?? '');

      if (chatId) {
        router.push(`/chat/${chatId}` as any);
        return;
      }
      if (!orderId) return;

      if (type === 'new_order' || target === 'merchant') {
        router.push(`/(merchant-tabs)/orders/${orderId}` as any);
        return;
      }
      router.push(`/order-detail/${orderId}` as any);
    });
    cleanups.push(() => subResp.remove());

    if (role === 'customer') {
      const unsub = subscribeCustomerOrderStatusChanges(user.id, language, (payload, label) => {
        const title = language === 'ar' ? `تحديث الطلب ${payload.orderNumber}` : `Order ${payload.orderNumber}`;
        const message =
          language === 'ar' ? `تم تغيير الحالة إلى: ${label}` : `Status updated to: ${label}`;
        pushNotification({
          type: 'order_status',
          title,
          message,
          targetRole: 'customer',
          orderId: payload.orderId,
        });
        void presentLocalNotification(title, message, { type: 'order_status', orderId: payload.orderId, targetRole: 'customer' });
      });
      cleanups.push(unsub);
    }

    if (role === 'merchant') {
      const unsub = subscribeMerchantNewOrders(user.id, (payload) => {
        const title = language === 'ar' ? `طلب جديد ${payload.orderNumber}` : `New order ${payload.orderNumber}`;
        const who = payload.customerName ?? '';
        const message =
          language === 'ar'
            ? who
              ? `من ${who} — ${payload.total} ₪`
              : `قيمة ${payload.total} ₪`
            : who
              ? `From ${who} — ${payload.total} ₪`
              : `${payload.total} ₪`;
        pushNotification({
          type: 'new_order',
          title,
          message,
          targetRole: 'merchant',
          orderId: payload.orderId,
        });
        void presentLocalNotification(title, message, { type: 'new_order', orderId: payload.orderId, targetRole: 'merchant' });
      });
      cleanups.push(unsub);
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isAuthenticated, isGuest, user?.id, role, language, pushNotification, router]);

  return null;
}
