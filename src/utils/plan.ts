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
 * Get the visible limit for trending/sector data based on plan
 */
export function getTrendingLimit(plan: PlanTier): number {
  switch (plan) {
    case 'elite': return 50;
    case 'pro': return 10;
    case 'free':
    default: return 3;
  }
}

/**
 * Get field visibility rules for live pairings
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
 * Get field visibility rules for trending/sector data
 */
export function getTrendingVisibility(plan: PlanTier): {
  showSignalScore: boolean;
  showSectorRank: boolean;
  showSectorScores: boolean;
  showReason: boolean;
  showRiskFlag: boolean;
} {
  switch (plan) {
    case 'elite':
      return {
        showSignalScore: true,
        showSectorRank: true,
        showSectorScores: true,
        showReason: true,
        showRiskFlag: true,
      };
    case 'pro':
      return {
        showSignalScore: true,
        showSectorRank: false,
        showSectorScores: false,
        showReason: false,
        showRiskFlag: false,
      };
    case 'free':
    default:
      return {
        showSignalScore: false,
        showSectorRank: false,
        showSectorScores: false,
        showReason: false,
        showRiskFlag: false,
      };
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

// ============================================================
// INVESTOR MATCH GATING (Prompt 10)
// ============================================================

/**
 * Get the visible limit for investor matches based on plan
 * - free: 3 matches (preview)
 * - pro: 10 matches
 * - elite: 50 matches (full list)
 */
export function getMatchesLimit(plan: PlanTier): number {
  switch (plan) {
    case 'elite': return 50;
    case 'pro': return 10;
    case 'free':
    default: return 3;
  }
}

/**
 * Get field visibility rules for investor matches
 * - free: mask investor_name (show logo/firm hint), hide reason/confidence
 * - pro: show investor_name + firm, hide reason/confidence
 * - elite: show everything including reason + confidence + dimension contributions
 */
export function getMatchVisibility(plan: PlanTier): {
  showInvestorName: boolean;
  showFirm: boolean;
  showReason: boolean;
  showConfidence: boolean;
  showDimensions: boolean;
  showCheckSize: boolean;
  showNotableInvestments: boolean;
  canExport: boolean;
} {
  switch (plan) {
    case 'elite':
      return {
        showInvestorName: true,
        showFirm: true,
        showReason: true,
        showConfidence: true,
        showDimensions: true,
        showCheckSize: true,
        showNotableInvestments: true,
        canExport: true,
      };
    case 'pro':
      return {
        showInvestorName: true,
        showFirm: true,
        showReason: false,
        showConfidence: false,
        showDimensions: false,
        showCheckSize: true,
        showNotableInvestments: true,
        canExport: false,
      };
    case 'free':
    default:
      return {
        showInvestorName: false, // Show logo but mask name
        showFirm: true, // Show firm name (hint)
        showReason: false,
        showConfidence: false,
        showDimensions: false,
        showCheckSize: false,
        showNotableInvestments: false,
        canExport: false,
      };
  }
}

/**
 * Get upgrade CTA text for matches page
 */
export function getMatchUpgradeCTA(plan: PlanTier, totalMatches: number): {
  text: string;
  subtext: string;
  show: boolean;
} {
  switch (plan) {
    case 'elite':
      return { text: '', subtext: '', show: false };
    case 'pro':
      return {
        text: 'Unlock Elite Reasoning',
        subtext: `See why each investor matches + confidence scores`,
        show: true,
      };
    case 'free':
    default:
      return {
        text: 'Unlock Full Matches',
        subtext: `${totalMatches - 3}+ more investors waiting`,
        show: totalMatches > 3,
      };
  }
}

/**
 * Get footnote for matches page
 */
export function getMatchFootnote(plan: PlanTier, showing: number, total: number): string {
  switch (plan) {
    case 'elite':
      return `Showing all ${showing} matches. Export available.`;
    case 'pro':
      return `Showing ${showing} of ${total}. Upgrade to Elite for reasons + confidence.`;
    case 'free':
    default:
      return `Showing ${showing} of ${total} matches. Names hidden.`;
  }
}
