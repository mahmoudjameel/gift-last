import { getFirebase, isFirebaseConfigured } from './firebase';
import type { User } from '@/types';
import { toSaudiE164 } from '@/utils/saudiPhone';

export interface FirebaseCustomer {
  id: number;
  name: string;
  email?: string | null;
  mobile: string;
  city?: string | null;
}

function customerToUser(c: FirebaseCustomer): User {
  return {
    id: String(c.id),
    name: c.name,
    email: c.email ?? '',
    phone: c.mobile,
    hasStore: false,
    storeName: undefined,
  };
}

export async function getUserProfile(): Promise<User | null> {
  const { auth, db } = await getFirebase();
  if (!auth || !db) return null;
  try {
    const { doc, getDoc, getDocs, collection, query, where, limit } = await import('firebase/firestore');
    const authObj = auth as {
      currentUser: { uid: string; email?: string | null; phoneNumber?: string | null } | null;
    };
    const user = authObj.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db as import('firebase/firestore').Firestore, 'users', user.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();

    // Check if user has merchant/customer profiles
    const isMerchant = !!userData.merchantId || userData.role === 'merchant';
    const isCustomer = !!userData.customerId || userData.role === 'customer';

    let baseUser: User = {
      id: user.uid,
      name: userData.name || '',
      // Fallback to Firebase Auth email when Firestore users doc is missing it.
      email: userData.email || user.email || '',
      phone: userData.phone || userData.mobile || '',
      hasStore: isMerchant,
      isMerchant,
      isCustomer,
      lastRole: userData.lastRole || (isMerchant ? 'merchant' : 'customer'),
      storeName: userData.storeName,
    };

    // Some phone-auth accounts can have incomplete fields in users doc.
    // Backfill missing profile data from customers collection when customerId exists.
    if ((!baseUser.name || !baseUser.email || !baseUser.phone) && userData.customerId != null) {
      const customersSnap = await getDocs(
        query(collection(db as import('firebase/firestore').Firestore, 'customers'), where('id', '==', userData.customerId), limit(1))
      );
      if (!customersSnap.empty) {
        const customerData = customersSnap.docs[0].data() as {
          name?: string;
          email?: string | null;
          mobile?: string;
        };
        baseUser = {
          ...baseUser,
          name: baseUser.name || customerData.name || '',
          email: baseUser.email || customerData.email || '',
          phone: baseUser.phone || customerData.mobile || '',
        };
      }
    }

    // Additional fallback for phone-auth flows where customerId may be missing or stale.
    // Try matching by phone/mobile in customers and fill any missing profile fields.
    if (!baseUser.name || !baseUser.email || !baseUser.phone) {
      const candidatePhones = Array.from(
        new Set(
          [baseUser.phone, userData.phone, userData.mobile, user.phoneNumber]
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .filter(Boolean)
        )
      );

      for (const phoneCandidate of candidatePhones) {
        const byMobileSnap = await getDocs(
          query(
            collection(db as import('firebase/firestore').Firestore, 'customers'),
            where('mobile', '==', phoneCandidate),
            limit(1)
          )
        );
        if (!byMobileSnap.empty) {
          const customerData = byMobileSnap.docs[0].data() as {
            name?: string;
            email?: string | null;
            mobile?: string;
          };
          baseUser = {
            ...baseUser,
            name: baseUser.name || customerData.name || '',
            email: baseUser.email || customerData.email || user.email || '',
            phone: baseUser.phone || customerData.mobile || phoneCandidate,
          };
          break;
        }
      }
    }

    return baseUser;
  } catch (error) {
    console.error('getUserProfile error:', error);
    return null;
  }
}

/** Update customer profile in Firestore so edits persist to the database. */
export async function updateCustomerProfileInFirestore(data: {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}): Promise<boolean> {
  const { auth, db } = await getFirebase();
  if (!auth || !db) return false;
  try {
    const authObj = auth as { currentUser: { uid: string } | null };
    const uid = authObj.currentUser?.uid;
    if (!uid) return false;

    const { doc, getDoc, getDocs, collection, query, where, limit, updateDoc } = await import('firebase/firestore');
    const firestore = db as import('firebase/firestore').Firestore;

    const userDoc = await getDoc(doc(firestore, 'users', uid));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const customerId = userData.customerId;
    if (customerId == null) return false;

    const customersSnap = await getDocs(
      query(collection(firestore, 'customers'), where('id', '==', customerId), limit(1))
    );
    if (customersSnap.empty) return false;

    const customerRef = customersSnap.docs[0].ref;
    const updatePayload: Record<string, string> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.phone !== undefined) updatePayload.mobile = data.phone;
    if (data.avatar !== undefined) updatePayload.avatar = data.avatar;

    if (Object.keys(updatePayload).length === 0) return true;
    await updateDoc(customerRef, updatePayload);
    return true;
  } catch (error) {
    console.error('updateCustomerProfileInFirestore error:', error);
    return false;
  }
}

/** Update Firebase Auth password (and link email if needed) for the current user. */
export async function updateAuthPassword(newPassword: string, email?: string): Promise<{ success: boolean; error?: string }> {
  const { auth, db } = await getFirebase();
  if (!auth) return { success: false, error: 'Firebase غير مهيأ' };
  const authObj = auth as import('firebase/auth').Auth;
  const currentUser = authObj.currentUser;
  if (!currentUser) return { success: false, error: 'يجب تسجيل الدخول أولاً' };
  try {
    const { updatePassword, updateEmail: fbUpdateEmail, EmailAuthProvider, linkWithCredential } = await import('firebase/auth');

    const userEmail = email?.trim() || currentUser.email;

    if (userEmail) {
      const hasEmailProvider = currentUser.providerData.some(p => p.providerId === 'password');
      if (!hasEmailProvider) {
        try {
          const credential = EmailAuthProvider.credential(userEmail, newPassword);
          await linkWithCredential(currentUser, credential);
          return { success: true };
        } catch (linkErr: unknown) {
          const le = linkErr as { code?: string };
          if (le?.code === 'auth/provider-already-linked' || le?.code === 'auth/email-already-in-use') {
            // fall through to updatePassword
          } else {
            console.error('linkWithCredential error:', linkErr);
          }
        }
      }

      if (!currentUser.email && userEmail) {
        try {
          await fbUpdateEmail(currentUser, userEmail);
        } catch (emailErr: unknown) {
          console.error('updateEmail error:', emailErr);
        }
      }
    }

    await updatePassword(currentUser, newPassword);
    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('updateAuthPassword error:', error);
    const msg =
      err?.code === 'auth/requires-recent-login'
        ? 'لتفعيل تغيير كلمة المرور تم التحقق برمز OTP. أعد المحاولة.'
        : err?.message || 'فشل تغيير كلمة المرور';
    return { success: false, error: msg };
  }
}

/** Login with email and password via Firebase Auth, then fetch user profile. */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase غير مهيأ' };
  }
  const { auth } = await getFirebase();
  if (!auth) return { success: false, error: 'Firebase غير مهيأ' };
  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(
      auth as import('firebase/auth').Auth,
      email.trim(),
      password
    );
    let user = await getUserProfile();
    let retries = 0;
    while (!user && retries < 3) {
      await new Promise((r) => setTimeout(r, 800));
      user = await getUserProfile();
      retries++;
    }
    if (!user) return { success: false, error: 'بيانات المستخدم غير موجودة في قاعدة البيانات' };
    return { success: true, user };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('loginWithEmailPassword error:', error);
    let msg = err?.message || 'فشل تسجيل الدخول';
    if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
      msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    } else if (err?.code === 'auth/wrong-password') {
      msg = 'كلمة المرور غير صحيحة';
    } else if (err?.code === 'auth/invalid-email') {
      msg = 'البريد الإلكتروني غير صالح';
    } else if (err?.code === 'auth/too-many-requests') {
      msg = 'تم تجاوز عدد المحاولات. حاول لاحقاً';
    }
    return { success: false, error: msg };
  }
}

/** Subscribe to auth state. Call only after app has mounted (e.g. in useEffect). Returns unsubscribe. */
export async function onAuthStateChange(callback: (user: User | null) => void): Promise<() => void> {
  const { auth } = await getFirebase();
  if (!auth) {
    callback(null);
    return () => { };
  }
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(auth as import('firebase/auth').Auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = await getUserProfile();
      callback(user);
    } else {
      callback(null);
    }
  });
}

export async function loginWithToken(
  token: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const { auth } = await getFirebase();
  if (!auth) {
    return { success: false, error: 'Firebase غير مهيأ' };
  }
  try {
    const { signInWithCustomToken } = await import('firebase/auth');
    await signInWithCustomToken(auth as import('firebase/auth').Auth, token);
    let user = await getUserProfile();
    let retries = 0;
    while (!user && retries < 3) {
      await new Promise((r) => setTimeout(r, 1000));
      user = await getUserProfile();
      retries++;
    }
    if (!user) return { success: false, error: 'بيانات المستخدم غير موجودة' };
    return { success: true, user };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('loginWithToken error:', error);
    return {
      success: false,
      error: err?.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى',
    };
  }
}

export async function logoutCustomer(): Promise<void> {
  const { auth } = await getFirebase();
  if (auth) {
    const { signOut } = await import('firebase/auth');
    await signOut(auth as import('firebase/auth').Auth);
  }
}

export async function requestOtp(params: {
  phone: string;
  email?: string;
  isRegistration?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase غير مهيأ' };
  }
  const e164 = toSaudiE164(params.phone);
  if (!e164) {
    return {
      success: false,
      error:
        'رقم الجوال غير صالح. استخدم 05xxxxxxxx أو +9665xxxxxxxx | Invalid phone: use 05xxxxxxxx or +9665xxxxxxxx',
    };
  }
  const { functions } = await getFirebase();
  if (!functions) return { success: false, error: 'Firebase غير مهيأ' };
  try {
    const { httpsCallable } = await import('firebase/functions');
    const requestOtpFn = httpsCallable<
      { phone: string; email?: string; isRegistration?: boolean },
      { success?: boolean; message?: string }
    >(functions as import('firebase/functions').Functions, 'requestOtp');
    const result = await requestOtpFn({
      phone: e164,
      email: params.email?.trim(),
      isRegistration: params.isRegistration ?? false,
    });
    const data = result.data;
    if (data?.success) {
      return { success: true, message: data.message };
    }
    return { success: false, message: data?.message || 'فشل إرسال رمز التحقق' };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('requestOtp error:', error);
    const msg =
      err?.message || err?.code || 'فشل إرسال رمز التحقق. تأكد من إعداد Firebase Functions.';
    return { success: false, error: msg };
  }
}

export async function checkOtp(params: {
  phone: string;
  otp: string;
  name?: string;
  email?: string;
  password?: string;
}): Promise<{ success: boolean; token?: string; user?: User; message?: string; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase غير مهيأ' };
  }
  const e164 = toSaudiE164(params.phone);
  if (!e164) {
    return {
      success: false,
      error:
        'رقم الجوال غير صالح. استخدم 05xxxxxxxx أو +9665xxxxxxxx | Invalid phone: use 05xxxxxxxx or +9665xxxxxxxx',
    };
  }
  const { functions } = await getFirebase();
  if (!functions) return { success: false, error: 'Firebase غير مهيأ' };
  try {
    const { httpsCallable } = await import('firebase/functions');
    const checkOtpFn = httpsCallable<
      { phone: string; otp: string; name?: string; email?: string; password?: string },
      { success?: boolean; token?: string; message?: string }
    >(functions as import('firebase/functions').Functions, 'checkOtp');
    const result = await checkOtpFn({
      phone: e164,
      otp: params.otp,
      name: params.name?.trim(),
      email: params.email?.trim(),
      password: params.password,
    });
    const data = result.data;
    if (data?.success && data?.token) {
      const loginResult = await loginWithToken(data.token);
      if (loginResult.success && loginResult.user) {
        return { success: true, token: data.token, user: loginResult.user };
      }
      return {
        success: false,
        error: loginResult.error || 'فشل تسجيل الدخول بعد التحقق',
      };
    }
    return {
      success: false,
      message: data?.message || 'رمز التحقق غير صحيح',
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('checkOtp error:', error);
    const msg =
      err?.message || err?.code || 'فشل التحقق. تأكد من إعداد Firebase Functions.';
    return { success: false, error: msg };
  }
}

/**
 * تحقق من رمز OTP فقط بدون تسجيل دخول أو إنشاء مستخدم.
 * مفيد للعمليات الحساسة (مثل تعديل بيانات التاجر) التي تحتاج تأكيد على رقم الجوال.
 */
export async function verifyOtpCode(params: {
  phone: string;
  otp: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase غير مهيأ' };
  }
  const e164 = toSaudiE164(params.phone);
  if (!e164) {
    return {
      success: false,
      error:
        'رقم الجوال غير صالح. استخدم 05xxxxxxxx أو +9665xxxxxxxx | Invalid phone: use 05xxxxxxxx or +9665xxxxxxxx',
    };
  }
  const { functions } = await getFirebase();
  if (!functions) return { success: false, error: 'Firebase غير مهيأ' };
  try {
    const { httpsCallable } = await import('firebase/functions');
    const checkOtpFn = httpsCallable<
      { phone: string; otp: string },
      { success?: boolean; token?: string; message?: string }
    >(functions as import('firebase/functions').Functions, 'checkOtp');

    const result = await checkOtpFn({
      phone: e164,
      otp: params.otp,
    });
    const data = result.data;
    if (data?.success) {
      return { success: true, message: data.message };
    }
    return {
      success: false,
      message: data?.message || 'رمز التحقق غير صحيح',
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('verifyOtpCode error:', error);
    const msg =
      err?.message || err?.code || 'فشل التحقق. تأكد من إعداد Firebase Functions.';
    return { success: false, error: msg };
  }
}

/**
 * تسجيل مستخدم جديد مباشرة بدون رمز تحقق (OTP).
 * ينشئ حساب Firebase وحساب Firestore (users & customers).
 */
export async function registerCustomerDirectly(params: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase غير مهيأ' };
  }
  const { auth, db } = await getFirebase();
  if (!auth || !db) return { success: false, error: 'Firebase غير مهيأ' };

  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc, addDoc, collection, serverTimestamp } = await import('firebase/firestore');

    // 1. إنشاء حساب في Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth as import('firebase/auth').Auth,
      params.email.trim(),
      params.password || '123456'
    );
    const uid = userCredential.user.uid;

    // 2. إنشاء رقم تعريفي عددي للعميل (كما هو معتاد في النظام)
    const customerNumericId = Date.now();

    const dbObj = db as import('firebase/firestore').Firestore;

    // 3. إنشاء سجل في مجموعة customers
    await addDoc(collection(dbObj, 'customers'), {
      id: customerNumericId,
      name: params.name.trim(),
      email: params.email.trim(),
      mobile: params.phone?.trim() || '',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 4. إنشاء سجل في مجموعة users
    const userData = {
      name: params.name.trim(),
      email: params.email.trim(),
      phone: params.phone?.trim() || '',
      role: 'customer',
      customerId: customerNumericId,
      lastRole: 'customer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(dbObj, 'users', uid), userData);

    const user: User = {
      id: uid,
      name: params.name.trim(),
      email: params.email.trim(),
      phone: params.phone?.trim() || '',
      hasStore: false,
      isCustomer: true,
      isMerchant: false,
      lastRole: 'customer',
    };

    return { success: true, user };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('registerCustomerDirectly error:', error);
    let msg = err?.message || 'فشل إنشاء الحساب';
    if (err?.code === 'auth/email-already-in-use') {
      msg = 'البريد الإلكتروني مستخدم بالفعل';
    } else if (err?.code === 'auth/invalid-email') {
      msg = 'البريد الإلكتروني غير صالح';
    } else if (err?.code === 'auth/weak-password') {
      msg = 'كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)';
    }
    return { success: false, error: msg };
  }
}
