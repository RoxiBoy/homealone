import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { apiFetch } from '../config/api';
import { useAuth } from './AuthContext';

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | null;

export type SubscriptionInfo = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
};

type SubscriptionStatusResponse =
  | SubscriptionInfo
  | {
      subscription?: SubscriptionInfo | null;
      message?: string;
    };

type PaymentContextValue = {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  createCheckoutSession: (plan: 'monthly' | 'yearly') => Promise<string>;
  checkSubscriptionStatus: () => Promise<void>;
  cancelSubscription: (immediately?: boolean) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
};

const PaymentContext = createContext<PaymentContextValue | undefined>(undefined);

const normalizeSubscriptionResponse = (
  data: SubscriptionStatusResponse | null | undefined,
): SubscriptionInfo | null => {
  if (!data) {
    return null;
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'subscription' in data
  ) {
    return data.subscription ?? null;
  }

  return data as SubscriptionInfo;
};

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = useCallback(async (plan: 'monthly' | 'yearly') => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiFetch<{ url: string }>('/payments/create-checkout-session', {
        method: 'POST',
        token,
        body: JSON.stringify({ plan }),
      });
      
      return data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const data = await apiFetch<SubscriptionStatusResponse>('/payments/status', {
        method: 'GET',
        token,
      });
      
      setSubscription(normalizeSubscriptionResponse(data));
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cancelSubscription = useCallback(async (immediately = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiFetch<SubscriptionStatusResponse>('/payments/cancel', {
        method: 'POST',
        token,
        body: JSON.stringify({ immediately }),
      });

      const normalized = normalizeSubscriptionResponse(data);
      if (normalized) {
        setSubscription(normalized);
      } else {
        await checkSubscriptionStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkSubscriptionStatus, token]);

  const reactivateSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiFetch<SubscriptionStatusResponse>('/payments/reactivate', {
        method: 'POST',
        token,
      });

      const normalized = normalizeSubscriptionResponse(data);
      if (normalized) {
        setSubscription(normalized);
      } else {
        await checkSubscriptionStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkSubscriptionStatus, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    checkSubscriptionStatus();

    const handleUrl = ({ url }: { url: string }) => {
      if (url.startsWith('homealone://payment-success') || url.startsWith('homealone://payment-cancel')) {
        checkSubscriptionStatus();
      }
    };

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        checkSubscriptionStatus();
      }
    };

    const linkSub = Linking.addEventListener('url', handleUrl);
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    Linking.getInitialURL()
      .then(url => {
        if (
          url &&
          (url.startsWith('homealone://payment-success') ||
            url.startsWith('homealone://payment-cancel'))
        ) {
          checkSubscriptionStatus();
        }
      })
      .catch(err => {
        console.log('[PaymentContext] Failed to inspect initial URL', err);
      });

    return () => {
      linkSub.remove();
      appStateSub.remove();
    };
  }, [checkSubscriptionStatus, token]);

  return (
    <PaymentContext.Provider
      value={{
        subscription,
        loading,
        error,
        createCheckoutSession,
        checkSubscriptionStatus,
        cancelSubscription,
        reactivateSubscription,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextValue => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
