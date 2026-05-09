# دليل تكامل Firebase مع المشروع

## نظرة عامة

المشروع يستخدم Firebase بشكل كامل للمصادقة، قاعدة البيانات (Firestore)، والتخزين (Storage). هذا الدليل يشرح كيفية ربط Firebase بالموقع وكيفية استخدام نفس الوظائف في التطبيق.

---

## 1. إعداد Firebase

### متغيرات البيئة المطلوبة

#### للعميل (Client):
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

#### للخادم (Server):
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

---

## 2. ملفات التكوين

### أ. تكوين العميل (`client/src/lib/firebase.ts`)

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

**الوظائف:**
- `app`: تطبيق Firebase الرئيسي
- `auth`: خدمة المصادقة
- `db`: قاعدة بيانات Firestore
- `storage`: خدمة التخزين

---

### ب. تكوين الخادم (`server/firebaseConfig.ts`)

```typescript
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID || 'njik-app';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

const firebaseApp = admin.initializeApp({
    projectId,
    storageBucket,
});

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const auth = getAuth(firebaseApp);
```

**الوظائف:**
- `db`: Firestore Admin SDK
- `storage`: Firebase Storage Admin SDK
- `auth`: Firebase Auth Admin SDK (لإنشاء Custom Tokens)

---

## 3. نظام المصادقة (Authentication)

### أ. تسجيل الدخول (Login)

#### للتاجر (Merchant):
```typescript
// في routes.ts - السيرفر
app.post("/api/auth/login/merchant", async (req, res) => {
    const { email, password } = req.body;
    
    // التحقق من بيانات الدخول في Firestore
    const merchant = await storage.getMerchantByEmail(email);
    const isValidPassword = await bcrypt.compare(password, merchant.password);
    
    // إنشاء Firebase Custom Token مع Custom Claims
    const customToken = await auth.createCustomToken(`merchant_${merchant.id}`, {
        userId: merchant.id,
        userType: "merchant",
        email: merchant.email
    });
    
    res.json({ success: true, merchant, token: customToken });
});
```

#### للعميل (Client):
```typescript
// في Login.tsx
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// بعد الحصول على customToken من API
const credential = await signInWithCustomToken(auth, customToken);
```

---

### ب. التحقق من الهوية في الطلبات (Token Verification)

#### في السيرفر (`server/routes.ts`):
```typescript
const verifyFirebaseToken: RequestHandler = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);

        // استخراج Custom Claims
        req.userId = decodedToken.userId as number;
        req.userType = decodedToken.userType as "merchant" | "admin";

        next();
    } catch (error) {
        return res.status(401).json({ error: "غير مصرح" });
    }
};
```

#### في العميل (`client/src/lib/api-client.ts`):
```typescript
export async function apiClient(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    let token: string | null = null;

    if (user) {
        token = await user.getIdToken();
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
```

---

### ج. إدارة حالة المستخدم (`client/src/hooks/useAuth.tsx`)

```typescript
export function AuthProvider({ children }) {
    const [user, setUser] = useState<User | null>(null);
    const [userType, setUserType] = useState<"merchant" | "admin" | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // جلب بيانات المستخدم من Firestore
                const userDoc = await getDocData(`users/${firebaseUser.uid}`);
                
                if (userDoc.role === "merchant") {
                    const merchantDoc = await getDocData(`merchants/${merchantId}`);
                    setUser({ ...merchantDoc });
                    setUserType("merchant");
                }
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userType, ... }}>
            {children}
        </AuthContext.Provider>
    );
}
```

---

## 4. قاعدة البيانات Firestore

### أ. العمليات الأساسية (`client/src/lib/firestore.ts`)

```typescript
// قراءة وثيقة واحدة
export async function getDocData<T>(path: string): Promise<T | null> {
    const snapshot = await getDoc(doc(db, path));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as T;
}

// كتابة/تحديث وثيقة
export async function setDocData(path: string, data: Record<string, unknown>) {
    await setDoc(doc(db, path), {
        ...data,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
    }, { merge: true });
}

// إضافة وثيقة جديدة
export async function addCollectionDoc(collectionPath: string, data: Record<string, unknown>) {
    const ref = await addDoc(collection(db, collectionPath), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

// جلب وثائق بشرط
export async function getCollectionWhere<T>(
    collectionPath: string,
    field: string,
    value: unknown
): Promise<T[]> {
    const q = query(collection(db, collectionPath), where(field, "==", value));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}
```

---

### ب. العمليات على السيرفر (`server/firebaseStorage.ts`)

```typescript
export class FirebaseStorage implements IStorage {
    // مثال: جلب تاجر
    async getMerchant(id: number): Promise<Merchant | undefined> {
        const doc = await db.collection('merchants').doc(id.toString()).get();
        if (!doc.exists) return undefined;
        return { id: parseInt(doc.id), ...doc.data() } as Merchant;
    }

    // مثال: إنشاء تاجر
    async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
        const docRef = db.collection('merchants').doc();
        const id = parseInt(docRef.id.slice(0, 10), 36);
        const data = {
            ...merchant,
            id,
            balance: 0,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { ...data, createdAt: new Date() } as Merchant;
    }
}
```

---

## 5. التخزين Firebase Storage

### أ. رفع الملفات من العميل (`client/src/lib/storage-upload.ts`)

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadToStorage(file: File, folder: string): Promise<string> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file, {
        contentType: file.type,
    });

    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}
```

---

### ب. رفع الملفات من السيرفر (`server/routes.ts`)

```typescript
async function uploadToFirebase(file: Express.Multer.File, folder: string): Promise<string> {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `${folder}/${uniqueSuffix}${path.extname(file.originalname)}`;
    const fileUpload = bucket.file(filename);

    const stream = fileUpload.createWriteStream({
        metadata: {
            contentType: file.mimetype,
        },
    });

    return new Promise((resolve, reject) => {
        stream.on("error", reject);
        stream.on("finish", async () => {
            await fileUpload.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
            resolve(publicUrl);
        });
        stream.end(file.buffer);
    });
}
```

---

## 6. الإشعارات (Notifications)

### أ. إنشاء إشعار (`client/src/lib/notifications.ts`)

```typescript
export const addNotification = async (
    recipientId: string,
    recipientRole: "merchant" | "admin" | "customer",
    title: string,
    body: string,
    type: "system" | "order" | "withdrawal" | "verification" | "review",
    link?: string
) => {
    await addDoc(collection(db, "notifications"), {
        recipientId,
        recipientRole,
        title,
        body,
        type,
        link,
        isRead: false,
        createdAt: serverTimestamp(),
    });
};
```

### ب. جلب الإشعارات

```typescript
export const getUserNotifications = async (userId: string, limitCount = 20) => {
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Notification[];
};
```

---

## 7. هيكل البيانات في Firestore

### Collections الرئيسية:

1. **users** - بيانات المستخدمين
   ```
   users/{uid}
   - role: "merchant" | "admin"
   - email: string
   - name: string
   - merchantId?: number
   ```

2. **merchants** - بيانات التجار
   ```
   merchants/{merchantId}
   - email, password (hashed)
   - storeName, ownerName
   - status: "pending" | "active" | "suspended"
   - balance: number
   - createdAt, updatedAt
   ```

3. **products** - المنتجات
   ```
   products/{productId}
   - merchantId, name, price
   - images: string[]
   - status: "active" | "hidden"
   - options: subcollection
   ```

4. **orders** - الطلبات
   ```
   orders/{orderId}
   - merchantId, customerId, productId
   - status, totalAmount
   - messages: subcollection
   - optionSelections: subcollection
   ```

5. **notifications** - الإشعارات
   ```
   notifications/{notificationId}
   - recipientId, recipientRole
   - title, body, type
   - isRead, createdAt
   ```

---

## 8. كيفية ربط التطبيق (Mobile App)

### الخطوات المطلوبة:

#### 1. تثبيت المكتبات:
```bash
npm install firebase @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage
```

#### 2. إعداد Firebase في التطبيق:

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

#### 3. تسجيل الدخول:

```typescript
// في التطبيق
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase.config';

// 1. إرسال email/password إلى API
const response = await fetch('https://your-api.com/api/auth/login/merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

const { token, merchant } = await response.json();

// 2. تسجيل الدخول باستخدام Custom Token
const credential = await signInWithCustomToken(auth, token);

// 3. حفظ بيانات المستخدم
await AsyncStorage.setItem('user', JSON.stringify(merchant));
```

#### 4. إرسال الطلبات مع Token:

```typescript
import { auth } from './firebase.config';

async function apiRequest(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    let token: string | null = null;

    if (user) {
        token = await user.getIdToken();
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
```

#### 5. رفع الملفات:

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase.config';

export async function uploadToStorage(file: File, folder: string): Promise<string> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const filename = `${folder}/${timestamp}-${randomString}.${extension}`;

    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file, {
        contentType: file.type,
    });

    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}
```

#### 6. الاستماع للإشعارات:

```typescript
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.config';

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(notifications);
    });
}
```

---

## 9. ملخص الوظائف الرئيسية

### المصادقة:
- ✅ تسجيل الدخول (Login) - Custom Token
- ✅ تسجيل الخروج (Logout)
- ✅ التحقق من Token في كل طلب
- ✅ إدارة حالة المستخدم

### قاعدة البيانات:
- ✅ CRUD كامل على Firestore
- ✅ Queries مع شروط
- ✅ Real-time listeners
- ✅ Subcollections

### التخزين:
- ✅ رفع الملفات من العميل
- ✅ رفع الملفات من السيرفر
- ✅ الحصول على URLs

### الإشعارات:
- ✅ إنشاء إشعارات
- ✅ جلب الإشعارات
- ✅ تحديث حالة القراءة
- ✅ Real-time updates

---

## 10. نقاط مهمة للتطبيق

1. **استخدم نفس Firebase Project** - تأكد من استخدام نفس `projectId` و `apiKey`
2. **Custom Tokens** - السيرفر ينشئ Custom Tokens مع Custom Claims (userId, userType)
3. **Token في كل طلب** - أضف `Authorization: Bearer {token}` في كل طلب API
4. **Real-time Updates** - استخدم `onSnapshot` للإشعارات والتحديثات الفورية
5. **Error Handling** - تعامل مع أخطاء Firebase بشكل صحيح

---

## 11. أمثلة كاملة

### مثال كامل لتسجيل الدخول في التطبيق:

```typescript
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase.config';

async function login(email: string, password: string) {
    try {
        // 1. الحصول على Custom Token من API
        const response = await fetch('https://api.glorda.com/api/auth/login/merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const { token, merchant } = await response.json();

        // 2. تسجيل الدخول في Firebase
        const credential = await signInWithCustomToken(auth, token);
        
        // 3. حفظ بيانات المستخدم
        await AsyncStorage.setItem('user', JSON.stringify(merchant));
        
        return { success: true, user: merchant };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}
```

---

## 12. الأمان

1. **Custom Claims** - يتم إضافة `userId` و `userType` في Custom Token
2. **Token Verification** - السيرفر يتحقق من كل token قبل السماح بالوصول
3. **CSRF Protection** - حماية من CSRF attacks
4. **Password Hashing** - كلمات المرور مشفرة بـ bcrypt

---

## الخلاصة

المشروع يستخدم Firebase بشكل كامل:
- **Authentication**: Custom Tokens مع Custom Claims
- **Firestore**: قاعدة بيانات NoSQL
- **Storage**: رفع الملفات
- **Real-time**: تحديثات فورية

لربط التطبيق، استخدم نفس Firebase Project ونفس الوظائف المذكورة أعلاه.

