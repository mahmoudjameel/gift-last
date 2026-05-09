import {
  addDoc,
  collection,
  getDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  increment,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { notifyAdmins, addNotification } from "./notifications";

const mapDocs = <T = DocumentData>(snap: any): T[] =>
  snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];

// Helper function to remove undefined values from object (Firestore doesn't allow undefined)
const removeUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export interface ProductOptionChoice {
  label: string;
}

export interface ProductOption {
  type: "multiple_choice" | "text" | "toggle";
  title: string;
  placeholder?: string;
  required: boolean;
  choices?: ProductOptionChoice[];
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  productType: string;
  category: string;
  promoBadge?: string | null;
  images?: string[] | null;
  status: string;
  /** إذا كان المنتج متاحاً لإرفاق بطاقة هدية */
  allowsGiftCard?: boolean;
  /** رسوم بطاقة الهدية (ر.س) - اختياري */
  giftCardFee?: number;
  createdAt?: any;
  updatedAt?: any;
}

/** عنصر طلب (من subcollection items) */
export interface OrderItemDetail {
  productId: string;
  quantity: number;
  price: number;
  selectedOptions?: Array<{
    optionId: string;
    optionTitle?: string;
    textValue?: string;
    selectedChoices?: Array<{ id: string; label?: string; priceAdjustment?: number }>;
  }>;
}

export interface Order {
  id: string;
  orderNumber: string;
  merchantId: string;
  customerId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  isPaid?: boolean;
  deliveryAddress?: string;
  deliveryMethod?: string;
  deliveryOptionId?: string;
  deliveryOptionName?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  /** اسم المدينة للمستلم (عند التوصيل) */
  recipientCity?: string;
  deliveryFee?: number;
  recipientName?: string;
  recipientPhone?: string;
  customerNote?: string | null;
  tapChargeId?: string;
  paymentStatus?: string;
  tapReceiptUrl?: string;
  /** بيانات بطاقة الهدية إن وُجدت */
  giftCard?: {
    fromName: string;
    toName: string;
    message: string;
    hideSenderIdentity: boolean;
  };
  giftCardFee?: number;
  createdAt?: any;
  updatedAt?: any;
  product?: {
    name: string;
    price: number;
    images?: string[];
  };
  customer?: {
    name: string;
    mobile: string;
    city: string;
  };
  /** عناصر الطلب مع الخيارات (من التطبيق) */
  orderItems?: OrderItemDetail[];
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderType: string;
  message: string;
  imageUrl?: string;
  createdAt?: any;
}

export interface Transaction {
  id: string;
  merchantId: string;
  amount: number;
  type: "credit" | "debit";
  description?: string;
  status?: string;
  createdAt?: any;
}

export interface Withdrawal {
  id: string;
  merchantId: string;
  amount: number;
  status: "pending" | "completed" | "rejected";
  createdAt?: any;
  processedAt?: any;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  productId: string;
  merchantId?: string;
  rating: number;
  comment?: string | null;
  createdAt?: any;
}

export async function getMerchantProducts(merchantId: string) {
  const q = query(collection(db, "products"), where("merchantId", "==", merchantId));
  const snap = await getDocs(q);
  return mapDocs<Product>(snap);
}

export async function addProduct(data: Omit<Product, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>) {
  await updateDoc(doc(db, "products", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, "products", id));
}

export async function setProductVisibility(id: string, isActive: boolean) {
  await updateProduct(id, { status: isActive ? "active" : "hidden" });
}

export async function saveProductOptions(productId: string, options: ProductOption[]) {
  try {
    // Ensure productId is a string
    const productIdStr = String(productId);
    const optionsCol = collection(db, "products", productIdStr, "options");

    // Delete existing options and their choices first
    try {
      const existing = await getDocs(optionsCol);
      await Promise.all(
        existing.docs.map(async (optionDoc) => {
          // Delete all choices for this option
          try {
            const choicesCol = collection(db, "products", productIdStr, "options", optionDoc.id, "choices");
            const choicesSnap = await getDocs(choicesCol);
            await Promise.all(choicesSnap.docs.map((d) => deleteDoc(d.ref)));
          } catch (error) {
            console.warn("Error deleting choices for option:", optionDoc.id, error);
          }
          // Delete the option
          try {
            await deleteDoc(optionDoc.ref);
          } catch (error) {
            console.warn("Error deleting option:", optionDoc.id, error);
          }
        })
      );
    } catch (error) {
      console.warn("Error fetching existing options:", error);
      // Continue anyway - might be first time adding options
    }

    // If no options provided, we're done (all existing options are deleted)
    if (!options || options.length === 0) {
      return;
    }

    // Create new options with choices
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];

      // Validate option
      if (!opt.type || !opt.title) {
        console.warn("Skipping invalid option at index", i, opt);
        continue;
      }

      // Remove choices from option data before saving (choices will be saved separately)
      const { choices, ...optionData } = opt;

      // Build option document data
      const optionDocData: any = {
        type: optionData.type,
        title: optionData.title || "",
        required: optionData.required || false,
        sortOrder: i,
        createdAt: serverTimestamp(),
      };

      // Only add placeholder if it exists and is not empty
      if (optionData.placeholder && optionData.placeholder.trim()) {
        optionDocData.placeholder = optionData.placeholder.trim();
      }

      // Remove undefined values before saving (Firestore doesn't allow undefined)
      const cleanedOptionData = removeUndefined(optionDocData);

      // Create option document
      const optionRef = await addDoc(optionsCol, cleanedOptionData);

      // Create choices subcollection if this is a multiple_choice option
      if (opt.type === "multiple_choice" && choices && Array.isArray(choices) && choices.length > 0) {
        const choicesCol = collection(db, "products", productIdStr, "options", optionRef.id, "choices");
        await Promise.all(
          choices
            .filter(choice => choice && choice.label) // Filter out invalid choices
            .map((choice, j) =>
              addDoc(choicesCol, {
                label: String(choice.label || ""),
                sortOrder: j,
                createdAt: serverTimestamp(),
              })
            )
        );
      }
    }
  } catch (error) {
    console.error("Error saving product options:", error);
    throw error; // Re-throw to let caller handle it
  }
}

export async function getProductOptions(productId: string): Promise<ProductOption[]> {
  const optionsSnap = await getDocs(collection(db, "products", productId, "options"));

  // Load options with their choices
  const optionsWithChoices = await Promise.all(
    optionsSnap.docs.map(async (optionDoc) => {
      const optionData = { id: optionDoc.id, ...optionDoc.data() } as any;
      const option: ProductOption = {
        type: optionData.type,
        title: optionData.title || "",
        placeholder: optionData.placeholder || undefined,
        required: optionData.required || false,
      };

      // Load choices for multiple_choice type
      if (optionData.type === "multiple_choice") {
        try {
          const choicesSnap = await getDocs(
            collection(db, "products", productId, "options", optionDoc.id, "choices")
          );

          const choices = choicesSnap.docs.map(d => {
            const choiceData = d.data();
            return {
              label: choiceData.label || "",
              _sortOrder: choiceData.sortOrder || 0, // Temporary for sorting
            };
          });

          // Sort choices by sortOrder
          choices.sort((a, b) => a._sortOrder - b._sortOrder);

          // Remove temporary sortOrder
          option.choices = choices.map(({ _sortOrder, ...rest }) => rest);
        } catch (error) {
          console.warn("Error fetching choices for option:", optionDoc.id, error);
          option.choices = [];
        }
      }

      return {
        option,
        sortOrder: optionData.sortOrder || 0,
      };
    })
  );

  // Sort options by sortOrder
  optionsWithChoices.sort((a, b) => a.sortOrder - b.sortOrder);

  // Return just the options
  return optionsWithChoices.map(({ option }) => option);
}

export async function getMerchantOrders(merchantId: string) {
  const fetchEnrichedOrders = async (orders: Order[]) => {
    return await Promise.all(
      orders.map(async (order) => {
        try {
          const itemsSnap = await getDocs(collection(db, "orders", order.id, "items"));
          const itemsData = itemsSnap.docs.map((d) => {
            const data = d.data();
            return { productId: data.productId ?? "", quantity: data.quantity ?? 1, price: data.price ?? 0, selectedOptions: data.selectedOptions };
          });

          let productId = order.productId;
          let quantity = order.quantity;
          if (!productId && itemsData.length > 0) {
            productId = itemsData[0].productId;
            quantity = itemsData.reduce((sum, i) => sum + (i.quantity || 0), 0);
          }

          const orderItems: OrderItemDetail[] = await Promise.all(
            itemsData.map(async (item) => ({
              productId: item.productId,
              quantity: item.quantity || 1,
              price: item.price || 0,
              selectedOptions: item.selectedOptions || undefined,
            }))
          );

          let productData = null;
          if (productId) {
            const productDoc = await getDoc(doc(db, "products", productId.toString()));
            productData = productDoc.exists() ? productDoc.data() : null;
          }

          let customer = null;
          if (order.customerId) {
            try {
              const cId = Number(order.customerId);
              const q = query(collection(db, "customers"), where("id", "==", cId));
              const customerSnap = await getDocs(q);
              if (!customerSnap.empty) {
                customer = customerSnap.docs[0].data();
              } else {
                const docSnap = await getDoc(doc(db, "customers", order.customerId.toString()));
                if (docSnap.exists()) customer = docSnap.data();
              }
            } catch (err) {
              console.error("Error fetching customer for order:", order.id, err);
            }
          }

          return {
            ...order,
            orderNumber: order.orderNumber || `ORD-${order.id}`,
            productId,
            quantity: quantity || order.quantity || 1,
            deliveryFee: order.deliveryFee ?? 0,
            orderItems: orderItems.length > 0 ? orderItems : undefined,
            product: productData ? {
              name: productData.nameAr || productData.nameEn || productData.name || "-",
              price: productData.price || 0,
              images: productData.images || [],
            } : undefined,
            customer: customer ? {
              name: customer.name || "-",
              mobile: customer.mobile || "-",
              city: customer.city || "-",
            } : undefined,
            giftCard: order.giftCard ?? undefined,
            giftCardFee: order.giftCardFee ?? 0,
          };
        } catch (error) {
          console.error(`Error enriching order ${order.id}:`, error);
          return order;
        }
      })
    );
  };

  try {
    const q = query(
      collection(db, "orders"),
      where("merchantId", "==", merchantId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return await fetchEnrichedOrders(mapDocs<Order>(snap));
  } catch (error) {
    console.error("Error fetching merchant orders with sort:", error);
    // Fallback if orderBy fails
    const q = query(collection(db, "orders"), where("merchantId", "==", merchantId));
    const snap = await getDocs(q);
    return await fetchEnrichedOrders(mapDocs<Order>(snap));
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);

  if (orderSnap.exists()) {
    const orderData = orderSnap.data();

    // If order is completed, credit the merchant's wallet
    if (status === 'completed' && orderData.status !== 'completed') {
      try {
        const merchantId = orderData.merchantId;
        const amount = Number(orderData.totalAmount) || 0;

        if (merchantId && amount > 0) {
          // 1. Add credit transaction
          await addDoc(collection(db, "transactions"), {
            merchantId: merchantId.toString(),
            amount: amount,
            type: 'credit',
            description: `إيداع ربح الطلب #${orderData.orderNumber || orderId}`,
            status: 'completed',
            createdAt: serverTimestamp(),
            orderId: orderId
          });

          // 2. Update merchant balance
          const merchantRef = doc(db, "merchants", merchantId.toString());
          await updateDoc(merchantRef, {
            balance: increment(amount),
            updatedAt: serverTimestamp()
          });

          console.log(`Credited ${amount} to merchant ${merchantId} for order ${orderId}`);
        }
      } catch (err) {
        console.error("Error crediting wallet:", err);
      }
    }
  }

  await updateDoc(orderRef, { status, updatedAt: serverTimestamp() });
}

export async function getOrderMessages(orderId: string) {
  const snap = await getDocs(collection(db, "orders", orderId, "messages"));
  return mapDocs<OrderMessage>(snap);
}


export async function addOrderMessage(orderId: string, senderId: string, senderType: string, message: string, imageUrl?: string) {
  const messageData: any = {
    senderId,
    senderType,
    message,
    createdAt: serverTimestamp(),
  };

  if (imageUrl) {
    messageData.imageUrl = imageUrl;
  }

  await addDoc(collection(db, "orders", orderId, "messages"), messageData);

  // If merchant sends message, notify customer
  if (senderType === "merchant") {
    // Get order details to find customerId
    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (orderSnap.exists()) {
      const orderData = orderSnap.data();
      const customerId = orderData.customerId;

      await addNotification(
        customerId,
        "customer",
        "رسالة جديدة من المتجر",
        `لديك رسالة جديدة بخصوص الطلب رقم ${orderData.orderNumber}: ${message}`,
        "order",
        `/orders/${orderId}` // Assuming customer app route
      );
    }
  }
}

// ========== DIRECT CONVERSATIONS ==========
export interface DirectConversation {
  id: string;
  customerId: string | number;
  merchantId: string | number;
  customerName?: string;
  merchantName?: string;
  merchantNameAr?: string;
  merchantImage?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCountCustomer?: number;
  unreadCountMerchant?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string | number;
  senderType: 'customer' | 'merchant';
  message: string;
  imageUrl?: string;
  createdAt?: any;
}

// Helper function to convert Firestore Timestamp to Date
const getDateFromTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date(0);

  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }

  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  return new Date(timestamp);
};

// Get all direct conversations for a merchant
export async function getMerchantDirectConversations(merchantId: string): Promise<DirectConversation[]> {
  try {
    // Try with orderBy first, if it fails (no index), fetch without orderBy
    let snap;
    try {
      const q = query(
        collection(db, "directConversations"),
        where("merchantId", "==", merchantId.toString()),
        orderBy("updatedAt", "desc")
      );
      snap = await getDocs(q);
    } catch (orderByError: any) {
      console.warn('⚠️ orderBy failed, fetching without orderBy:', orderByError.message);
      // If orderBy fails (likely missing index), fetch all and sort in memory
      const q = query(
        collection(db, "directConversations"),
        where("merchantId", "==", merchantId.toString())
      );
      snap = await getDocs(q);
    }

    const conversations = mapDocs<DirectConversation>(snap);

    // Sort by updatedAt if not already sorted
    conversations.sort((a, b) => {
      const aDate = getDateFromTimestamp(a.updatedAt);
      const bDate = getDateFromTimestamp(b.updatedAt);
      return bDate.getTime() - aDate.getTime();
    });

    // Get customer info and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        try {
          // Get customer info
          const customerDoc = await getDoc(doc(db, "customers", conv.customerId.toString()));
          const customer = customerDoc.exists() ? customerDoc.data() : null;

          // Get last message - try with orderBy, fallback without
          let lastMessage = null;
          try {
            const messagesSnap = await getDocs(
              query(
                collection(db, "directConversations", conv.id, "messages"),
                orderBy("createdAt", "desc"),
                limit(1)
              )
            );
            lastMessage = messagesSnap.empty ? null : messagesSnap.docs[0].data();
          } catch (error: any) {
            // If orderBy fails, get all messages and find last one
            const messagesSnap = await getDocs(
              collection(db, "directConversations", conv.id, "messages")
            );
            if (!messagesSnap.empty) {
              const messages = mapDocs<DirectMessage>(messagesSnap);
              messages.sort((a, b) => {
                const aDate = getDateFromTimestamp(a.createdAt);
                const bDate = getDateFromTimestamp(b.createdAt);
                return bDate.getTime() - aDate.getTime();
              });
              lastMessage = messages[0];
            }
          }

          return {
            ...conv,
            customerName: customer?.name || '',
            lastMessage: lastMessage?.message || '',
            lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
          };
        } catch (error) {
          console.error('Error loading conversation details:', conv.id, error);
          return {
            ...conv,
            customerName: '',
            lastMessage: '',
            lastMessageAt: conv.updatedAt,
          };
        }
      })
    );

    return conversationsWithDetails;
  } catch (error) {
    console.error("Error fetching merchant direct conversations:", error);
    return [];
  }
}

// Get messages for a direct conversation
export async function getDirectMessages(conversationId: string): Promise<DirectMessage[]> {
  try {
    // Try with orderBy first, if it fails (no index), fetch without orderBy
    let messagesSnap;
    try {
      messagesSnap = await getDocs(
        query(
          collection(db, "directConversations", conversationId, "messages"),
          orderBy("createdAt", "asc")
        )
      );
    } catch (orderByError: any) {
      console.warn('⚠️ orderBy failed for messages, fetching without orderBy:', orderByError.message);
      // If orderBy fails (likely missing index), fetch all and sort in memory
      messagesSnap = await getDocs(
        collection(db, "directConversations", conversationId, "messages")
      );
    }

    const messages = mapDocs<DirectMessage>(messagesSnap);

    // Sort by createdAt if not already sorted
    messages.sort((a, b) => {
      const aDate = getDateFromTimestamp(a.createdAt);
      const bDate = getDateFromTimestamp(b.createdAt);
      return aDate.getTime() - bDate.getTime();
    });

    return messages;
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    return [];
  }
}

// Add message to direct conversation
export async function addDirectMessage(
  conversationId: string,
  senderId: string,
  senderType: 'customer' | 'merchant',
  message: string,
  imageUrl?: string
): Promise<void> {
  try {
    // Add message
    const messageData: any = {
      senderId: senderId.toString(),
      senderType,
      message,
      createdAt: serverTimestamp(),
    };

    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

    await addDoc(
      collection(db, "directConversations", conversationId, "messages"),
      messageData
    );

    // Update conversation
    const conversationRef = doc(db, "directConversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (conversationDoc.exists()) {
      const conversationData = conversationDoc.data();
      const updateData: any = {
        lastMessage: message,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Update unread count for the recipient
      if (senderType === 'customer') {
        updateData.unreadCountMerchant = (conversationData.unreadCountMerchant || 0) + 1;
      } else {
        updateData.unreadCountCustomer = (conversationData.unreadCountCustomer || 0) + 1;
      }

      await updateDoc(conversationRef, updateData);

      // Send notification to recipient
      if (senderType === 'merchant') {
        // Notify customer
        await addNotification(
          conversationData.customerId?.toString() || conversationData.customerId,
          "customer",
          "رسالة جديدة من المتجر",
          message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          "direct_message",
          `/messages?conversationId=${conversationId}`
        );
      }
    }
  } catch (error) {
    console.error("Error adding direct message:", error);
    throw error;
  }
}

// Mark conversation as read
export async function markDirectConversationAsRead(
  conversationId: string,
  userType: 'customer' | 'merchant'
): Promise<void> {
  try {
    const conversationRef = doc(db, "directConversations", conversationId);
    const updateData: any = {};

    if (userType === 'customer') {
      updateData.unreadCountCustomer = 0;
    } else {
      updateData.unreadCountMerchant = 0;
    }

    await updateDoc(conversationRef, updateData);
  } catch (error) {
    console.error("Error marking conversation as read:", error);
  }
}

// Real-time subscription for direct conversations
export function subscribeToMerchantDirectConversations(
  merchantId: string,
  callback: (conversations: DirectConversation[]) => void
) {
  console.log('🔄 Setting up subscription for merchant direct conversations:', merchantId);

  // Use query without orderBy to avoid index requirement
  // We'll sort in memory instead
  const q = query(
    collection(db, "directConversations"),
    where("merchantId", "==", merchantId.toString())
  );

  return onSnapshot(
    q,
    async (snap) => {
      const conversations = mapDocs<DirectConversation>(snap);

      // Sort by updatedAt in memory
      conversations.sort((a, b) => {
        const aDate = getDateFromTimestamp(a.updatedAt);
        const bDate = getDateFromTimestamp(b.updatedAt);
        return bDate.getTime() - aDate.getTime();
      });

      // Get customer info and last message for each conversation
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          try {
            const customerDoc = await getDoc(doc(db, "customers", conv.customerId.toString()));
            const customer = customerDoc.exists() ? customerDoc.data() : null;

            // Get last message - fetch all and sort in memory
            let lastMessage = null;
            try {
              const messagesSnap = await getDocs(
                collection(db, "directConversations", conv.id, "messages")
              );
              if (!messagesSnap.empty) {
                const messages = mapDocs<DirectMessage>(messagesSnap);
                messages.sort((a, b) => {
                  const aDate = getDateFromTimestamp(a.createdAt);
                  const bDate = getDateFromTimestamp(b.createdAt);
                  return bDate.getTime() - aDate.getTime();
                });
                lastMessage = messages[messages.length - 1]; // Last message (sorted ascending)
              }
            } catch (error: any) {
              console.warn('Error loading last message:', conv.id, error);
            }

            return {
              ...conv,
              customerName: customer?.name || '',
              lastMessage: lastMessage?.message || '',
              lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
            };
          } catch (error) {
            console.error('Error loading conversation details:', conv.id, error);
            return {
              ...conv,
              customerName: '',
              lastMessage: '',
              lastMessageAt: conv.updatedAt,
            };
          }
        })
      );

      console.log('📨 Real-time merchant direct conversations update:', conversationsWithDetails.length);
      callback(conversationsWithDetails);
    },
    (error) => {
      console.error('❌ Error in merchant direct conversations subscription:', error);
      // Return empty array on error instead of crashing
      callback([]);
    }
  );
}

// Real-time subscription for direct messages
export function subscribeToDirectMessages(
  conversationId: string,
  callback: (messages: DirectMessage[]) => void
) {
  console.log('🔄 Setting up subscription for direct messages:', conversationId);

  // Try with orderBy first, if it fails, use without orderBy
  let q;
  try {
    q = query(
      collection(db, "directConversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );
  } catch (error: any) {
    console.warn('⚠️ orderBy query failed, using without orderBy:', error.message);
    q = query(
      collection(db, "directConversations", conversationId, "messages")
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const messages = mapDocs<DirectMessage>(snap);

      // Sort by createdAt if not already sorted
      messages.sort((a, b) => {
        const aDate = getDateFromTimestamp(a.createdAt);
        const bDate = getDateFromTimestamp(b.createdAt);
        return aDate.getTime() - bDate.getTime();
      });

      console.log('📨 Real-time direct messages update:', messages.length);
      callback(messages);
    },
    (error) => {
      console.error('❌ Error in direct messages subscription:', error);
      // If orderBy fails, try without it
      if (error.code === 'failed-precondition') {
        console.log('🔄 Retrying subscription without orderBy');
        const fallbackQ = query(
          collection(db, "directConversations", conversationId, "messages")
        );
        return onSnapshot(fallbackQ, (snap) => {
          const messages = mapDocs<DirectMessage>(snap);
          messages.sort((a, b) => {
            const aDate = getDateFromTimestamp(a.createdAt);
            const bDate = getDateFromTimestamp(b.createdAt);
            return aDate.getTime() - bDate.getTime();
          });
          console.log('📨 Real-time direct messages update (fallback):', messages.length);
          callback(messages);
        });
      }
    }
  );
}

// Transactions & withdrawals
export async function getMerchantTransactions(merchantId: string) {
  const q = query(collection(db, "transactions"), where("merchantId", "==", merchantId));
  const snap = await getDocs(q);
  return mapDocs<Transaction>(snap);
}

export async function requestWithdrawal(merchantId: string, amount: number) {
  // Check balance first
  const merchantRef = doc(db, "merchants", merchantId);
  const merchantSnap = await getDoc(merchantRef);

  if (!merchantSnap.exists()) {
    throw new Error("Merchant not found");
  }

  const currentBalance = merchantSnap.data().balance || 0;

  if (currentBalance < amount) {
    throw new Error("رصيد المحفظة غير كافي");
  }

  // Create withdrawal request
  const withdrawalRef = await addDoc(collection(db, "withdrawals"), {
    merchantId,
    amount,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  // Create withdrawal transaction (debit from the request, but not yet from balance)
  await addDoc(collection(db, "transactions"), {
    merchantId: merchantId.toString(),
    amount: -amount,
    type: 'withdrawal',
    description: `طلب سحب رصيد #${withdrawalRef.id.slice(0, 8)}`,
    status: 'pending',
    createdAt: serverTimestamp(),
    withdrawalId: withdrawalRef.id
  });

  // Notify admins
  const storeName = merchantSnap.data().storeName || "تاجر";

  await notifyAdmins(
    "طلب سحب جديد",
    `قام ${storeName} بطلب سحب مبلغ ${amount} ر.س`,
    "withdrawal",
    "/admin/withdrawals"
  );
}

// Reviews - using existing Review interface from schema

export async function getMerchantReviews(merchantId: string) {
  try {
    const q = query(collection(db, "reviews"), where("merchantId", "==", merchantId));
    const snap = await getDocs(q);
    const reviews = mapDocs<Review>(snap);

    // Sort by createdAt (newest first)
    reviews.sort((a, b) => {
      const aDate = getDateFromTimestamp(a.createdAt);
      const bDate = getDateFromTimestamp(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });

    // Get product and customer details for each review
    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        try {
          // Get product details
          const productDoc = await getDoc(doc(db, "products", review.productId));
          const product = productDoc.exists() ? { id: productDoc.id, ...productDoc.data() } : null;

          // Get customer details
          const customerDoc = await getDoc(doc(db, "customers", review.customerId));
          const customer = customerDoc.exists() ? { id: customerDoc.id, ...customerDoc.data() } : null;

          return {
            ...review,
            product: product ? {
              name: (product as any).name || (product as any).nameEn || (product as any).nameAr || '',
              images: (product as any).images || [],
            } : undefined,
            customer: customer ? {
              name: (customer as any).name || '',
              mobile: (customer as any).mobile || '',
            } : undefined,
          };
        } catch (error) {
          console.error('Error loading review details:', error);
          return review;
        }
      })
    );

    return reviewsWithDetails;
  } catch (error) {
    console.error('Error fetching merchant reviews:', error);
    return [];
  }
}

// Single merchant profile helper
export async function getMerchantProfile(merchantId: string) {
  const snap = await getDoc(doc(db, "merchants", merchantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as any;
}






