# إشعارات Push (Expo) + Firestore + Cloud Functions

## ما يفعله التطبيق الجديد

1. **بعد تسجيل الدخول** (عميل أو تاجر، وليس وضع زائر):
   - يطلب إذن الإشعارات.
   - يحصل على **Expo Push Token**.
   - يحفظه في Firestore:
     - `users/{uid}`: `expoPushToken`, `expoPushTokenUpdatedAt`, `pushNotificationPlatform`, `lastPushAppRole`
     - `merchants/{uid}` (للتاجر فقط): نفس حقول التوكن حتى تستطيع دوالك قراءة التاجر مباشرة.

2. **أثناء تشغيل التطبيق**:
   - **عميل**: مستمع على `orders` حيث `customerId == uid`؛ عند تغيّر `status` يُضاف إشعار داخل التطبيق + إشعار محلي (banner).
   - **تاجر**: مستمع على `orders` حيث `merchantId == uid`؛ عند إضافة طلب جديد يُضاف إشعار تاجر + إشعار محلي.

3. **إشعارات واردة من الخادم** (FCM / Expo Push عبر Cloud Functions):
   - عند استقبال إشعار يحتوي `data.type` و`data.orderId` يُحدَّث مركز الإشعارات في التطبيق.
   - عند الضغط على الإشعار: التنقل حسب `type` و`targetRole` (انظر أدناه).

## إعداد EAS Project ID

في `app.json` → `expo.extra.eas.projectId` ضع **معرّف مشروع Expo** الحقيقي من [expo.dev](https://expo.dev) (بعد `eas init` أو من لوحة المشروع).  
بدون معرّف صحيح قد يفشل `getExpoPushTokenAsync` على أجهزة حقيقية.

## تنسيق `data` المقترح لـ Cloud Functions

للتوافق مع شاشات التطبيق و`PushNotificationBootstrap`:

| الحقل | الوصف |
|--------|--------|
| `type` | `order_status` (عميل) \| `new_order` (تاجر) \| `chat` (محادثة) |
| `orderId` | معرف وثيقة الطلب في `orders` |
| `chatId` | معرف محادثة في `directConversations` |
| `targetRole` | `customer` أو `merchant` (للمساعدة في التنقل عند الضغط) |

**مثال إرسال عبر Expo Push HTTP API** (من Cloud Function):

```bash
curl -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -X POST https://exp.host/--/api/v2/push/send \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "تحديث الطلب",
    "body": "تم تغيير حالة طلبك",
    "data": { "type": "order_status", "orderId": "ORDER_DOC_ID", "targetRole": "customer" }
  }'
```

أو استخدام **`expo-server-sdk`** في **`glorda/panelglorda/functions`** (انظر `MERCHANT_PUSH.md` هناك لتوكن التاجر و`onOrderCreate`).

## ملاحظة عن FCM مقابل Expo

- توكن **Expo Push** ≠ توكن **FCM الأصلي**. إذا كانت دوالك القديمة ترسل عبر FCM مباشرة، إمّا:
  - تُحدّث الدوال لتقرأ `expoPushToken` وتُرسل عبر **Expo Push API**، أو
  - تضيف في التطبيق لاحقاً `@react-native-firebase/messaging` لحفظ `fcmToken` بجانب `expoPushToken`.

## الملفات ذات الصلة

- `services/pushNotifications.ts` — تسجيل التوكن والقنوات والعرض المحلي
- `services/orderPushTriggers.ts` — مستمعات Firestore للطلبات
- `services/merchantFirestore.ts` — `saveExpoPushToken`
- `components/PushNotificationBootstrap.tsx` — ربط كل ما سبق بـ `AppContext` و`expo-router`
