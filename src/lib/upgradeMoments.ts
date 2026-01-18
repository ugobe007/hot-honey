// ============================================================
// Upgrade Moments - Centralized upgrade copy and logic
// Single source of truth for all contextual upgrade nudges
// ============================================================

export type UpgradeMoment =
  | 'enable_email_alerts'
  | 'export_csv'
  | 'deal_memo'
  | 'share_matches'
  | 'view_full_investor'
  | 'increase_live_pairings'
  | 'increase_trending'
  | 'custom_alerts'
  | 'daily_digest';

export interface UpgradeCopy {
  title: string;
  body: string;
  cta: string;
  targetPlan: 'pro' | 'elite';
  icon: string;
}

export const UPGRADE_COPY: Record<UpgradeMoment, UpgradeCopy> = {
  enable_email_alerts: {
    title: 'Email alerts are Elite-only',
    body: 'Get notified instantly when startups in your watchlist turn HOT or spike in momentum.',
    cta: 'Unlock Email Alerts',
    targetPlan: 'elite',
    icon: '🔔'
  },
  export_csv: {
    title: 'Export investor matches',
    body: 'Download a CSV with full investor details, confidence scores, and fit analysis.',
    cta: 'Unlock CSV Export',
    targetPlan: 'elite',
    icon: '📊'
  },
  deal_memo: {
    title: 'Generate deal memos',
    body: 'Create a ready-to-share investment memo with signals, risks, and top investors.',
    cta: 'Unlock Deal Memos',
    targetPlan: 'elite',
    icon: '📝'
  },
  share_matches: {
    title: 'Share match lists',
    body: 'Create private share links for partners, LPs, or your team.',
    cta: 'Unlock Sharing',
    targetPlan: 'elite',
    icon: '🔗'
  },
  view_full_investor: {
    title: 'Reveal investor identities',
    body: 'See full investor names, check sizes, and notable investments.',
    cta: 'Upgrade to Pro',
    targetPlan: 'pro',
    icon: '👤'
  },
  increase_live_pairings: {
    title: 'See more live signal pairings',
    body: 'View additional real-time startup ↔ investor matches.',
    cta: 'Upgrade for More Pairings',
    targetPlan: 'pro',
    icon: '📡'
  },
  increase_trending: {
    title: 'See more trending startups',
    body: 'Unlock deeper sector-level trending signals.',
    cta: 'Upgrade for Full Trending',
    targetPlan: 'pro',
    icon: '📈'
  },
  custom_alerts: {
    title: 'Custom alerts',
    body: 'Define your own alert thresholds and rules.',
    cta: 'Unlock Custom Alerts',
    targetPlan: 'elite',
    icon: '⚡'
  },
  daily_digest: {
    title: 'Daily digest emails',
    body: 'Get a daily summary of all activity in your watchlist at your preferred time.',
    cta: 'Unlock Daily Digest',
    targetPlan: 'elite',
    icon: '📊'
  }
};

// Helper to check if user can access a feature
export function canAccessFeature(
  moment: UpgradeMoment,
  userPlan: 'free' | 'pro' | 'elite' | null
): boolean {
  const targetPlan = UPGRADE_COPY[moment].targetPlan;
  
  if (!userPlan || userPlan === 'free') {
    return false;
  }
  
  if (targetPlan === 'pro') {
    return userPlan === 'pro' || userPlan === 'elite';
  }
  
  if (targetPlan === 'elite') {
    return userPlan === 'elite';
  }
  
  return false;
}

// Build pricing URL with source tracking
export function buildPricingUrl(moment: UpgradeMoment): string {
  const { targetPlan } = UPGRADE_COPY[moment];
  return `/pricing?plan=${targetPlan}&source=${moment}`;
}
