/**
 * PYTHH INTELLIGENCE SERVICE
 * ==========================
 * Client-side service for accessing Pythh Brain v1 intelligence
 * 
 * All endpoints are READ-ONLY - no mutations
 * 
 * Dimensions computed:
 * 1. Narrative Coherence - is the story tight?
 * 2. Obsession Density - evidence of focused iteration
 * 3. Conviction-Evidence Ratio - claims vs proof
 * 4. Fragility Index - where investors hesitate
 * 5. Trajectory Momentum - FOMO / velocity signals
 */

import { supabase } from './supabase';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Types

export interface NarrativeCoherence {
  score: number;
  status: 'strong' | 'moderate' | 'weak';
  signals: {
    has_tagline: boolean;
    has_one_liner: boolean;
    has_five_points: boolean;
    story_length: number;
    description_length: number;
  };
  insight: string;
}

export interface ObsessionDensity {
  score: number;
  status: 'active' | 'moderate' | 'dormant';
  signals: {
    hours_since_update: number;
    days_since_creation: number;
  };
  insight: string;
}

export interface ConvictionEvidence {
  evidence_score: number;
  conviction_level: number;
  ratio: number;
  status: 'evidence_strong' | 'balanced' | 'conviction_ahead' | 'unproven';
  signals: {
    has_revenue: boolean;
    has_customers: boolean;
    is_launched: boolean;
    mrr: number;
    team_size: number;
    traction_score: number;
  };
  insight: string;
}

export interface FragilityHotspot {
  pattern: string;
  frequency: number;
  label: string;
}

export interface FragilityIndex {
  score: number;
  status: 'resilient' | 'some_concerns' | 'fragile';
  hotspots: FragilityHotspot[];
  total_hesitation_signals: number;
  analyzed_matches: number;
}

export interface TrajectoryMomentum {
  status: string;
  signals: {
    fomo_state?: string;
    events_24h?: number;
    signal_24h?: number;
    events_7d?: number;
    signal_delta_24h?: number;
  } | null;
  insight: string;
}

export interface CopyBlocks {
  snapshot: {
    title: string;
    body: string;
  };
  fragility: {
    title: string;
    bullets: string[];
  };
  direction: {
    title: string;
    bullets: string[];
  };
  momentum: string | null;
}

export interface FounderProfile {
  startup_id: string;
  startup_name: string;
  total_god_score: number;
  dimensions: {
    narrative_coherence: NarrativeCoherence;
    obsession_density: ObsessionDensity;
    conviction_evidence_ratio: ConvictionEvidence;
    fragility_index: FragilityIndex;
    trajectory_momentum: TrajectoryMomentum;
  };
  copy_blocks: CopyBlocks;
  generated_at: string;
}

export interface AlignmentDelta {
  reflection: string;
  tension: string[];
  direction: string[];
  next_proof: string[];
}

export interface MatchDelta {
  startup_id: string;
  investor_id: string;
  startup_name: string;
  investor_name: string;
  investor_firm: string;
  match_score: number | null;
  confidence_level: string | null;
  alignment_delta: AlignmentDelta;
  generated_at: string;
}

export interface ResolveResult {
  startup_id: string | null;
  name?: string;
  exists: boolean;
  total_god_score?: number;
  message?: string;
}

// API Functions

/**
 * Resolve a URL to a startup_id without creating records
 * READ-ONLY
 */
export async function resolveUrl(url: string): Promise<ResolveResult> {
  try {
    const response = await fetch(`${API_BASE}/api/startup/resolve?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[intel] resolveUrl error:', error);
    return { startup_id: null, exists: false };
  }
}

/**
 * Get match count for a startup
 * READ-ONLY
 */
export async function getMatchCount(startupId: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/api/matches/count?startup_id=${encodeURIComponent(startupId)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('[intel] getMatchCount error:', error);
    return 0;
  }
}

/**
 * Get founder profile intelligence
 * Returns computed dimensions + copy blocks
 * READ-ONLY
 */
export async function getFounderProfile(startupId: string): Promise<FounderProfile | null> {
  try {
    const response = await fetch(`${API_BASE}/api/intel/founder-profile?startup_id=${encodeURIComponent(startupId)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[intel] getFounderProfile error:', error);
    return null;
  }
}

/**
 * Get alignment differential between startup and investor
 * Returns reflection, tension, direction, next_proof
 * READ-ONLY
 */
export async function getMatchDelta(startupId: string, investorId: string): Promise<MatchDelta | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/intel/match-deltas?startup_id=${encodeURIComponent(startupId)}&investor_id=${encodeURIComponent(investorId)}`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[intel] getMatchDelta error:', error);
    return null;
  }
}

// Client-side intelligence (no API call needed)

/**
 * Compute narrative coherence directly from startup data
 * Use this when you already have startup data loaded
 */
export function computeNarrativeLocally(startup: {
  tagline?: string;
  description?: string;
  extracted_data?: { one_liner?: string; fivePoints?: string[] };
}): NarrativeCoherence {
  const tagline = startup.tagline || '';
  const description = startup.description || '';
  const oneLiner = startup.extracted_data?.one_liner || '';
  const fivePoints = startup.extracted_data?.fivePoints || [];

  const storyLength = (tagline + oneLiner).length;
  const descLength = description.length;
  
  const hasTagline = tagline.length > 10;
  const hasOneLiner = oneLiner.length > 10;
  const hasFivePoints = fivePoints.length >= 3;
  
  let score = 50;
  if (hasTagline) score += 15;
  if (hasOneLiner) score += 15;
  if (hasFivePoints) score += 20;
  if (storyLength > 0 && storyLength < 100) score += 10;
  if (descLength > 50 && descLength < 500) score += 10;
  
  score = Math.min(100, Math.max(0, score));
  const status = score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'weak';

  return {
    score,
    status,
    signals: {
      has_tagline: hasTagline,
      has_one_liner: hasOneLiner,
      has_five_points: hasFivePoints,
      story_length: storyLength,
      description_length: descLength
    },
    insight: score >= 70 
      ? 'Your story lands fast. Narrative is tight.'
      : score >= 45 
        ? 'Story has pieces. Not yet compressing into belief.'
        : 'Narrative is scattered. Investors will project their own story.'
  };
}

/**
 * Get the founder snapshot copy
 * Use locally when you have dimension data
 */
export function getFounderSnapshotCopy(
  narrativeScore: number,
  evidenceScore: number,
  convictionLevel: number
): string {
  const evidenceRatio = evidenceScore / Math.max(convictionLevel, 1);
  
  if (narrativeScore >= 65 && evidenceRatio < 0.6) {
    return "Your story lands fast. The hesitation is proof.";
  } else if (narrativeScore < 50 && evidenceScore >= 50) {
    return "You have evidence. You're not translating it into belief.";
  } else if (narrativeScore < 50 && evidenceScore < 40) {
    return "Right now, investors will project their own story onto you. That's fragile.";
  } else if (narrativeScore >= 60 && evidenceScore >= 60) {
    return "This reads like momentum. The only risk is timing.";
  } else {
    return "Mixed signals. Story and proof aren't yet aligned.";
  }
}
