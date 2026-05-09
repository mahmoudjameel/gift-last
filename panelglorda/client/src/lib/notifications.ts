import { db } from "./firebase";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    writeBatch,
    Timestamp,
    onSnapshot
} from "firebase/firestore";

export interface Notification {
    id: string;
    recipientId: string;
    recipientRole: "merchant" | "admin" | "customer";
    title: string;
    body: string;
    type: "system" | "order" | "withdrawal" | "verification" | "review" | "direct_message";
    link?: string;
    isRead: boolean;
    createdAt: any;
    metadata?: Record<string, any>;
}

const COLLECTION_NAME = "notifications";

const sanitizeFirestoreData = (value: any): any => {
    if (value === undefined) return undefined;

    if (value === null || value instanceof Timestamp || Array.isArray(value) === false && typeof value !== "object") {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => sanitizeFirestoreData(item))
            .filter((item) => item !== undefined);
    }

    return Object.fromEntries(
        Object.entries(value)
            .map(([key, item]) => [key, sanitizeFirestoreData(item)])
            .filter(([, item]) => item !== undefined)
    );
};

// Add a new notification
export const addNotification = async (
    recipientId: string,
    recipientRole: Notification["recipientRole"],
    title: string,
    body: string,
    type: Notification["type"],
    link?: string,
    metadata?: Record<string, any>
) => {
    try {
        const notificationsRef = collection(db, COLLECTION_NAME);
        const payload = sanitizeFirestoreData({
            recipientId,
            recipientRole,
            title,
            body,
            type,
            link,
            isRead: false,
            createdAt: serverTimestamp(),
            metadata
        });
        await addDoc(notificationsRef, payload);
    } catch (error) {
        console.error("Error adding notification:", error);
    }
};

// Helper function to convert Firestore Timestamp to Date
const getDateFromTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date(0);

    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }

    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }

    return new Date(timestamp);
};

// Fetch notifications for a user
export const getUserNotifications = async (userId: string, limitCount = 20) => {
    try {
        // Fetch ALL notifications first (no filters to avoid index requirement)
        // Then filter and sort in memory
        const notificationsRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(notificationsRef);

        // Filter by recipientId in memory
        let notifications = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter((notification: any) => notification.recipientId === userId) as Notification[];

        // Sort in memory by createdAt descending
        notifications.sort((a, b) => {
            const aDate = getDateFromTimestamp(a.createdAt);
            const bDate = getDateFromTimestamp(b.createdAt);
            return bDate.getTime() - aDate.getTime();
        });

        // Apply limit after sorting
        return notifications.slice(0, limitCount);
    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        // If error is about index, try fallback method
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn("⚠️ Index error detected, using fallback method");
            try {
                // Fallback: fetch all and filter in memory
                const notificationsRef = collection(db, COLLECTION_NAME);
                const snapshot = await getDocs(notificationsRef);

                let notifications = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter((notification: any) => notification.recipientId === userId) as Notification[];

                notifications.sort((a, b) => {
                    const aDate = getDateFromTimestamp(a.createdAt);
                    const bDate = getDateFromTimestamp(b.createdAt);
                    return bDate.getTime() - aDate.getTime();
                });

                return notifications.slice(0, limitCount);
            } catch (fallbackError) {
                console.error("Error in fallback method:", fallbackError);
                return [];
            }
        }
        return [];
    }
};

// Get unread count
export const getUnreadCount = async (userId: string) => {
    try {
        // Fetch all notifications and filter in memory to avoid index requirement
        const notificationsRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(notificationsRef);

        // Filter by recipientId and isRead in memory
        const unreadCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.recipientId === userId && data.isRead === false;
        }).length;

        return unreadCount;
    } catch (error: any) {
        console.error("Error counting unread notifications:", error);
        // Fallback: try with single where clause
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            try {
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("recipientId", "==", userId)
                );
                const snapshot = await getDocs(q);
                const unreadCount = snapshot.docs.filter(doc => doc.data().isRead === false).length;
                return unreadCount;
            } catch (fallbackError) {
                console.error("Error in fallback method:", fallbackError);
                return 0;
            }
        }
        return 0;
    }
};

// Mark as read
export const markNotificationAsRead = async (notificationId: string) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, notificationId);
        await updateDoc(docRef, {
            isRead: true,
            readAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
};

// Mark all as read for a user
export const markAllNotificationsAsRead = async (userId: string) => {
    try {
        // Fetch all notifications and filter in memory to avoid index requirement
        const notificationsRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(notificationsRef);

        // Filter by recipientId and isRead in memory
        const unreadDocs = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.recipientId === userId && data.isRead === false;
        });

        if (unreadDocs.length === 0) return;

        const batch = writeBatch(db);
        unreadDocs.forEach(doc => {
            batch.update(doc.ref, {
                isRead: true,
                readAt: serverTimestamp()
            });
        });

        await batch.commit();
    } catch (error: any) {
        console.error("Error marking all notifications as read:", error);
        // Fallback: try with single where clause
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            try {
                const q = query(
                    collection(db, COLLECTION_NAME),
                    where("recipientId", "==", userId)
                );
                const snapshot = await getDocs(q);

                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.isRead === false) {
                        batch.update(doc.ref, {
                            isRead: true,
                            readAt: serverTimestamp()
                        });
                    }
                });

                await batch.commit();
            } catch (fallbackError) {
                console.error("Error in fallback method:", fallbackError);
            }
        }
    }
};

// Notify all admins (helper)
export const notifyAdmins = async (title: string, body: string, type: Notification["type"], link?: string, metadata?: Record<string, any>) => {
    try {
        // First fetch all admins
        const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
        const adminsSnapshot = await getDocs(adminsQuery);

        const batch = writeBatch(db);
        const notificationsRef = collection(db, COLLECTION_NAME);

        adminsSnapshot.docs.forEach(adminDoc => {
            const newDocRef = doc(notificationsRef);
            batch.set(newDocRef, sanitizeFirestoreData({
                recipientId: adminDoc.id,
                recipientRole: "admin",
                title,
                body,
                type,
                link,
                isRead: false,
                createdAt: serverTimestamp(),
                metadata
            }));
        });

        await batch.commit();
    } catch (error) {
        console.error("Error notifying admins:", error);
    }
};
