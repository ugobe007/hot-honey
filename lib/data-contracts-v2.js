/**
 * Data Contracts V2 - Comprehensive Startup Schema
 * 
 * Implements the tiered scraping architecture specification:
 * - Identity (dedupe backbone)
 * - Snapshot (investor-facing)
 * - Signals (GOD inputs)
 * - Funding/Investor Signals
 * - Evidence + Crawl Metadata
 * - GOD Outputs
 */

class FieldConfidence {
  constructor(value, confidence, provenance) {
    this.value = value;
    this.confidence = confidence; // 0-1
    this.provenance = provenance; // { source_url, extractor, confidence, timestamp }
  }
  
  static high(value, source, extractor) {
    return new FieldConfidence(value, 0.9, {
      source_url: source,
      extractor,
      confidence: 0.9,
      timestamp: new Date().toISOString()
    });
  }
  
  static medium(value, source, extractor) {
    return new FieldConfidence(value, 0.6, {
      source_url: source,
      extractor,
      confidence: 0.6,
      timestamp: new Date().toISOString()
    });
  }
  
  static low(value, source, extractor) {
    return new FieldConfidence(value, 0.3, {
      source_url: source,
      extractor,
      confidence: 0.3,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Comprehensive Startup Contract (V2)
 */
class StartupContractV2 {
  constructor() {
    // A) Identity (dedupe backbone)
    this.startup_id = null; // UUID (assigned on save)
    this.canonical_domain = null; // e.g., "acme.ai" (primary key for dedupe)
    this.company_name = null;
    this.aliases = []; // name variants
    this.website_url = null;
    this.hq_location = null; // {city, region, country}
    this.founded_year = null;
    this.status = 'active'; // active / acquired / dead / unknown
    
    // B) Snapshot (investor-facing)
    this.one_liner = null; // ≤160 chars
    this.category_primary = null; // enum
    this.category_tags = []; // secondary tags
    this.stage_estimate = null; // pre-seed/seed/A/etc
    this.stage_confidence = null; // 0-1
    this.product_description_short = null; // 1-3 sentences
    this.problem = null;
    this.solution = null;
    
    // C) Signals (GOD inputs)
    this.traction_signals = []; // {type, value, evidence_url, evidence_snippet, date, confidence}
    this.team_signals = []; // {person_name, role, prior_orgs[], evidence_url, confidence}
    this.market_signals = []; // {tam_hint, ICP_hint, pricing_hint, evidence_url, confidence}
    this.moat_signals = []; // {type, claim, evidence_url, confidence}
    
    // D) Funding / Investor Signals
    this.funding_mentions = []; // {round, amount, date, investors[], evidence_url, confidence}
    this.investor_mentions = []; // if round unknown
    this.accelerators = []; // YC, Techstars, etc.
    
    // E) Evidence + Crawl Metadata
    this.evidence = []; // {url, source, snippet, captured_at}
    this.source_first_seen = null;
    this.source_last_seen = null;
    this.crawl_history = []; // {source, fetched_at, method, success, http_status, parse_version}
    this.field_provenance = {}; // field -> {source_url, extractor, confidence, timestamp}
    
    // F) GOD Outputs
    this.god_score_total = null; // 0-100
    this.god_score_components = null; // {grit, opportunity, determination}
    this.god_reason_codes = []; // human-readable bullet reasons
    this.god_risk_flags = []; // e.g., "unclear product", "no domain", etc.
    this.god_model_version = null;
    
    // Confidence scores
    this.confidence_scores = {
      overall: 0,
      name: 0,
      domain: 0,
      category: 0,
      stage: 0,
      one_liner: 0
    };
  }
  
  /**
   * Set field with confidence and provenance
   */
  setField(field, value, confidence, provenance) {
    if (value === null || value === undefined) return;
    
    this[field] = value;
    this.confidence_scores[field] = confidence;
    
    // Track provenance
    if (provenance) {
      this.field_provenance[field] = {
        source_url: provenance.source_url || provenance.source,
        extractor: provenance.extractor || provenance.method || 'unknown',
        confidence,
        timestamp: provenance.timestamp || new Date().toISOString()
      };
    }
    
    this._updateOverallConfidence();
  }
  
  /**
   * Add traction signal
   */
  addTractionSignal(type, value, evidenceUrl, evidenceSnippet, confidence = 0.7) {
    this.traction_signals.push({
      type, // "revenue", "users", "growth", "partnership", "pilot", "waitlist", "downloads", "press", "hiring", "github", "patents", "regulatory"
      value,
      evidence_url: evidenceUrl,
      evidence_snippet: evidenceSnippet?.substring(0, 200),
      date: new Date().toISOString(),
      confidence
    });
  }
  
  /**
   * Add team signal
   */
  addTeamSignal(personName, role, priorOrgs, evidenceUrl, confidence = 0.7) {
    this.team_signals.push({
      person_name: personName,
      role,
      prior_orgs: Array.isArray(priorOrgs) ? priorOrgs : [priorOrgs].filter(Boolean),
      evidence_url: evidenceUrl,
      confidence
    });
  }
  
  /**
   * Add market signal
   */
  addMarketSignal(tamHint, icpHint, pricingHint, evidenceUrl, confidence = 0.7) {
    this.market_signals.push({
      tam_hint: tamHint,
      ICP_hint: icpHint,
      pricing_hint: pricingHint,
      evidence_url: evidenceUrl,
      confidence
    });
  }
  
  /**
   * Add moat signal
   */
  addMoatSignal(type, claim, evidenceUrl, confidence = 0.7) {
    this.moat_signals.push({
      type,
      claim,
      evidence_url: evidenceUrl,
      confidence
    });
  }
  
  /**
   * Add funding mention
   */
  addFundingMention(round, amount, date, investors, evidenceUrl, confidence = 0.7) {
    this.funding_mentions.push({
      round, // "seed", "series-a", etc.
      amount,
      date,
      investors: Array.isArray(investors) ? investors : [investors].filter(Boolean),
      evidence_url: evidenceUrl,
      confidence
    });
  }
  
  /**
   * Add investor mention (round unknown)
   */
  addInvestorMention(investorName, evidenceUrl, confidence = 0.7) {
    this.investor_mentions.push({
      name: investorName,
      evidence_url: evidenceUrl,
      confidence
    });
  }
  
  /**
   * Add accelerator mention
   */
  addAccelerator(name, evidenceUrl, confidence = 0.9) {
    this.accelerators.push({
      name, // "YC", "Techstars", etc.
      evidence_url: evidenceUrl,
      confidence
    });
  }
  
  /**
   * Add evidence
   */
  addEvidence(url, source, snippet) {
    this.evidence.push({
      url,
      source,
      snippet: snippet?.substring(0, 200),
      captured_at: new Date().toISOString()
    });
    
    // Update first/last seen
    const now = new Date();
    if (!this.source_first_seen) {
      this.source_first_seen = now.toISOString();
    }
    this.source_last_seen = now.toISOString();
  }
  
  /**
   * Add crawl history entry
   */
  addCrawlHistory(source, method, success, httpStatus, parseVersion) {
    this.crawl_history.push({
      source,
      fetched_at: new Date().toISOString(),
      method, // "rss", "html", "browser", "api"
      success,
      http_status: httpStatus,
      parse_version: parseVersion
    });
  }
  
  /**
   * Set canonical domain (primary key for dedupe)
   */
  setCanonicalDomain(url) {
    if (!url) return;
    
    try {
      const { URL } = require('url');
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
      
      this.canonical_domain = domain;
      this.website_url = url;
      this.startup_id = domain; // Provisional until UUID assigned
      
      this.setField('canonical_domain', domain, 0.9, {
        source_url: url,
        extractor: 'domain_parser',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Invalid URL, skip
    }
  }
  
  /**
   * Calculate overall confidence
   */
  _updateOverallConfidence() {
    const weights = {
      name: 0.15,
      domain: 0.25, // Most important for dedupe
      category: 0.15,
      stage: 0.15,
      one_liner: 0.15,
      product_description_short: 0.15
    };
    
    let total = 0;
    let weightSum = 0;
    
    for (const [field, weight] of Object.entries(weights)) {
      const fieldName = field === 'domain' ? 'canonical_domain' : 
                       field === 'name' ? 'company_name' : field;
      if (this[fieldName] !== null && this[fieldName] !== undefined) {
        total += (this.confidence_scores[field] || 0.5) * weight;
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
      this.company_name &&
      this.canonical_domain &&
      this.confidence_scores.overall >= 0.5
    );
  }
  
  /**
   * Check if contract needs deep enrichment (Tier 2)
   */
  needsDeepEnrichment() {
    return (
      this.confidence_scores.overall < 0.7 ||
      !this.category_primary ||
      !this.stage_estimate ||
      !this.one_liner ||
      this.traction_signals.length === 0
    );
  }
  
  /**
   * Convert to database record
   */
  toDatabaseRecord() {
    return {
      // Identity
      canonical_domain: this.canonical_domain,
      name: this.company_name,
      aliases: this.aliases,
      website: this.website_url,
      hq_location: this.hq_location,
      founded_year: this.founded_year,
      company_status: this.status,
      
      // Snapshot
      one_liner: this.one_liner,
      category_primary: this.category_primary,
      category_tags: this.category_tags,
      stage_estimate: this.stage_estimate,
      stage_confidence: this.stage_confidence,
      product_description_short: this.product_description_short,
      problem: this.problem,
      solution: this.solution,
      
      // Legacy fields (for backward compatibility)
      tagline: this.one_liner,
      description: this.product_description_short,
      sectors: this.category_tags.length > 0 ? this.category_tags : [this.category_primary].filter(Boolean),
      stage: this._mapStageToInteger(this.stage_estimate),
      
      // Signals (stored in extracted_data)
      extracted_data: {
        traction_signals: this.traction_signals,
        team_signals: this.team_signals,
        market_signals: this.market_signals,
        moat_signals: this.moat_signals,
        confidence: this.confidence_scores.overall,
        provenance: this.field_provenance
      },
      
      // Funding/Investor
      funding_mentions: this.funding_mentions,
      investor_mentions: this.investor_mentions,
      accelerators: this.accelerators,
      
      // Evidence
      evidence: this.evidence,
      source_first_seen: this.source_first_seen,
      source_last_seen: this.source_last_seen,
      crawl_history: this.crawl_history,
      field_provenance: this.field_provenance,
      
      // GOD
      total_god_score: this.god_score_total,
      god_score_components: this.god_score_components,
      god_reason_codes: this.god_reason_codes,
      god_risk_flags: this.god_risk_flags,
      god_model_version: this.god_model_version,
      
      // Metadata
      source_type: 'url',
      status: 'approved'
    };
  }
  
  /**
   * Map stage estimate to integer (for backward compatibility)
   */
  _mapStageToInteger(stage) {
    if (!stage) return 1;
    const s = stage.toLowerCase();
    if (s.includes('pre-seed') || s.includes('idea')) return 1;
    if (s.includes('seed')) return 2;
    if (s.includes('series-a') || s.includes('series a')) return 3;
    if (s.includes('series-b') || s.includes('series b')) return 4;
    if (s.includes('series-c') || s.includes('series c')) return 5;
    return 1;
  }
}

module.exports = {
  StartupContractV2,
  FieldConfidence
};


