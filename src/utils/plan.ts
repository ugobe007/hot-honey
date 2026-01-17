/**
 * Plan utilities for pricing gating
 * 
 * Plan tiers:
 * - free: Default tier, limited visibility
 * - pro: Enhanced visibility, 3 rows
 * - elite: Full visibility, 10 rows + confidence
 */

export type PlanTier = 'free' | 'pro' | 'elite';

/**
 * Get the current user's plan tier.
 * Checks multiple sources in priority order:
 * 1. user.plan (from auth context)
 * 2. user_metadata.plan (Supabase JWT claims)
 * 3. localStorage.plan (dev/testing fallback)
 * 4. Default: 'free'
 */
export function getPlan(user?: { plan?: PlanTier; user_metadata?: { plan?: PlanTier } } | null): PlanTier {
  // Source 1: Direct plan property on user object
  if (user?.plan && isValidPlan(user.plan)) {
    return user.plan;
  }
  
  // Source 2: Supabase user_metadata (JWT claims)
  if (user?.user_metadata?.plan && isValidPlan(user.user_metadata.plan)) {
    return user.user_metadata.plan;
  }
  
  // Source 3: localStorage (dev/testing fallback)
  if (typeof window !== 'undefined') {
    const storedPlan = localStorage.getItem('plan');
    if (storedPlan && isValidPlan(storedPlan as PlanTier)) {
      return storedPlan as PlanTier;
    }
  }
  
  // Default: free tier
  return 'free';
}

/**
 * Validate plan tier string
 */
function isValidPlan(plan: string): plan is PlanTier {
  return ['free', 'pro', 'elite'].includes(plan);
}

/**
 * Get the visible limit for live pairings based on plan
 */
export function getLivePairingsLimit(plan: PlanTier): number {
  switch (plan) {
    case 'elite': return 10;
    case 'pro': return 3;
    case 'free':
    default: return 1;
  }
}

/**
 * Get field visibility rules for a given plan
 */
export function getPlanVisibility(plan: PlanTier): {
  showInvestorName: boolean;
  showReason: boolean;
  showConfidence: boolean;
} {
  switch (plan) {
    case 'elite':
      return { showInvestorName: true, showReason: true, showConfidence: true };
    case 'pro':
      return { showInvestorName: true, showReason: false, showConfidence: false };
    case 'free':
    default:
      return { showInvestorName: false, showReason: false, showConfidence: false };
  }
}

/**
 * Get upgrade CTA text based on current plan
 */
export function getUpgradeCTA(plan: PlanTier): { text: string; show: boolean } {
  switch (plan) {
    case 'elite':
      return { text: '', show: false };
    case 'pro':
      return { text: 'Unlock Elite signals', show: true };
    case 'free':
    default:
      return { text: 'Unlock live pairings', show: true };
  }
}

/**
 * Get footnote text based on plan and total count
 */
export function getPlanFootnote(plan: PlanTier, totalCount: number): string {
  const limit = getLivePairingsLimit(plan);
  const showing = Math.min(limit, totalCount);
  
  switch (plan) {
    case 'elite':
      return `Showing all ${showing} live pairings.`;
    case 'pro':
      return `Showing ${showing} of ${totalCount}. Upgrade to Elite for reasons + confidence.`;
    case 'free':
    default:
      return `Showing ${showing} of ${totalCount} live pairings.`;
  }
}
