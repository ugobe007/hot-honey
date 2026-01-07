/**
 * Inference Gate
 * 
 * Uses heuristics/rules to decide whether to use expensive LLM calls
 */

class InferenceGate {
  /**
   * Check if startup needs LLM enrichment
   */
  static shouldEnrichWithLLM(contract) {
    // Gate 1: Must have canonical domain
    if (!contract.startup_id || !contract.website) {
      return { shouldEnrich: false, reason: 'missing_domain', action: 're_crawl' };
    }
    
    // Gate 2: If already high confidence, skip LLM
    if (contract.confidence_scores.overall >= 0.8 &&
        contract.category.length > 0 &&
        contract.stage &&
        contract.one_liner) {
      return { shouldEnrich: false, reason: 'high_confidence', action: 'skip' };
    }
    
    // Gate 3: Check for contradictions
    const contradictions = this._checkContradictions(contract);
    if (contradictions.length > 0) {
      return { shouldEnrich: true, reason: 'contradictions', action: 'llm_resolve', contradictions };
    }
    
    // Gate 4: If GOD score would be below threshold, don't enrich
    const earlyScore = this._estimateEarlyGOD(contract);
    if (earlyScore < 30) {
      return { shouldEnrich: false, reason: 'low_early_score', action: 'skip', earlyScore };
    }
    
    // Gate 5: If missing critical fields, enrich
    if (!contract.category.length || !contract.stage || !contract.one_liner) {
      return { shouldEnrich: true, reason: 'missing_critical_fields', action: 'llm_enrich' };
    }
    
    // Default: don't enrich (save tokens)
    return { shouldEnrich: false, reason: 'sufficient_data', action: 'skip' };
  }
  
  /**
   * Check for data contradictions
   */
  static _checkContradictions(contract) {
    const contradictions = [];
    
    // "Stealth" + "Series B" = contradiction
    const text = `${contract.name} ${contract.one_liner} ${contract.traction_signals.map(s => s.text).join(' ')}`.toLowerCase();
    if (text.includes('stealth') && (contract.stage?.toLowerCase().includes('series b') || contract.stage?.toLowerCase().includes('series c'))) {
      contradictions.push('stealth_but_late_stage');
    }
    
    // Category mismatch (e.g., "AI" in name but category is "Retail")
    if (contract.name && contract.category.length > 0) {
      const nameLower = contract.name.toLowerCase();
      const categoryLower = contract.category[0].toLowerCase();
      if (nameLower.includes('ai') && !categoryLower.includes('ai') && !categoryLower.includes('tech')) {
        contradictions.push('category_mismatch');
      }
    }
    
    return contradictions;
  }
  
  /**
   * Estimate early GOD score (without expensive enrichment)
   */
  static _estimateEarlyGOD(contract) {
    let score = 40; // Base score
    
    // Category match (+5)
    if (contract.category.length > 0) {
      score += 5;
    }
    
    // Stage indication (+5)
    if (contract.stage) {
      score += 5;
    }
    
    // Traction signals (+2 per signal, max +10)
    score += Math.min(contract.traction_signals.length * 2, 10);
    
    // Investor signals (+3 per signal, max +15)
    score += Math.min(contract.investor_signals.length * 3, 15);
    
    // Team signals (+2 per signal, max +10)
    score += Math.min(contract.team_signals.length * 2, 10);
    
    // Confidence boost (+5 if high confidence)
    if (contract.confidence_scores.overall >= 0.7) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }
  
  /**
   * Decide extraction tier based on source
   */
  static getExtractionTier(source) {
    // RSS feeds = Tier 0
    if (source.includes('rss') || source.includes('feed')) {
      return 0;
    }
    
    // Known API endpoints = Tier 0
    if (source.includes('api') || source.includes('json')) {
      return 0;
    }
    
    // Most websites = Tier 1 (try HTML first)
    return 1;
  }
}

module.exports = InferenceGate;


