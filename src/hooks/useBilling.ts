import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type Plan = 'free' | 'pro' | 'elite';
export type PlanStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

interface BillingStatus {
  plan: Plan;
  plan_status: PlanStatus;
  current_period_end: string | null;
  hasSubscription: boolean;
}

interface UseBillingResult {
  plan: Plan;
  planStatus: PlanStatus;
  isLoading: boolean;
  error: string | null;
  currentPeriodEnd: Date | null;
  hasSubscription: boolean;
  createCheckoutSession: (plan: 'pro' | 'elite') => Promise<string | null>;
  openBillingPortal: () => Promise<string | null>;
  refresh: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3002' : '');

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }
  return { 'Content-Type': 'application/json' };
}

export function useBilling(): UseBillingResult {
  const [plan, setPlan] = useState<Plan>('free');
  const [planStatus, setPlanStatus] = useState<PlanStatus>('active');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/billing/status`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - default to free
          setPlan('free');
          setPlanStatus('active');
          setHasSubscription(false);
          return;
        }
        throw new Error('Failed to fetch billing status');
      }

      const data: BillingStatus = await response.json();
      setPlan(data.plan);
      setPlanStatus(data.plan_status);
      setHasSubscription(data.hasSubscription);
      setCurrentPeriodEnd(data.current_period_end ? new Date(data.current_period_end) : null);
    } catch (err) {
      console.error('[useBilling] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Default to free on error
      setPlan('free');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingStatus();

    // Re-fetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchBillingStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchBillingStatus]);

  const createCheckoutSession = useCallback(async (targetPlan: 'pro' | 'elite'): Promise<string | null> => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: targetPlan })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      return url;
    } catch (err) {
      console.error('[useBilling] Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Checkout failed');
      return null;
    }
  }, []);

  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/api/billing/create-portal-session`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      return url;
    } catch (err) {
      console.error('[useBilling] Portal error:', err);
      setError(err instanceof Error ? err.message : 'Portal failed');
      return null;
    }
  }, []);

  return {
    plan,
    planStatus,
    isLoading,
    error,
    currentPeriodEnd,
    hasSubscription,
    createCheckoutSession,
    openBillingPortal,
    refresh: fetchBillingStatus
  };
}

// Utility functions for plan comparisons
export const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  pro: 1,
  elite: 2
};

export function isPlanAtLeast(currentPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
}

export function getPlanDisplayName(plan: Plan): string {
  const names: Record<Plan, string> = {
    free: 'Free',
    pro: 'Pro',
    elite: 'Elite'
  };
  return names[plan] || 'Free';
}

export function getPlanPrice(plan: Plan): number {
  const prices: Record<Plan, number> = {
    free: 0,
    pro: 99,
    elite: 399
  };
  return prices[plan];
}
