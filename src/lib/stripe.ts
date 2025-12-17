// Stripe configuration and utilities for Hot Match subscriptions

// Stripe Price IDs - These will be created in your Stripe Dashboard
// Replace these with your actual Stripe Price IDs after creating products
export const STRIPE_PRICE_IDS = {
  // Startup Tiers
  spark: {
    monthly: 'price_spark_monthly', // Free tier - no Stripe product needed
    yearly: 'price_spark_yearly',
  },
  flame: {
    monthly: 'price_flame_monthly', // $49/month
    yearly: 'price_flame_yearly', // $470/year (save ~20%)
  },
  inferno: {
    monthly: 'price_inferno_monthly', // $199/month  
    yearly: 'price_inferno_yearly', // $1,910/year (save ~20%)
  },
  // Investor Tiers
  scout: {
    monthly: 'price_scout_monthly', // $99/month
    yearly: 'price_scout_yearly', // $950/year
  },
  dealflow_pro: {
    monthly: 'price_dealflow_pro_monthly', // $499/month
    yearly: 'price_dealflow_pro_yearly', // $4,790/year
  },
};

export const TIER_DETAILS = {
  spark: {
    name: 'Spark',
    price: 0,
    priceYearly: 0,
    description: 'Free forever',
    matchLimit: 3,
    features: [
      '3 matches per month',
      'Basic startup profile',
      'Community access',
      'Email support',
    ],
    icon: '✨',
    color: 'gray',
  },
  flame: {
    name: 'Flame',
    price: 49,
    priceYearly: 470,
    description: 'For serious founders',
    matchLimit: -1, // unlimited
    features: [
      'Unlimited matches',
      'Pitch Deck Analyzer',
      'Value Prop Sharpener',
      'VC Approach Playbook',
      'Founder Story Framework',
      'Customer Story Templates',
      'Advisor Matching',
      'Warm Intro Finder',
      'Priority support',
    ],
    icon: '🔥',
    color: 'orange',
  },
  inferno: {
    name: 'Inferno',
    price: 199,
    priceYearly: 1910,
    description: 'Full fundraising arsenal',
    matchLimit: -1,
    features: [
      'Everything in Flame',
      'PMF Analysis',
      'Funding Strategy Roadmap',
      'Traction Improvement Plan',
      'Team Gap Analysis',
      'Competitive Intelligence',
      'Partnership Finder',
      '1-on-1 advisor calls (2/month)',
      'Custom reports',
      'White-glove support',
    ],
    icon: '🌋',
    color: 'purple',
  },
  scout: {
    name: 'Scout',
    price: 99,
    priceYearly: 950,
    description: 'For angel investors',
    matchLimit: -1,
    features: [
      'Deal flow dashboard',
      'Startup search & filters',
      'Match notifications',
      'Basic due diligence tools',
      'Save & track startups',
      'Email support',
    ],
    icon: '🔭',
    color: 'blue',
  },
  dealflow_pro: {
    name: 'Dealflow Pro',
    price: 499,
    priceYearly: 4790,
    description: 'For VC funds',
    matchLimit: -1,
    features: [
      'Everything in Scout',
      'Advanced search filters',
      'Portfolio tracking',
      'LP reporting tools',
      'Team collaboration',
      'API access',
      'White-label options',
      'Dedicated success manager',
    ],
    icon: '🚀',
    color: 'indigo',
  },
};

export type TierName = keyof typeof TIER_DETAILS;
export type BillingCycle = 'monthly' | 'yearly';

// Helper to get tier level for comparison
export const getTierLevel = (tier: string): number => {
  const levels: Record<string, number> = {
    spark: 0,
    flame: 1,
    inferno: 2,
    scout: 1,
    dealflow_pro: 2,
  };
  return levels[tier] || 0;
};

// Helper to check if user can access a feature
export const canAccessTier = (userTier: string, requiredTier: string): boolean => {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
};

// Format price for display
export const formatPrice = (cents: number): string => {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(0)}`;
};

// Calculate savings for yearly billing
export const getYearlySavings = (tier: TierName): number => {
  const details = TIER_DETAILS[tier];
  if (!details || details.price === 0) return 0;
  const monthlyTotal = details.price * 12;
  return monthlyTotal - details.priceYearly;
};

// Create checkout session via Edge Function
export const createCheckoutSession = async (
  tier: TierName,
  billingCycle: BillingCycle,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | { error: string }> => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier,
        billingCycle,
        userId,
        successUrl,
        cancelUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create checkout session' };
    }

    return await response.json();
  } catch (error) {
    console.error('Checkout error:', error);
    return { error: 'Network error. Please try again.' };
  }
};

// Create customer portal session for managing subscription
export const createPortalSession = async (
  customerId: string,
  returnUrl: string
): Promise<{ url: string } | { error: string }> => {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create portal session' };
    }

    return await response.json();
  } catch (error) {
    console.error('Portal error:', error);
    return { error: 'Network error. Please try again.' };
  }
};
