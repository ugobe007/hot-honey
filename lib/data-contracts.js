/**
 * Data Contracts + Confidence Scoring
 * 
 * Defines typed interfaces for extracted data with confidence scores
 */

/**
 * Confidence score for a field
 */
class FieldConfidence {
  constructor(value, confidence, provenance) {
    this.value = value;
    this.confidence = confidence; // 0-1
    this.provenance = provenance; // { source, method, timestamp, selector? }
  }
  
  static high(value, source, method) {
    return new FieldConfidence(value, 0.9, {
      source,
      method,
      timestamp: new Date().toISOString()
    });
  }
  
  static medium(value, source, method) {
    return new FieldConfidence(value, 0.6, {
      source,
      method,
      timestamp: new Date().toISOString()
    });
  }
  
  static low(value, source, method) {
    return new FieldConfidence(value, 0.3, {
      source,
      method,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Startup Data Contract
 */
class StartupContract {
  constructor() {
    this.startup_id = null; // Canonical domain or stable hash
    this.name = null;
    this.website = null;
    this.one_liner = null;
    
    this.category = [];
    this.stage = null;
    
    this.traction_signals = [];
    this.team_signals = [];
    this.investor_signals = [];
    
    this.source_evidence = [];
    
    this.confidence_scores = {
      overall: 0,
      name: 0,
      website: 0,
      category: 0,
      stage: 0
    };
    
    this.provenance = {
      source: null,
      extraction_method: null,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Set field with confidence
   */
  setField(field, value, confidence, provenance) {
    if (value === null || value === undefined) return;
    
    this[field] = value;
    this.confidence_scores[field] = confidence;
    
    if (provenance) {
      this.provenance = { ...this.provenance, ...provenance };
    }
    
    this._updateOverallConfidence();
  }
  
  /**
   * Add signal with confidence
   */
  addTractionSignal(text, sourceUrl, confidence = 0.7) {
    this.traction_signals.push({
      text,
      source_url: sourceUrl,
      confidence,
      timestamp: new Date().toISOString()
    });
  }
  
  addTeamSignal(role, priorCompany, sourceUrl, confidence = 0.7) {
    this.team_signals.push({
      role,
      prior_company: priorCompany,
      source_url: sourceUrl,
      confidence,
      timestamp: new Date().toISOString()
    });
  }
  
  addInvestorSignal(name, sourceUrl, confidence = 0.7) {
    this.investor_signals.push({
      name,
      source_url: sourceUrl,
      confidence,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Add source evidence
   */
  addEvidence(url, snippet) {
    this.source_evidence.push({
      url,
      snippet: snippet?.substring(0, 200),
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Calculate overall confidence
   */
  _updateOverallConfidence() {
    const weights = {
      name: 0.2,
      website: 0.3,
      category: 0.2,
      stage: 0.15,
      one_liner: 0.15
    };
    
    let total = 0;
    let weightSum = 0;
    
    for (const [field, weight] of Object.entries(weights)) {
      if (this[field] !== null && this[field] !== undefined) {
        total += this.confidence_scores[field] * weight;
        weightSum += weight;
      }
    }
    
    this.confidence_scores.overall = weightSum > 0 ? total / weightSum : 0;
  }
  
  /**
   * Check if contract is complete enough for early GOD scoring
   */
  isCompleteForEarlyScoring() {
    return (
      this.name &&
      this.website &&
      this.confidence_scores.overall >= 0.5
    );
  }
  
  /**
   * Check if contract needs deep enrichment
   */
  needsDeepEnrichment() {
    return (
      this.confidence_scores.overall < 0.7 ||
      !this.category.length ||
      !this.stage ||
      this.traction_signals.length === 0
    );
  }
  
  /**
   * Convert to database record
   */
  toDatabaseRecord() {
    return {
      name: this.name?.value || this.name,
      website: this.website?.value || this.website,
      tagline: this.one_liner?.value || this.one_liner,
      description: this.one_liner?.value || this.one_liner,
      sectors: this.category || ['Technology'],
      stage: this._mapStage(this.stage?.value || this.stage),
      location: this._extractLocation(),
      // Store confidence metadata
      extracted_data: {
        confidence: this.confidence_scores.overall,
        traction_signals: this.traction_signals,
        team_signals: this.team_signals,
        investor_signals: this.investor_signals,
        source_evidence: this.source_evidence,
        provenance: this.provenance
      }
    };
  }
  
  _mapStage(stage) {
    if (!stage) return 1; // Pre-seed default
    const s = stage.toLowerCase();
    if (s.includes('pre-seed') || s.includes('idea')) return 0;
    if (s.includes('seed')) return 2;
    if (s.includes('series a') || s.includes('a')) return 3;
    if (s.includes('series b') || s.includes('b')) return 4;
    return 1;
  }
  
  _extractLocation() {
    // Try to extract from signals or evidence
    for (const evidence of this.source_evidence) {
      const locationMatch = evidence.snippet?.match(/(?:based in|located in|headquartered in|from)\s+([A-Z][a-zA-Z\s,]+)/i);
      if (locationMatch) {
        return locationMatch[1].trim();
      }
    }
    return null;
  }
}

module.exports = {
  StartupContract,
  FieldConfidence
};


