import { getFirebase } from '@/services/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Create a Tap Charge for Hosted Checkout
 */
export const createTapCharge = async (data: {
  amount: number;
  currency: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: {
      country_code: string;
      number: string;
    };
  };
  orderId: string;
  redirectUrl: string;
}) => {
  try {
    const { functions } = await getFirebase();
    if (!functions) {
      throw new Error('Firebase functions not initialized');
    }
    const caller = httpsCallable(functions as any, 'createTapCharge');
    const result = await caller(data);
    return result.data as any;
  } catch (error) {
    console.error('❌ Error calling createTapCharge:', error);
    throw error;
  }
};

/**
 * Verify a Tap Charge status
 */
export const verifyTapPayment = async (chargeId: string) => {
  try {
    const { functions } = await getFirebase();
    if (!functions) {
      throw new Error('Firebase functions not initialized');
    }
    const caller = httpsCallable(functions as any, 'verifyTapPayment');
    const result = await caller({ chargeId });
    return result.data as any;
  } catch (error) {
    console.error('❌ Error calling verifyTapPayment:', error);
    throw error;
  }
};

/**
 * Tabby returns `web_url` on the session or inside `configuration.available_products.installments[].web_url` (array).
 */
export function parseTabbyCheckoutResponse(checkout: unknown): {
  checkoutId?: string;
  paymentId?: string;
  webUrl?: string;
  status?: string;
  rejectionReason?: string | null;
} {
  if (!checkout || typeof checkout !== 'object') return {};
  const c = checkout as Record<string, unknown>;
  const configuration = c.configuration as Record<string, unknown> | undefined;
  const payment = c.payment as Record<string, unknown> | undefined;

  const checkoutId = typeof c.id === 'string' ? c.id : undefined;
  const paymentId = typeof payment?.id === 'string' ? payment.id : undefined;
  const status = typeof c.status === 'string' ? c.status : undefined;

  let webUrl: string | undefined = typeof c.web_url === 'string' ? c.web_url : undefined;

  const avail = configuration?.available_products as Record<string, unknown> | undefined;
  const installments = avail?.installments;
  if (!webUrl) {
    if (Array.isArray(installments) && installments[0] && typeof (installments[0] as any).web_url === 'string') {
      webUrl = (installments[0] as { web_url: string }).web_url;
    } else if (installments && typeof installments === 'object' && 'web_url' in installments) {
      const w = (installments as { web_url?: string }).web_url;
      if (typeof w === 'string') webUrl = w;
    }
  }

  const products = configuration?.products as Record<string, unknown> | undefined;
  const prodInst = products?.installments as Record<string, unknown> | undefined;
  const rejectionReason =
    prodInst && typeof prodInst.rejection_reason === 'string' ? prodInst.rejection_reason : null;

  return { checkoutId, paymentId, webUrl, status, rejectionReason };
}

/**
 * Create a Tabby checkout session
 */
export const createTabbyCheckout = async (data: {
  amount: number;
  currency: 'SAR' | 'AED' | 'KWD';
  orderId: string;
  lang?: 'ar' | 'he';
  buyer: {
    phone: string;
    email?: string;
    name?: string;
  };
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    category?: string;
  }>;
  shippingAddress?: { city: string; address: string; zip: string };
}) => {
  const { functions } = await getFirebase();
  if (!functions) throw new Error('Firebase functions not initialized');
  const caller = httpsCallable(functions as any, 'createTabbyCheckout');
  const result = await caller(data);
  return result.data as any;
};

/**
 * Send hosted payment page link via Tabby
 */
export const sendTabbyHppLink = async (checkoutId: string) => {
  const { functions } = await getFirebase();
  if (!functions) throw new Error('Firebase functions not initialized');
  const caller = httpsCallable(functions as any, 'sendTabbyHppLink');
  const result = await caller({ checkoutId });
  return result.data as any;
};

/**
 * Retrieve Tabby payment status
 */
export const getTabbyPaymentStatus = async (paymentId: string) => {
  const { functions } = await getFirebase();
  if (!functions) throw new Error('Firebase functions not initialized');
  const caller = httpsCallable(functions as any, 'getTabbyPaymentStatus');
  const result = await caller({ paymentId });
  return result.data as any;
};
