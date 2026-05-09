/**
 * مستمعات Firestore لتحديثات الطلبات — إشعارات محلية عند تغيّر الحالة (عميل/تاجر)
 * تكمّل إشعارات الـ Push القادمة من Cloud Functions عند فتح التطبيق.
 */
import { isFirebaseConfigured } from '@/services/firebase';

export interface OrderSnapshotPayload {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName?: string;
}

function statusLabel(status: string, lang: 'ar' | 'he'): string {
  const map: Record<string, { ar: string; en: string }> = {
    pending: { ar: 'قيد الانتظار', en: 'Pending' },
    confirmed: { ar: 'قيد التجهيز', en: 'Confirmed' },
    processing: { ar: 'قيد التجهيز', en: 'Processing' },
    preparing: { ar: 'قيد التجهيز', en: 'Preparing' },
    delivered: { ar: 'تم التسليم', en: 'Delivered' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
    notReceived: { ar: 'عدم استلام الطلب', en: 'Not received' },
    not_received: { ar: 'عدم استلام الطلب', en: 'Not received' },
  };
  return map[status]?.[lang] ?? status;
}

/**
 * عميل: عند تغيير status لطلبه (مثلاً من التاجر أو من لوحة الويب) → إشعار.
 */
export function subscribeCustomerOrderStatusChanges(
  customerId: string,
  language: 'ar' | 'en',
  onStatusChanged: (payload: OrderSnapshotPayload, label: string) => void
): () => void {
  if (!isFirebaseConfigured() || !customerId) return () => {};

  let unsubscribe: (() => void) | null = null;
  const prevStatusById = new Map<string, string>();
  let initialHydrated = false;

  (async () => {
    try {
      const { getFirebase } = await import('@/services/firebase');
      const { collection, query, where, onSnapshot } = await import('firebase/firestore');
      const { db } = await getFirebase();
      if (!db) return;

      const q = query(collection(db as import('firebase/firestore').Firestore, 'orders'), where('customerId', '==', customerId));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!initialHydrated) {
            snapshot.docs.forEach((docSnap) => {
              const d = docSnap.data() as Record<string, unknown>;
              prevStatusById.set(docSnap.id, String(d.status ?? ''));
            });
            initialHydrated = true;
            return;
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'modified') return;
            const d = change.doc.data() as Record<string, unknown>;
            const id = change.doc.id;
            const nextStatus = String(d.status ?? '');
            const prev = prevStatusById.get(id);
            prevStatusById.set(id, nextStatus);
            if (prev === undefined || prev === nextStatus) return;

            const payload: OrderSnapshotPayload = {
              orderId: id,
              orderNumber: String(d.orderNumber ?? id.slice(0, 8)),
              status: nextStatus,
              total: typeof d.totalAmount === 'number' ? d.totalAmount : 0,
            };
            const label = statusLabel(nextStatus, language);
            onStatusChanged(payload, label);
          });
        },
        (err) => console.warn('[orderPushTriggers] customer orders listener:', err)
      );
    } catch (e) {
      console.warn('[orderPushTriggers] subscribeCustomerOrderStatusChanges:', e);
    }
  })();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/**
 * تاجر: طلب جديد يظهر في orders بـ merchantId → إشعار طلب جديد.
 */
export function subscribeMerchantNewOrders(
  merchantId: string,
  onNewOrder: (payload: OrderSnapshotPayload) => void
): () => void {
  if (!isFirebaseConfigured() || !merchantId) return () => {};

  let unsubscribe: (() => void) | null = null;
  const knownIds = new Set<string>();
  let initialHydrated = false;

  (async () => {
    try {
      const { getFirebase } = await import('@/services/firebase');
      const { collection, query, where, onSnapshot } = await import('firebase/firestore');
      const { db } = await getFirebase();
      if (!db) return;

      const q = query(
        collection(db as import('firebase/firestore').Firestore, 'orders'),
        where('merchantId', '==', merchantId)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!initialHydrated) {
            snapshot.docs.forEach((docSnap) => knownIds.add(docSnap.id));
            initialHydrated = true;
            return;
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const id = change.doc.id;
            if (knownIds.has(id)) return;
            knownIds.add(id);
            const d = change.doc.data() as Record<string, unknown>;
            const payload: OrderSnapshotPayload = {
              orderId: id,
              orderNumber: String(d.orderNumber ?? id.slice(0, 8)),
              status: String(d.status ?? 'pending'),
              total: typeof d.totalAmount === 'number' ? d.totalAmount : 0,
              customerName: typeof d.customerName === 'string' ? d.customerName : undefined,
            };
            onNewOrder(payload);
          });
        },
        (err) => console.warn('[orderPushTriggers] merchant orders listener:', err)
      );
    } catch (e) {
      console.warn('[orderPushTriggers] subscribeMerchantNewOrders:', e);
    }
  })();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

export { statusLabel };
