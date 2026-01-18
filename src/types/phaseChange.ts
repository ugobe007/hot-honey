/**
 * PHASE CHANGE ENGINE (PCE)
 * TypeScript Type Definitions
 * 
 * Purpose: Detect, score, and compound multidimensional phase transitions
 * to surface Goldilocks startups before consensus.
 */

// ========================================
// ENUMS & CONSTANTS
// ========================================

export const PHASE_DOMAINS = ['product', 'capital', 'human', 'customer', 'market'] as const;
export type PhaseDomain = typeof PHASE_DOMAINS[number];

export const PHASE_DETECTION_SOURCES = ['rss', 'github', 'linkedin', 'crunchbase', 'manual', 'inference'] as const;
export type PhaseDetectionSource = typeof PHASE_DETECTION_SOURCES[number];

export const COUPLING_EVIDENCE_TYPES = ['temporal', 'semantic', 'explicit', 'inferred'] as const;
export type CouplingEvidenceType = typeof COUPLING_EVIDENCE_TYPES[number];

export const GOLDILOCKS_PHASE_STATES = ['quiet', 'watch', 'warming', 'surge', 'breakout'] as const;
export type GoldilockPhaseState = typeof GOLDILOCKS_PHASE_STATES[number];

// ========================================
// PHASE SUBTYPES BY DOMAIN
// ========================================

export const PHASE_SUBTYPES = {
  product: [
    'pivot_icp',
    'feature_collapse',
    'architecture_simplification',
    'usage_concentration_spike',
    'product_market_fit_signal',
    'viral_loop_activation',
    'platform_shift',
  ],
  capital: [
    'first_institutional_lead',
    'conviction_round',
    'valuation_discontinuity',
    'strategic_capital',
    'insider_doubling_down',
    'competitive_bidding',
  ],
  human: [
    'technical_cofounder_joined',
    'operator_joins_visionary',
    'domain_expert_joined',
    'high_reputation_advisor_engaged',
    'key_exec_from_category_leader',
    'team_density_inflection',
  ],
  customer: [
    'first_non_friendly_customer',
    'first_workflow_dependency',
    'first_expansion_within_account',
    'first_customer_led_referral',
    'enterprise_design_partner',
    'usage_becoming_habitual',
  ],
  market: [
    'regulation_unlocks',
    'cost_curve_flip',
    'infrastructure_arrives',
    'cultural_adoption_threshold',
    'competitor_exit',
    'category_creation_moment',
  ],
} as const;

export type ProductPhaseSubtype = typeof PHASE_SUBTYPES.product[number];
export type CapitalPhaseSubtype = typeof PHASE_SUBTYPES.capital[number];
export type HumanPhaseSubtype = typeof PHASE_SUBTYPES.human[number];
export type CustomerPhaseSubtype = typeof PHASE_SUBTYPES.customer[number];
export type MarketPhaseSubtype = typeof PHASE_SUBTYPES.market[number];

export type PhaseSubtype = 
  | ProductPhaseSubtype 
  | CapitalPhaseSubtype 
  | HumanPhaseSubtype 
  | CustomerPhaseSubtype 
  | MarketPhaseSubtype
  | string; // Allow custom subtypes

// ========================================
// CORE PHASE CHANGE OBJECT
// ========================================

export interface PhaseChangeEvidence {
  sources: PhaseDetectionSource[];
  artifacts: string[];  // URLs, commit SHAs, filings, announcements
  signals: string[];    // NLP-extracted or human-verified indicators
}

export interface PhaseChange {
  id: string;
  startup_id: string;
  
  // Classification
  domain: PhaseDomain;
  subtype: PhaseSubtype;
  
  // Temporal
  detected_at: string;  // ISO timestamp
  effective_at: string | null;  // When the change actually occurred
  
  // Physical Properties (The Secret Sauce)
  magnitude: number;         // 0.0 - 1.0: How much did the reachable future expand?
  irreversibility: number;   // 0.0 - 1.0: Can the startup go back?
  velocity: number;          // 0.0 - 1.0: Speed of signal → decision → outcome
  coupling: number;          // 0.0 - 1.0: Downstream phase activations
  confidence: number;        // 0.0 - 1.0: Signal quality
  directionality: number;    // -1.0 - 1.0: Did it improve odds? (negative = bad transition)
  
  // Evidence
  evidence: PhaseChangeEvidence;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: 'system' | 'admin' | 'inference';
  
  // Computed
  phase_score?: number;  // Composite score (calculated in DB)
}

export interface PhaseChangeInput {
  startup_id: string;
  domain: PhaseDomain;
  subtype: PhaseSubtype;
  effective_at?: string | null;
  magnitude: number;
  irreversibility: number;
  velocity: number;
  confidence: number;
  directionality?: number;  // Defaults to 0.25 in DB
  evidence: PhaseChangeEvidence;
  fingerprint?: string;  // For deduplication
  created_by?: 'system' | 'admin' | 'inference';
}

// ========================================
// PHASE VELOCITY INDEX (PVI)
// ========================================

export interface PhaseVelocityIndex {
  startup_id: string;
  
  // 24h window
  phase_events_24h: number;
  pvi_24h: number;
  
  // 7d window (primary)
  phase_events_7d: number;
  pvi_7d: number;
  
  // Physical property aggregates (7d)
  avg_irrev_7d: number;
  avg_coupling_7d: number;
  domains_7d: number;  // Multidimensionality
  
  // Acceleration metric
  pvi_accel_ratio: number;  // Short window vs long window density
}

// ========================================
// GOLDILOCKS TRIGGERS & STATE
// ========================================

export interface GoldilocksTriggers extends PhaseVelocityIndex {
  goldilocks_phase_state: GoldilockPhaseState;
}

export interface PhaseMultiplier {
  startup_id: string;
  goldilocks_phase_state: GoldilockPhaseState;
  pvi_7d: number;
  domains_7d: number;
  avg_irrev_7d: number;
  pvi_accel_ratio: number;
  pcm: number;  // Phase Change Multiplier (1.0 - ~3.1)
}

export interface GoldilocksCandidateScore {
  pvi_score: number;              // PVI * 0.4
  domain_score: number;           // domains_activated * 5
  irreversibility_bonus: number;  // +10 if has_irreversible_transition
  magnitude_bonus: number;        // +10 if has_major_transition
  recency_score: number;          // recent_phases_30d * 2
}

export interface GoldilockCandidate {
  id: string;
  name: string;
  status: string;
  total_god_score: number;
  
  // Phase metrics
  pvi: number;
  domains_activated: number;
  has_irreversible_transition: boolean;
  has_major_transition: boolean;
  recent_phases_30d: number;
  avg_irreversibility: number;
  max_magnitude: number;
  
  // Composite scores
  goldilocks_score: number;
  phase_adjusted_god_score: number;
  
  // Breakdown (optional, for UI)
  score_breakdown?: GoldilocksCandidateScore;
}

// ========================================
// PHASE COUPLING (Causality Graph)
// ========================================

export interface PhaseCoupling {
  id: string;
  trigger_phase_id: string;
  activated_phase_id: string;
  strength: number;  // 0.0 - 1.0
  evidence_type: CouplingEvidenceType;
  confidence: number;
  detected_at: string;
}

export interface PhaseCouplingInput {
  trigger_phase_id: string;
  activated_phase_id: string;
  strength: number;
  evidence_type: CouplingEvidenceType;
  confidence: number;
}

// ========================================
// PHASE DETECTION QUEUE
// ========================================

export type PhaseDetectionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PhaseDetectionTrigger = 'rss_update' | 'github_commit' | 'crunchbase_change' | 'manual' | 'inference_enrichment';

export interface PhaseDetectionQueueItem {
  id: string;
  startup_id: string;
  trigger_source: PhaseDetectionTrigger;
  trigger_data: Record<string, any>;
  status: PhaseDetectionStatus;
  priority: number;  // 1-10
  attempts: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface PhaseDetectionQueueInput {
  startup_id: string;
  trigger_source: PhaseDetectionTrigger;
  trigger_data?: Record<string, any>;
  priority?: number;
}

// ========================================
// PHASE TIMELINE (For UI)
// ========================================

export interface PhaseTimelineEntry {
  phase_id: string;
  domain: PhaseDomain;
  subtype: PhaseSubtype;
  detected_at: string;
  phase_score: number;
  magnitude: number;
  irreversibility: number;
  evidence: PhaseChangeEvidence;
}

export interface PhaseTimeline {
  startup_id: string;
  startup_name: string;
  entries: PhaseTimelineEntry[];
  pvi: number | null;
  goldilocks_score: number | null;
}

// ========================================
// DETECTION HEURISTICS (Configuration)
// ========================================

export interface PhaseDetectionRule {
  domain: PhaseDomain;
  subtype: PhaseSubtype;
  description: string;
  
  // Detection patterns
  triggers: {
    sources: PhaseDetectionSource[];
    patterns: string[];  // Regex or keyword patterns
    required_fields?: string[];
  };
  
  // Default scoring
  default_magnitude: number;
  default_irreversibility: number;
  default_velocity: number;
  default_confidence: number;
  
  // Enabled state
  enabled: boolean;
}

// ========================================
// PHASE CHANGE API RESPONSES
// ========================================

export interface PhaseChangeCreateResponse {
  success: boolean;
  phase_change?: PhaseChange;
  error?: string;
}

export interface PhaseTimelineResponse {
  success: boolean;
  timeline?: PhaseTimeline;
  error?: string;
}

export interface PVIResponse {
  success: boolean;
  pvi_data?: PhaseVelocityIndex;
  error?: string;
}

export interface GoldilocksCandidatesResponse {
  success: boolean;
  candidates?: GoldilockCandidate[];
  total_count?: number;
  error?: string;
}

// ========================================
// PHASE-ADJUSTED GOD SCORE
// ========================================

export interface PhaseAdjustedGodScore {
  startup_id: string;
  base_god_score: number;
  pvi: number;
  phase_multiplier: number;  // 1 + f(PVI), capped at 1.5
  adjusted_god_score: number;
}

// ========================================
// HELPER TYPES FOR SERVICES
// ========================================

export interface PhaseDetectionContext {
  startup_id: string;
  trigger_source: PhaseDetectionTrigger;
  raw_data: Record<string, any>;
  existing_phases?: PhaseChange[];
}

export interface PhaseDetectionResult {
  detected_phases: PhaseChangeInput[];
  detected_couplings: PhaseCouplingInput[];
  confidence_score: number;
  processing_time_ms: number;
}
