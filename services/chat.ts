/**
 * Direct chat (customer–merchant) over Firestore.
 * Mirrors the old app: directConversations collection + messages subcollection.
 */
import { getFirebase } from '@/services/firebase';
import { getMerchantById, getCustomerById } from '@/services/firestore';

const getDateFromTimestamp = (timestamp: unknown): Date => {
  if (!timestamp) return new Date(0);
  const t = timestamp as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
  if (t.seconds != null) return new Date(t.seconds * 1000 + ((t.nanoseconds || 0) / 1000000));
  if (typeof t.toDate === 'function') return t.toDate();
  return new Date(timestamp as number);
};

async function getDb(): Promise<import('firebase/firestore').Firestore | null> {
  const { db } = await getFirebase();
  return db as import('firebase/firestore').Firestore | null;
}

export interface DirectConversation {
  id: string;
  customerId: string;
  merchantId: string;
  customerName?: string;
  customerImage?: string;
  merchantName?: string;
  merchantNameAr?: string;
  merchantImage?: string;
  lastMessage?: string;
  lastMessageAt?: unknown;
  unreadCountCustomer?: number;
  unreadCountMerchant?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DirectMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  senderType: 'customer' | 'merchant';
  message: string;
  imageUrl?: string;
  createdAt?: unknown;
}

function mapDocs<T>(snap: import('firebase/firestore').QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
}

/** Re-resolve from Firestore when the stored name is missing or is a raw id placeholder. */
function shouldResolveCustomerDisplay(name: string | undefined, customerId: string | undefined): boolean {
  if (!customerId?.trim()) return false;
  const n = name?.trim() ?? '';
  if (!n) return true;
  if (n === customerId) return true;
  if (/^customer_\d+$/i.test(n)) return true;
  return false;
}

async function enrichCustomerFields(conv: DirectConversation): Promise<void> {
  if (!conv.customerId || !shouldResolveCustomerDisplay(conv.customerName, conv.customerId)) return;
  const customer = await getCustomerById(conv.customerId);
  if (customer?.name) {
    conv.customerName = customer.name;
    if (customer.avatar) conv.customerImage = customer.avatar;
  }
}

export async function getOrCreateDirectConversation(
  customerId: string,
  merchantId: string
): Promise<DirectConversation | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const { collection, query, where, limit, getDocs, addDoc, doc, serverTimestamp } = await import('firebase/firestore');

    const q = query(
      collection(db, 'directConversations'),
      where('customerId', '==', customerId),
      where('merchantId', '==', merchantId),
      limit(1)
    );
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      const conv = { id: existingSnap.docs[0].id, ...existingSnap.docs[0].data() } as DirectConversation;
      const merchant = await getMerchantById(merchantId);
      if (merchant) {
        conv.merchantName = merchant.name;
        conv.merchantImage = merchant.logo;
      }
      await enrichCustomerFields(conv);
      return conv;
    }

    const merchant = await getMerchantById(merchantId);
    const customer = await getCustomerById(customerId);
    const conversationData = {
      customerId,
      merchantId,
      merchantName: merchant?.name ?? '',
      merchantNameAr: merchant?.name ?? '',
      merchantImage: merchant?.logo ?? '',
      customerName: customer?.name ?? '',
      customerImage: customer?.avatar ?? '',
      unreadCountCustomer: 0,
      unreadCountMerchant: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'directConversations'), conversationData);
    return { id: ref.id, ...conversationData } as DirectConversation;
  } catch (e) {
    console.error('getOrCreateDirectConversation error:', e);
    return null;
  }
}

export async function getDirectConversation(conversationId: string): Promise<DirectConversation | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'directConversations', conversationId));
    if (!snap.exists()) return null;
    const conv = { id: snap.id, ...snap.data() } as DirectConversation;
    await enrichCustomerFields(conv);
    return conv;
  } catch (e) {
    console.error('getDirectConversation error:', e);
    return null;
  }
}

export async function getDirectMessages(conversationId: string): Promise<DirectMessage[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'directConversations', conversationId, 'messages'));
    const messages = mapDocs<DirectMessage>(snap);
    messages.sort((a, b) => getDateFromTimestamp(a.createdAt).getTime() - getDateFromTimestamp(b.createdAt).getTime());
    return messages;
  } catch (e) {
    console.error('getDirectMessages error:', e);
    return [];
  }
}

export async function addDirectMessage(
  conversationId: string,
  senderId: string,
  senderType: 'customer' | 'merchant',
  message: string,
  imageUrl?: string
): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');

    const messageData: Record<string, unknown> = {
      senderId,
      senderType,
      message,
      createdAt: serverTimestamp(),
    };
    if (imageUrl) messageData.imageUrl = imageUrl;

    const messageRef = await addDoc(
      collection(db, 'directConversations', conversationId, 'messages'),
      messageData
    );

    const convRef = doc(db, 'directConversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const data = convSnap.data() as Record<string, unknown>;
      const updateData: Record<string, unknown> = {
        lastMessage: message,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (senderType === 'customer') {
        updateData.unreadCountMerchant = ((data.unreadCountMerchant as number) || 0) + 1;
      } else {
        updateData.unreadCountCustomer = ((data.unreadCountCustomer as number) || 0) + 1;
      }
      await updateDoc(convRef, updateData);
    }
    return messageRef.id;
  } catch (e) {
    console.error('addDirectMessage error:', e);
    return null;
  }
}

export async function markDirectConversationAsRead(
  conversationId: string,
  userType: 'customer' | 'merchant'
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { doc, updateDoc } = await import('firebase/firestore');
    const updateData = userType === 'customer' ? { unreadCountCustomer: 0 } : { unreadCountMerchant: 0 };
    await updateDoc(doc(db, 'directConversations', conversationId), updateData);
  } catch (e) {
    console.error('markDirectConversationAsRead error:', e);
  }
}

export async function deleteDirectConversation(conversationId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { collection, doc, getDocs, deleteDoc } = await import('firebase/firestore');
    const messagesSnap = await getDocs(collection(db, 'directConversations', conversationId, 'messages'));
    await Promise.all(messagesSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'directConversations', conversationId));
  } catch (e) {
    console.error('deleteDirectConversation error:', e);
  }
}

export function subscribeToDirectMessages(
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
): () => void {
  let unsub: (() => void) | null = null;
  getDb().then(async (db) => {
    if (!db) {
      callback([]);
      return;
    }
    const { collection, query, onSnapshot } = await import('firebase/firestore');
    unsub = onSnapshot(
      query(collection(db, 'directConversations', conversationId, 'messages')),
      (snap: import('firebase/firestore').QuerySnapshot) => {
        const messages = mapDocs<DirectMessage>(snap);
        messages.sort((a, b) => getDateFromTimestamp(a.createdAt).getTime() - getDateFromTimestamp(b.createdAt).getTime());
        callback(messages);
      },
      () => callback([])
    );
  }).catch(() => callback([]));
  return () => {
    if (unsub) unsub();
  };
}

export async function getCustomerDirectConversations(customerId: string): Promise<DirectConversation[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, 'directConversations'), where('customerId', '==', customerId)));
    let list = mapDocs<DirectConversation>(snap);
    list.sort((a, b) => getDateFromTimestamp(b.updatedAt).getTime() - getDateFromTimestamp(a.updatedAt).getTime());

    const withLast = await Promise.all(
      list.map(async (conv) => {
        const merchant = await getMerchantById(conv.merchantId);
        if (merchant) {
          conv.merchantName = merchant.name;
          conv.merchantImage = merchant.logo;
        }
        const messages = await getDirectMessages(conv.id);
        const last = messages[messages.length - 1];
        return { ...conv, lastMessage: last?.message ?? '', lastMessageAt: last?.createdAt ?? conv.updatedAt };
      })
    );
    return withLast;
  } catch (e) {
    console.error('getCustomerDirectConversations error:', e);
    return [];
  }
}

export async function getMerchantDirectConversations(merchantId: string): Promise<DirectConversation[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(query(collection(db, 'directConversations'), where('merchantId', '==', merchantId)));
    let list = mapDocs<DirectConversation>(snap);
    list.sort((a, b) => getDateFromTimestamp(b.updatedAt).getTime() - getDateFromTimestamp(a.updatedAt).getTime());

    const withLast = await Promise.all(
      list.map(async (conv) => {
        await enrichCustomerFields(conv);
        const messages = await getDirectMessages(conv.id);
        const last = messages[messages.length - 1];
        return { ...conv, lastMessage: last?.message ?? '', lastMessageAt: last?.createdAt ?? conv.updatedAt };
      })
    );
    return withLast;
  } catch (e) {
    console.error('getMerchantDirectConversations error:', e);
    return [];
  }
}

export function subscribeToCustomerDirectConversations(
  customerId: string,
  callback: (conversations: DirectConversation[]) => void
): () => void {
  let unsub: (() => void) | null = null;
  getDb().then(async (db) => {
    if (!db) {
      callback([]);
      return;
    }
    const { collection, query, where, onSnapshot } = await import('firebase/firestore');
    unsub = onSnapshot(
      query(collection(db, 'directConversations'), where('customerId', '==', customerId)),
      async (snap: import('firebase/firestore').QuerySnapshot) => {
        let list = mapDocs<DirectConversation>(snap);
        list.sort((a, b) => getDateFromTimestamp(b.updatedAt).getTime() - getDateFromTimestamp(a.updatedAt).getTime());
        const withLast = await Promise.all(
          list.map(async (conv) => {
            const merchant = await getMerchantById(conv.merchantId);
            if (merchant) {
              conv.merchantName = merchant.name;
              conv.merchantImage = merchant.logo;
            }
            const messages = await getDirectMessages(conv.id);
            const last = messages[messages.length - 1];
            return { ...conv, lastMessage: last?.message ?? '', lastMessageAt: last?.createdAt ?? conv.updatedAt };
          })
        );
        callback(withLast);
      },
      () => callback([])
    );
  }).catch(() => callback([]));
  return () => {
    if (unsub) unsub();
  };
}

export function subscribeToMerchantDirectConversations(
  merchantId: string,
  callback: (conversations: DirectConversation[]) => void
): () => void {
  let unsub: (() => void) | null = null;
  getDb().then(async (db) => {
    if (!db) {
      callback([]);
      return;
    }
    const { collection, query, where, onSnapshot } = await import('firebase/firestore');
    unsub = onSnapshot(
      query(collection(db, 'directConversations'), where('merchantId', '==', merchantId)),
      async (snap: import('firebase/firestore').QuerySnapshot) => {
        let list = mapDocs<DirectConversation>(snap);
        list.sort((a, b) => getDateFromTimestamp(b.updatedAt).getTime() - getDateFromTimestamp(a.updatedAt).getTime());
        const withLast = await Promise.all(
          list.map(async (conv) => {
            await enrichCustomerFields(conv);
            const messages = await getDirectMessages(conv.id);
            const last = messages[messages.length - 1];
            return { ...conv, lastMessage: last?.message ?? '', lastMessageAt: last?.createdAt ?? conv.updatedAt };
          })
        );
        callback(withLast);
      },
      () => callback([])
    );
  }).catch(() => callback([]));
  return () => {
    if (unsub) unsub();
  };
}
