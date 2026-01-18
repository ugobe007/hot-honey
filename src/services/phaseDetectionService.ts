/**
 * PHASE DETECTION SERVICE
 * 
 * Purpose: Detect multidimensional phase transitions across 5 domains
 * This is the inference layer that surfaces state changes, not events.
 * 
 * Architecture:
 * 1. Domain-specific detectors (product, capital, human, customer, market)
 * 2. Evidence collection and scoring
 * 3. Coupling detection (which phases triggered others)
 * 4. Queue processing for async detection
 */

import { createClient } from '@supabase/supabase-js';
import {
  PhaseChange,
  PhaseChangeInput,
  PhaseCoupling,
  PhaseCouplingInput,
  PhaseDetectionContext,
  PhaseDetectionResult,
  PhaseDetectionQueueInput,
  PhaseDomain,
  PhaseDetectionSource,
} from '../types/phaseChange';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ========================================
// DETECTION HEURISTICS BY DOMAIN
// ========================================

class ProductPhaseDetector {
  /**
   * Product Phase Changes: State transitions in problem/solution alignment
   */
  
  async detectPivotICP(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    // Heuristics:
    // - Website copy changed to narrower language
    // - "For [specific persona]" language appears
    // - Feature set reduction
    // - Positioning shift in announcements
    
    const signals: string[] = [];
    const artifacts: string[] = [];
    
    // Check for ICP-specific language
    const icpPatterns = [
      /for\s+(developers|engineers|designers|marketers|sales\s+teams)/i,
      /built\s+specifically\s+for/i,
      /designed\s+for\s+\w+\s+(teams|professionals)/i,
    ];
    
    if (raw_data.website_copy) {
      for (const pattern of icpPatterns) {
        if (pattern.test(raw_data.website_copy)) {
          signals.push(`ICP specificity detected: ${pattern.source}`);
        }
      }
    }
    
    if (raw_data.announcement) {
      if (raw_data.announcement.toLowerCase().includes('pivot') ||
          raw_data.announcement.toLowerCase().includes('refocusing')) {
        signals.push('Explicit pivot announcement');
        artifacts.push(raw_data.announcement_url || 'announcement');
      }
    }
    
    if (signals.length === 0) return null;
    
    return {
      startup_id,
      domain: 'product',
      subtype: 'pivot_icp',
      magnitude: 0.6,  // Medium-high: significant reachability change
      irreversibility: 0.5,  // Medium: can pivot again, but costly
      velocity: this.calculateVelocity(raw_data),
      confidence: signals.length >= 2 ? 0.7 : 0.5,
      evidence: {
        sources: [context.trigger_source as PhaseDetectionSource],
        artifacts,
        signals,
      },
    };
  }
  
  async detectFeatureCollapse(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    // Heuristics:
    // - Product page shows fewer features
    // - "Core product" or "simplified" language
    // - Docs show removed sections
    
    const signals: string[] = [];
    
    if (raw_data.product_changes) {
      const featureReduction = raw_data.product_changes.features_removed > 3;
      if (featureReduction) {
        signals.push(`Feature reduction: ${raw_data.product_changes.features_removed} removed`);
      }
    }
    
    if (raw_data.messaging?.includes('core') || raw_data.messaging?.includes('simplified')) {
      signals.push('Simplification messaging detected');
    }
    
    if (signals.length === 0) return null;
    
    return {
      startup_id,
      domain: 'product',
      subtype: 'feature_collapse',
      magnitude: 0.7,  // High: major strategic shift
      irreversibility: 0.6,
      velocity: 0.5,
      confidence: 0.6,
      evidence: {
        sources: [context.trigger_source as PhaseDetectionSource],
        artifacts: raw_data.product_url ? [raw_data.product_url] : [],
        signals,
      },
    };
  }
  
  async detectUsageConcentration(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    // Heuristics:
    // - User testimonials focused on specific use case
    // - Case studies show consistent pattern
    // - "Most used for X" language
    
    if (!raw_data.usage_data && !raw_data.testimonials) return null;
    
    const signals: string[] = [];
    
    if (raw_data.usage_data?.concentration_score > 0.7) {
      signals.push(`High usage concentration: ${raw_data.usage_data.primary_use_case}`);
    }
    
    if (raw_data.testimonials) {
      const commonPatterns = this.extractCommonUseCases(raw_data.testimonials);
      if (commonPatterns.length > 0) {
        signals.push(`Consistent use case: ${commonPatterns[0]}`);
      }
    }
    
    if (signals.length === 0) return null;
    
    return {
      startup_id,
      domain: 'product',
      subtype: 'usage_concentration_spike',
      magnitude: 0.8,  // Very high: PMF signal
      irreversibility: 0.7,  // Hard to change once users are dependent
      velocity: 0.6,
      confidence: 0.7,
      evidence: {
        sources: [context.trigger_source as PhaseDetectionSource],
        artifacts: [],
        signals,
      },
    };
  }
  
  private calculateVelocity(raw_data: any): number {
    // Time from signal appearance to action taken
    if (raw_data.days_since_last_change) {
      const days = raw_data.days_since_last_change;
      if (days < 30) return 0.9;
      if (days < 90) return 0.6;
      if (days < 180) return 0.3;
    }
    return 0.5;  // Default
  }
  
  private extractCommonUseCases(testimonials: string[]): string[] {
    // Simple NLP to find repeated patterns
    // In production, use more sophisticated NLP
    const useCasePatterns = testimonials
      .map(t => t.match(/use\s+\w+\s+for\s+(\w+)/i))
      .filter(m => m !== null)
      .map(m => m![1]);
    
    return [...new Set(useCasePatterns)];
  }
}

class CapitalPhaseDetector {
  /**
   * Capital Phase Changes: Entropy extension + market belief shift
   * Capital is only a phase change if it buys new futures, not just time.
   */
  
  async detectFirstInstitutionalLead(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id, existing_phases } = context;
    
    // Check if already detected
    const alreadyDetected = existing_phases?.some(
      p => p.domain === 'capital' && p.subtype === 'first_institutional_lead'
    );
    if (alreadyDetected) return null;
    
    if (!raw_data.funding_round) return null;
    
    const signals: string[] = [];
    const artifacts: string[] = [];
    
    // Check for institutional investors
    const institutionalInvestors = raw_data.funding_round.investors?.filter((inv: string) => 
      !inv.toLowerCase().includes('angel') && 
      !inv.toLowerCase().includes('individual')
    );
    
    if (institutionalInvestors && institutionalInvestors.length > 0) {
      signals.push(`First institutional lead: ${institutionalInvestors[0]}`);
      artifacts.push(raw_data.funding_round.announcement_url || '');
    }
    
    if (signals.length === 0) return null;
    
    return {
      startup_id,
      domain: 'capital',
      subtype: 'first_institutional_lead',
      magnitude: 0.7,  // High: major validation signal
      irreversibility: 0.8,  // Very high: market signal is permanent
      velocity: 0.5,
      confidence: 0.8,
      evidence: {
        sources: ['crunchbase', context.trigger_source as PhaseDetectionSource],
        artifacts,
        signals,
      },
    };
  }
  
  async detectConvictionRound(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    if (!raw_data.funding_round) return null;
    
    // Heuristics for conviction (vs opportunistic):
    // - Single lead with high ownership
    // - Competitive / preemptive timing
    // - Strategic investor from adjacent category
    // - Terms favorable to founders
    
    const signals: string[] = [];
    
    if (raw_data.funding_round.lead_ownership_percent > 20) {
      signals.push('High lead ownership indicates conviction');
    }
    
    if (raw_data.funding_round.competitive_process) {
      signals.push('Competitive process indicates conviction');
    }
    
    if (raw_data.funding_round.strategic_rationale) {
      signals.push(`Strategic capital: ${raw_data.funding_round.strategic_rationale}`);
    }
    
    if (signals.length < 2) return null;
    
    return {
      startup_id,
      domain: 'capital',
      subtype: 'conviction_round',
      magnitude: 0.8,  // Very high: changes market perception
      irreversibility: 0.9,  // Extremely high: market signal is strong
      velocity: 0.6,
      confidence: 0.7,
      evidence: {
        sources: ['crunchbase', context.trigger_source as PhaseDetectionSource],
        artifacts: [raw_data.funding_round.announcement_url || ''],
        signals,
      },
    };
  }
  
  async detectValuationDiscontinuity(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    if (!raw_data.funding_round || !raw_data.previous_valuation) return null;
    
    const currentVal = raw_data.funding_round.valuation;
    const previousVal = raw_data.previous_valuation;
    
    // Discontinuity = >3x step-up
    const stepUp = currentVal / previousVal;
    
    if (stepUp < 3.0) return null;
    
    return {
      startup_id,
      domain: 'capital',
      subtype: 'valuation_discontinuity',
      magnitude: 0.9,  // Extreme: market belief shifted dramatically
      irreversibility: 0.9,
      velocity: 0.7,
      confidence: 0.9,  // High confidence from hard numbers
      evidence: {
        sources: ['crunchbase'],
        artifacts: [raw_data.funding_round.announcement_url || ''],
        signals: [`${stepUp.toFixed(1)}x valuation step-up`],
      },
    };
  }
}

class HumanPhaseDetector {
  /**
   * Human Phase Changes: Multiplicative capability shifts
   * Humans are constraint-destroyers. One person can change the entire phase space.
   * 
   * THIS IS THE HIGHEST ALPHA DOMAIN.
   */
  
  async detectTechnicalCofounderJoined(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id, existing_phases } = context;
    
    if (!raw_data.team_change) return null;
    
    // Heuristics:
    // - LinkedIn update showing "Co-Founder" title
    // - Engineering background + early equity grant
    // - GitHub commits from new user
    
    const signals: string[] = [];
    const artifacts: string[] = [];
    
    if (raw_data.team_change.title?.toLowerCase().includes('cofounder') ||
        raw_data.team_change.title?.toLowerCase().includes('co-founder')) {
      
      if (raw_data.team_change.background?.includes('engineering') ||
          raw_data.team_change.background?.includes('technical')) {
        
        signals.push(`Technical cofounder: ${raw_data.team_change.name}`);
        artifacts.push(raw_data.team_change.linkedin_url || '');
        
        return {
          startup_id,
          domain: 'human',
          subtype: 'technical_cofounder_joined',
          magnitude: 0.9,  // Extreme: changes everything
          irreversibility: 0.8,  // Very high: cofounder equity is sticky
          velocity: 0.7,
          confidence: 0.8,
          evidence: {
            sources: ['linkedin', context.trigger_source as PhaseDetectionSource],
            artifacts,
            signals,
          },
        };
      }
    }
    
    return null;
  }
  
  async detectDomainExpertJoined(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    if (!raw_data.team_change) return null;
    
    // Heuristics:
    // - Previous role at category leader
    // - 10+ years in target industry
    // - Known expert in specific domain
    
    const signals: string[] = [];
    
    if (raw_data.team_change.years_experience > 10 &&
        raw_data.team_change.industry_relevant) {
      signals.push(`Domain expert joined: ${raw_data.team_change.name}`);
    }
    
    if (raw_data.team_change.previous_companies) {
      const categoryLeaders = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Stripe', 'Airbnb'];
      const fromLeader = raw_data.team_change.previous_companies.some((c: string) =>
        categoryLeaders.some(leader => c.includes(leader))
      );
      
      if (fromLeader) {
        signals.push(`Hire from category leader: ${raw_data.team_change.previous_companies[0]}`);
      }
    }
    
    if (signals.length === 0) return null;
    
    return {
      startup_id,
      domain: 'human',
      subtype: 'domain_expert_joined',
      magnitude: 0.7,
      irreversibility: 0.6,
      velocity: 0.6,
      confidence: 0.7,
      evidence: {
        sources: ['linkedin'],
        artifacts: [raw_data.team_change.linkedin_url || ''],
        signals,
      },
    };
  }
  
  async detectOperatorJoinsVisionary(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    // Heuristic: Operator role (COO, VP Ops, Head of Biz Ops) joins founder-led startup
    
    if (!raw_data.team_change) return null;
    
    const operatorTitles = ['coo', 'chief operating', 'vp operations', 'head of operations', 'head of business'];
    const isOperator = operatorTitles.some(title => 
      raw_data.team_change.title?.toLowerCase().includes(title)
    );
    
    if (!isOperator) return null;
    
    return {
      startup_id,
      domain: 'human',
      subtype: 'operator_joins_visionary',
      magnitude: 0.8,  // Very high: execution accelerates
      irreversibility: 0.7,
      velocity: 0.6,
      confidence: 0.7,
      evidence: {
        sources: ['linkedin'],
        artifacts: [raw_data.team_change.linkedin_url || ''],
        signals: [`Operator hire: ${raw_data.team_change.name} (${raw_data.team_change.title})`],
      },
    };
  }
}

class CustomerPhaseDetector {
  /**
   * Customer Phase Changes: Irreversibility begins here
   * Revenue is optional. Dependence is not.
   */
  
  async detectFirstNonFriendlyCustomer(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id, existing_phases } = context;
    
    // Check if already detected
    const alreadyDetected = existing_phases?.some(
      p => p.domain === 'customer' && p.subtype === 'first_non_friendly_customer'
    );
    if (alreadyDetected) return null;
    
    if (!raw_data.customer_data) return null;
    
    // Heuristics:
    // - Customer testimonial from unknown entity
    // - Case study with external company
    // - Customer logo on website (not friends/family)
    
    const signals: string[] = [];
    
    if (raw_data.customer_data.acquisition_channel !== 'founder_network' &&
        raw_data.customer_data.acquisition_channel !== 'referral') {
      signals.push('Organic customer acquisition');
    }
    
    if (raw_data.customer_data.paying && !raw_data.customer_data.friendly_deal) {
      signals.push('Paying customer (not friendly pricing)');
    }
    
    if (signals.length === 0) return null;
    
    return {
      startup_id,
      domain: 'customer',
      subtype: 'first_non_friendly_customer',
      magnitude: 0.7,  // High: validation begins
      irreversibility: 0.6,  // Medium-high: can still lose them
      velocity: 0.5,
      confidence: 0.6,
      evidence: {
        sources: [context.trigger_source as PhaseDetectionSource],
        artifacts: [],
        signals,
      },
    };
  }
  
  async detectFirstWorkflowDependency(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    if (!raw_data.usage_data) return null;
    
    // Heuristics:
    // - Daily active usage
    // - Integration with core workflows
    // - Testimonial mentions "couldn't live without"
    
    const signals: string[] = [];
    
    if (raw_data.usage_data.daily_active) {
      signals.push('Daily active usage detected');
    }
    
    if (raw_data.usage_data.integrations_active > 0) {
      signals.push(`Workflow integration: ${raw_data.usage_data.integrations_active} connections`);
    }
    
    if (raw_data.testimonial?.includes('essential') || 
        raw_data.testimonial?.includes('can\'t imagine') ||
        raw_data.testimonial?.includes('couldn\'t live without')) {
      signals.push('Dependency language in testimonial');
    }
    
    if (signals.length < 2) return null;
    
    return {
      startup_id,
      domain: 'customer',
      subtype: 'first_workflow_dependency',
      magnitude: 0.9,  // Extreme: PMF achieved
      irreversibility: 0.9,  // Extremely high: switching costs are real
      velocity: 0.6,
      confidence: 0.8,
      evidence: {
        sources: [context.trigger_source as PhaseDetectionSource],
        artifacts: [],
        signals,
      },
    };
  }
  
  async detectFirstExpansion(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    if (!raw_data.customer_data || !raw_data.customer_data.expansion_event) return null;
    
    // First upsell or seat expansion within an account
    
    return {
      startup_id,
      domain: 'customer',
      subtype: 'first_expansion_within_account',
      magnitude: 0.8,
      irreversibility: 0.8,  // High: expansion = deep integration
      velocity: 0.5,
      confidence: 0.7,
      evidence: {
        sources: [context.trigger_source as PhaseDetectionSource],
        artifacts: [],
        signals: [`Expansion: ${raw_data.customer_data.expansion_type}`],
      },
    };
  }
}

class MarketPhaseDetector {
  /**
   * Market Phase Changes: Exogenous constraint shifts
   * These are external forces that unlock new futures.
   */
  
  async detectRegulationUnlocks(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    if (!raw_data.regulation_change) return null;
    
    // Heuristics:
    // - New regulation announced in relevant sector
    // - Startup's sector matches regulation category
    
    return {
      startup_id,
      domain: 'market',
      subtype: 'regulation_unlocks',
      magnitude: 0.9,  // Extreme: entire market can open
      irreversibility: 1.0,  // Max: regulations rarely reverse
      velocity: 0.4,  // Usually slow-moving
      confidence: 0.9,  // High: regulations are factual
      evidence: {
        sources: ['rss', 'manual'],
        artifacts: [raw_data.regulation_change.source_url || ''],
        signals: [`Regulation change: ${raw_data.regulation_change.description}`],
      },
    };
  }
  
  async detectCostCurveFlip(context: PhaseDetectionContext): Promise<PhaseChangeInput | null> {
    const { raw_data, startup_id } = context;
    
    // Example: GPU compute costs drop, AI infrastructure becomes viable
    
    if (!raw_data.cost_curve_data) return null;
    
    if (raw_data.cost_curve_data.reduction_percent < 50) return null;
    
    return {
      startup_id,
      domain: 'market',
      subtype: 'cost_curve_flip',
      magnitude: 0.8,
      irreversibility: 0.9,  // Cost curves rarely reverse
      velocity: 0.5,
      confidence: 0.7,
      evidence: {
        sources: ['inference'],
        artifacts: [],
        signals: [`${raw_data.cost_curve_data.reduction_percent}% cost reduction in ${raw_data.cost_curve_data.category}`],
      },
    };
  }
}

// ========================================
// MAIN PHASE DETECTION SERVICE
// ========================================

export class PhaseDetectionService {
  private productDetector = new ProductPhaseDetector();
  private capitalDetector = new CapitalPhaseDetector();
  private humanDetector = new HumanPhaseDetector();
  private customerDetector = new CustomerPhaseDetector();
  private marketDetector = new MarketPhaseDetector();
  
  /**
   * Run phase detection for a given startup and trigger
   */
  async detectPhases(context: PhaseDetectionContext): Promise<PhaseDetectionResult> {
    const startTime = Date.now();
    const detected_phases: PhaseChangeInput[] = [];
    
    // Run all domain detectors
    const detectionPromises = [
      this.productDetector.detectPivotICP(context),
      this.productDetector.detectFeatureCollapse(context),
      this.productDetector.detectUsageConcentration(context),
      
      this.capitalDetector.detectFirstInstitutionalLead(context),
      this.capitalDetector.detectConvictionRound(context),
      this.capitalDetector.detectValuationDiscontinuity(context),
      
      this.humanDetector.detectTechnicalCofounderJoined(context),
      this.humanDetector.detectDomainExpertJoined(context),
      this.humanDetector.detectOperatorJoinsVisionary(context),
      
      this.customerDetector.detectFirstNonFriendlyCustomer(context),
      this.customerDetector.detectFirstWorkflowDependency(context),
      this.customerDetector.detectFirstExpansion(context),
      
      this.marketDetector.detectRegulationUnlocks(context),
      this.marketDetector.detectCostCurveFlip(context),
    ];
    
    const results = await Promise.all(detectionPromises);
    
    // Filter out nulls
    const validPhases = results.filter(r => r !== null) as PhaseChangeInput[];
    detected_phases.push(...validPhases);
    
    // Detect couplings (which phases triggered others)
    const detected_couplings = this.detectCouplings(detected_phases);
    
    const processingTime = Date.now() - startTime;
    
    return {
      detected_phases,
      detected_couplings,
      confidence_score: this.calculateOverallConfidence(detected_phases),
      processing_time_ms: processingTime,
    };
  }
  
  /**
   * Detect temporal or semantic couplings between phases
   */
  private detectCouplings(phases: PhaseChangeInput[]): PhaseCouplingInput[] {
    const couplings: PhaseCouplingInput[] = [];
    
    // Example coupling patterns:
    // Human phase → Product acceleration
    // Customer phase → Capital interest
    // Product phase → Customer adoption
    
    for (let i = 0; i < phases.length; i++) {
      for (let j = i + 1; j < phases.length; j++) {
        const trigger = phases[i];
        const activated = phases[j];
        
        // Temporal coupling: activated phase came after trigger
        // (In real implementation, check actual timestamps)
        
        // Semantic coupling: domains have known relationships
        if (this.areDomainsRelated(trigger.domain, activated.domain)) {
          couplings.push({
            trigger_phase_id: '', // Will be filled after DB insert
            activated_phase_id: '',
            strength: 0.6,
            evidence_type: 'semantic',
            confidence: 0.7,
          });
        }
      }
    }
    
    return couplings;
  }
  
  private areDomainsRelated(domain1: PhaseDomain, domain2: PhaseDomain): boolean {
    const relationships: Record<PhaseDomain, PhaseDomain[]> = {
      human: ['product', 'customer'],
      product: ['customer', 'capital'],
      customer: ['capital'],
      capital: ['human'],
      market: ['product', 'capital'],
    };
    
    return relationships[domain1]?.includes(domain2) || false;
  }
  
  private calculateOverallConfidence(phases: PhaseChangeInput[]): number {
    if (phases.length === 0) return 0;
    const avgConfidence = phases.reduce((sum, p) => sum + p.confidence, 0) / phases.length;
    return avgConfidence;
  }
  
  /**
   * Add phase detection job to queue
   */
  async queuePhaseDetection(input: PhaseDetectionQueueInput): Promise<void> {
    await supabase.from('phase_detection_queue').insert({
      startup_id: input.startup_id,
      trigger_source: input.trigger_source,
      trigger_data: input.trigger_data || {},
      priority: input.priority || 5,
    });
  }
  
  /**
   * Process next item from detection queue
   */
  async processQueue(): Promise<void> {
    // Get highest priority pending item
    const { data: queueItem } = await supabase
      .from('phase_detection_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    
    if (!queueItem) return;
    
    // Mark as processing
    await supabase
      .from('phase_detection_queue')
      .update({ status: 'processing' })
      .eq('id', queueItem.id);
    
    try {
      // Get existing phases for this startup
      const { data: existingPhases } = await supabase
        .from('phase_changes')
        .select('*')
        .eq('startup_id', queueItem.startup_id);
      
      // Run detection
      const context: PhaseDetectionContext = {
        startup_id: queueItem.startup_id,
        trigger_source: queueItem.trigger_source,
        raw_data: queueItem.trigger_data,
        existing_phases: existingPhases || [],
      };
      
      const result = await this.detectPhases(context);
      
      // Insert detected phases
      if (result.detected_phases.length > 0) {
        await supabase.from('phase_changes').insert(result.detected_phases);
      }
      
      // Mark as completed
      await supabase
        .from('phase_detection_queue')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id);
      
    } catch (error) {
      console.error('Phase detection error:', error);
      
      // Mark as failed
      await supabase
        .from('phase_detection_queue')
        .update({
          status: 'failed',
          attempts: queueItem.attempts + 1,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', queueItem.id);
    }
  }
}

export const phaseDetectionService = new PhaseDetectionService();
