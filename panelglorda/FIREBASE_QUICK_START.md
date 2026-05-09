# دليل سريع لربط Firebase بالتطبيق

## 🔑 المفاتيح الأساسية

### 1. متغيرات البيئة المطلوبة
```env
# للعميل (Client/App)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

---

## 📱 خطوات الربط في التطبيق

### الخطوة 1: تثبيت Firebase
```bash
npm install firebase
# أو للتطبيق
npm install firebase @react-native-firebase/app @react-native-firebase/auth
```

### الخطوة 2: إعداد Firebase
```typescript
// firebase.config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### الخطوة 3: تسجيل الدخول
```typescript
// 1. إرسال email/password إلى API
const response = await fetch('https://api.glorda.com/api/auth/login/merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

const { token, merchant } = await response.json();

// 2. تسجيل الدخول في Firebase
import { signInWithCustomToken } from 'firebase/auth';
const credential = await signInWithCustomToken(auth, token);
```

### الخطوة 4: إرسال الطلبات مع Token
```typescript
async function apiRequest(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    return fetch(url, { ...options, headers });
}
```

### الخطوة 5: رفع الملفات
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadFile(file: File, folder: string) {
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, file, { contentType: file.type });
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
}
```

---

## 🔄 تدفق المصادقة

```
1. المستخدم يدخل email/password
   ↓
2. التطبيق يرسل إلى: POST /api/auth/login/merchant
   ↓
3. السيرفر يتحقق من البيانات في Firestore
   ↓
4. السيرفر ينشئ Custom Token مع Custom Claims:
   - userId: merchant.id
   - userType: "merchant"
   ↓
5. التطبيق يستقبل Custom Token
   ↓
6. التطبيق يستخدم signInWithCustomToken()
   ↓
7. Firebase يعيد ID Token
   ↓
8. التطبيق يضيف ID Token في كل طلب:
   Authorization: Bearer {idToken}
   ↓
9. السيرفر يتحقق من Token ويستخرج userId و userType
```

---

## 📊 Collections في Firestore

```
users/{uid}
  - role: "merchant" | "admin"
  - email, name
  - merchantId?: number

merchants/{merchantId}
  - email, password (hashed)
  - storeName, ownerName
  - status: "pending" | "active" | "suspended"
  - balance: number

products/{productId}
  - merchantId, name, price
  - images: string[]
  - status: "active" | "hidden"

orders/{orderId}
  - merchantId, customerId, productId
  - status, totalAmount
  - messages: subcollection
  - optionSelections: subcollection

notifications/{notificationId}
  - recipientId, recipientRole
  - title, body, type
  - isRead, createdAt
```

---

## 🎯 الوظائف الأساسية

### 1. المصادقة
- ✅ تسجيل الدخول: `POST /api/auth/login/merchant`
- ✅ تسجيل الخروج: `signOut(auth)`
- ✅ التحقق من Token: تلقائي في كل طلب

### 2. قاعدة البيانات
- ✅ القراءة: `getDoc()`, `getDocs()`, `query()`
- ✅ الكتابة: `setDoc()`, `addDoc()`, `updateDoc()`
- ✅ Real-time: `onSnapshot()`

### 3. التخزين
- ✅ رفع: `uploadBytes()`
- ✅ URL: `getDownloadURL()`

### 4. الإشعارات
- ✅ الاستماع: `onSnapshot(notificationsQuery)`
- ✅ تحديث: `updateDoc({ isRead: true })`

---

## ⚠️ نقاط مهمة

1. **استخدم نفس Firebase Project** - نفس `projectId` و `apiKey`
2. **Custom Tokens** - السيرفر ينشئها، التطبيق يستخدمها
3. **ID Token في كل طلب** - أضف `Authorization: Bearer {token}`
4. **Real-time Updates** - استخدم `onSnapshot` للإشعارات
5. **Error Handling** - تعامل مع أخطاء Firebase

---

## 📝 مثال كامل

```typescript
// 1. إعداد Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 2. تسجيل الدخول
async function login(email: string, password: string) {
    // الحصول على Custom Token
    const res = await fetch('https://api.glorda.com/api/auth/login/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const { token, merchant } = await res.json();
    
    // تسجيل الدخول في Firebase
    await signInWithCustomToken(auth, token);
    
    return merchant;
}

// 3. إرسال طلب مع Token
async function getProfile() {
    const user = auth.currentUser;
    const token = await user.getIdToken();
    
    const res = await fetch('https://api.glorda.com/api/merchant/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return res.json();
}

// 4. الاستماع للإشعارات
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function subscribeNotifications(userId: string) {
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", userId)
    );
    
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // تحديث UI
    });
}
```

---

## 🔗 الملفات المرجعية

- `client/src/lib/firebase.ts` - تكوين Firebase للعميل
- `server/firebaseConfig.ts` - تكوين Firebase للسيرفر
- `server/routes.ts` - API routes مع Firebase Auth
- `client/src/lib/api-client.ts` - API client مع Token
- `client/src/lib/firestore.ts` - عمليات Firestore
- `client/src/lib/storage-upload.ts` - رفع الملفات
- `client/src/lib/notifications.ts` - الإشعارات

---

## ✅ Checklist للربط

- [ ] تثبيت Firebase SDK
- [ ] إعداد firebaseConfig بنفس القيم
- [ ] تنفيذ تسجيل الدخول مع Custom Token
- [ ] إضافة Token في كل طلب API
- [ ] رفع الملفات إلى Firebase Storage
- [ ] الاستماع للإشعارات Real-time
- [ ] معالجة الأخطاء بشكل صحيح







