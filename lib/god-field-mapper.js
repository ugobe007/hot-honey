/**
 * GOD Field Mapper
 * 
 * Maps dynamic parser output fields to GOD scoring system fields.
 * The GOD scoring system (startupScoringService.ts) uses specific fields
 * that may not directly match what the parser extracts.
 * 
 * This module provides:
 * 1. Field mapping from parser → GOD scoring
 * 2. Derived field generation (e.g., contrarian_belief from tagline)
 * 3. Signal extraction for GRIT, execution, credentials
 */

/**
 * GOD Scoring Field Requirements (from startupScoringService.ts)
 * 
 * TEAM SCORE (max 10):
 * - has_technical_cofounder (2 points)
 * - founder credentials: FAANG, YC, Stanford/MIT/Harvard (up to 3 points)
 * - team_size (1-3 optimal = 1 point)
 * - repeat founders, domain expertise
 * 
 * TRACTION SCORE (max 10):
 * - revenue_annual, mrr, arr
 * - customer_count, growth_rate_monthly
 * - has_revenue, has_customers
 * - ltv_cac_ratio, nrr
 * 
 * MARKET SCORE (max 10):
 * - tam_estimate
 * - market_timing_score
 * - winner_take_all_market
 * - sectors (for market size inference)
 * 
 * PRODUCT SCORE (max 10):
 * - is_launched, has_demo
 * - dau_wau_ratio
 * - nps_score
 * - organic_referral_rate
 * 
 * VISION SCORE (max 10) - VIBE assessment:
 * - contrarian_belief
 * - why_now  
 * - unfair_advantage
 * - description (analyzed for clarity, ambition)
 */

// Credential patterns for team scoring
const CREDENTIAL_PATTERNS = {
  faang: /\b(google|facebook|meta|apple|amazon|netflix|microsoft|stripe|airbnb|uber|dropbox)\b/i,
  ycombinator: /\b(y combinator|yc |yc\d{2}|ycombinator)\b/i,
  elite_edu: /\b(stanford|mit|harvard|yale|princeton|carnegie mellon|berkeley|caltech)\b/i,
  phd: /\b(ph\.?d|doctorate|doctoral)\b/i,
  serial_founder: /\b(serial founder|previous exit|sold company|exited|acquired)\b/i
};

// Signal extraction patterns
const GRIT_PATTERNS = {
  bootstrapped: /\b(bootstrapped|self-funded|no vc|no funding)\b/i,
  pivoted: /\b(pivot|pivoted|changed direction)\b/i,
  persistence: /\b(years? building|months? of development|long journey)\b/i,
  rejection: /\b(rejected by|turned down|100 nos|many nos)\b/i
};

const EXECUTION_PATTERNS = {
  shipped_fast: /\b(shipped in|built in|launched in)\s*\d+\s*(days?|weeks?)\b/i,
  iteration: /\b(iterate|iterating|rapid development|agile|sprint)\b/i,
  data_driven: /\b(data-driven|metrics|analytics|measured)\b/i
};

/**
 * Extract credential signals from text
 */
function extractCredentials(text) {
  if (!text) return { signals: [], score: 0 };
  
  const signals = [];
  let score = 0;
  
  if (CREDENTIAL_PATTERNS.faang.test(text)) {
    signals.push('FAANG experience');
    score += 2;
  }
  if (CREDENTIAL_PATTERNS.ycombinator.test(text)) {
    signals.push('YC backed');
    score += 2;
  }
  if (CREDENTIAL_PATTERNS.elite_edu.test(text)) {
    signals.push('Elite education');
    score += 1;
  }
  if (CREDENTIAL_PATTERNS.phd.test(text)) {
    signals.push('PhD');
    score += 1;
  }
  if (CREDENTIAL_PATTERNS.serial_founder.test(text)) {
    signals.push('Serial founder');
    score += 2;
  }
  
  return { signals, score: Math.min(score, 5) };
}

/**
 * Extract GRIT signals from text
 */
function extractGritSignals(text) {
  if (!text) return [];
  
  const signals = [];
  
  for (const [key, pattern] of Object.entries(GRIT_PATTERNS)) {
    if (pattern.test(text)) {
      signals.push(key.replace(/_/g, ' '));
    }
  }
  
  return signals;
}

/**
 * Extract execution signals from text
 */
function extractExecutionSignals(text) {
  if (!text) return [];
  
  const signals = [];
  
  for (const [key, pattern] of Object.entries(EXECUTION_PATTERNS)) {
    if (pattern.test(text)) {
      signals.push(key.replace(/_/g, ' '));
    }
  }
  
  return signals;
}

/**
 * Derive contrarian_belief from tagline/description
 * Looks for unique, non-obvious insights
 */
function deriveContrarianBelief(tagline, description) {
  const text = `${tagline || ''} ${description || ''}`;
  
  // Patterns that indicate contrarian thinking
  const contrarianPatterns = [
    /(?:we believe|our belief|contrary to popular|unlike others|most people think|while others)\s+(.{30,200})/i,
    /(?:the future of|reimagining|rethinking|challenging)\s+(.{20,150})/i,
    /(?:what if|imagine if)\s+(.{20,150})/i,
    /(?:everyone else|traditional|legacy|old way)\s+(.{20,150})/i
  ];
  
  for (const pattern of contrarianPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim().substring(0, 300);
    }
  }
  
  // If no explicit contrarian statement, try to extract unique angle from tagline
  if (tagline && tagline.length > 30 && !tagline.toLowerCase().includes('platform for')) {
    return tagline;
  }
  
  return null;
}

/**
 * Derive why_now from description
 * Looks for timing signals
 */
function deriveWhyNow(description) {
  if (!description) return null;
  
  const whyNowPatterns = [
    /(?:now is the time|the time is right|today's|this moment|recent advances)\s*(.{20,200})/i,
    /(?:new regulations?|regulatory changes?|policy changes?)\s*(.{20,150})/i,
    /(?:AI enables|GPT|LLM|machine learning now|recent breakthroughs?)\s*(.{20,150})/i,
    /(?:pandemic|remote work|shift to digital|behavioral change)\s*(.{20,150})/i,
    /(?:market is ready|customers are ready|demand is)\s*(.{20,150})/i
  ];
  
  for (const pattern of whyNowPatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0].trim().substring(0, 300);
    }
  }
  
  return null;
}

/**
 * Derive unfair_advantage from founders/description
 */
function deriveUnfairAdvantage(founders, description) {
  const sources = [];
  
  // Check founders for domain expertise
  if (founders && Array.isArray(founders)) {
    for (const founder of founders) {
      const founderText = typeof founder === 'string' ? founder : 
        `${founder.name || ''} ${founder.title || ''} ${founder.background || ''}`;
      
      if (/\b(\d{1,2}\+?\s*years?|decade|veteran|expert|pioneer)\b/i.test(founderText)) {
        sources.push(`Deep domain expertise: ${founderText.substring(0, 100)}`);
      }
      if (/\b(invented|created|built|founded|co-founded)\s+\w+/i.test(founderText)) {
        sources.push(`Built before: ${founderText.substring(0, 100)}`);
      }
    }
  }
  
  // Check description for advantages
  if (description) {
    const advantagePatterns = [
      /(?:proprietary|patent|exclusive|only company|first to)\s+(.{20,100})/i,
      /(?:unique access|unique data|unique insight)\s+(.{20,100})/i,
      /(?:network effect|viral loop|flywheel)\s+(.{20,100})/i
    ];
    
    for (const pattern of advantagePatterns) {
      const match = description.match(pattern);
      if (match) {
        sources.push(match[0].trim());
      }
    }
  }
  
  return sources.length > 0 ? sources.join('; ').substring(0, 500) : null;
}

/**
 * Estimate TAM from sectors
 */
function estimateTamFromSectors(sectors) {
  if (!sectors || !Array.isArray(sectors)) return null;
  
  // Rough TAM estimates by sector (in billions USD)
  const sectorTam = {
    'Artificial Intelligence': 500,
    'Machine Learning': 200,
    'FinTech': 300,
    'HealthTech': 400,
    'SaaS': 200,
    'E-Commerce': 5000,
    'Enterprise Software': 600,
    'Cybersecurity': 250,
    'EdTech': 400,
    'Climate Tech': 2500,
    'Developer Tools': 50,
    'Infrastructure': 100,
    'Crypto/Web3': 100,
    'Marketplace': 300,
    'B2B': 150,
    'B2C': 200
  };
  
  let maxTam = 0;
  for (const sector of sectors) {
    const tam = sectorTam[sector] || 50;
    maxTam = Math.max(maxTam, tam);
  }
  
  return maxTam * 1000000000; // Return in dollars
}

/**
 * Infer market timing score from description/sectors
 */
function inferMarketTiming(description, sectors) {
  let score = 5; // Default neutral
  
  const text = `${description || ''} ${(sectors || []).join(' ')}`;
  
  // Hot market signals
  if (/\b(AI|artificial intelligence|GPT|LLM|generative)\b/i.test(text)) score += 2;
  if (/\b(climate|sustainability|green|carbon)\b/i.test(text)) score += 1;
  if (/\b(remote|hybrid work|distributed)\b/i.test(text)) score += 1;
  
  // Cooling market signals
  if (/\b(crypto|blockchain|nft|web3)\b/i.test(text)) score -= 1;
  if (/\b(metaverse|vr\b|ar\b)\b/i.test(text)) score -= 1;
  
  return Math.min(10, Math.max(1, score));
}

/**
 * Main mapper function
 * Takes parser output and returns GOD-compatible fields
 */
function mapToGodFields(parserOutput) {
  if (!parserOutput) return null;
  
  const {
    name,
    description,
    tagline,
    value_proposition,
    sectors,
    founders,
    team_size,
    funding_amount,
    funding_stage,
    stage,
    website,
    // Parser may extract these directly
    revenue,
    customers,
    growth_rate
  } = parserOutput;
  
  // Combine text for analysis
  const fullText = `${description || ''} ${tagline || ''} ${value_proposition || ''}`;
  const founderText = founders ? (Array.isArray(founders) ? 
    founders.map(f => typeof f === 'string' ? f : `${f.name} ${f.title} ${f.background}`).join(' ') : 
    founders) : '';
  
  // Extract signals
  const credentials = extractCredentials(founderText);
  const gritSignals = extractGritSignals(fullText);
  const executionSignals = extractExecutionSignals(fullText);
  
  // Derive GOD fields
  const godFields = {
    // Basic info
    name,
    description,
    tagline,
    value_proposition: value_proposition || tagline,
    website,
    sectors,
    
    // Team fields
    founders,
    team_size,
    has_technical_cofounder: /\b(cto|technical|engineer|developer)\b/i.test(founderText),
    credential_signals: credentials.signals,
    
    // Traction fields (if available)
    has_revenue: !!revenue || /\b(revenue|arr|mrr|profitable)\b/i.test(fullText),
    has_customers: !!customers || /\b(customers?|clients?|users?)\b/i.test(fullText),
    
    // Stage
    stage: funding_stage || stage,
    latest_funding_amount: funding_amount,
    
    // Market fields
    tam_estimate: estimateTamFromSectors(sectors),
    market_timing_score: inferMarketTiming(description, sectors),
    
    // Product fields
    is_launched: /\b(launched|live|available|users)\b/i.test(fullText),
    has_demo: /\b(demo|try it|sign up|get started)\b/i.test(fullText),
    
    // Vision fields (VIBE)
    contrarian_belief: deriveContrarianBelief(tagline, description),
    why_now: deriveWhyNow(description),
    unfair_advantage: deriveUnfairAdvantage(founders, description),
    
    // Signals for scoring
    team_signals: {
      credential_score: credentials.score,
      signals: credentials.signals
    },
    grit_signals: gritSignals,
    execution_signals: executionSignals
  };
  
  // Remove null/undefined fields
  return Object.fromEntries(
    Object.entries(godFields).filter(([_, v]) => v !== null && v !== undefined)
  );
}

/**
 * Calculate estimated GOD score impact
 * Returns how much the data quality could improve GOD scoring
 */
function estimateScoreImpact(original, enriched) {
  let potentialGain = 0;
  
  // Vision score impact
  if (!original.contrarian_belief && enriched.contrarian_belief) potentialGain += 2;
  if (!original.why_now && enriched.why_now) potentialGain += 1;
  if (!original.unfair_advantage && enriched.unfair_advantage) potentialGain += 1;
  
  // Team score impact
  if (!original.credential_signals?.length && enriched.credential_signals?.length) {
    potentialGain += enriched.team_signals?.credential_score || 1;
  }
  if (!original.has_technical_cofounder && enriched.has_technical_cofounder) potentialGain += 2;
  
  // Market score impact
  if (!original.tam_estimate && enriched.tam_estimate) potentialGain += 1;
  if (!original.market_timing_score && enriched.market_timing_score > 5) potentialGain += 1;
  
  // Product score impact
  if (!original.is_launched && enriched.is_launched) potentialGain += 2;
  if (!original.has_demo && enriched.has_demo) potentialGain += 1;
  
  return potentialGain;
}

// Export
module.exports = {
  mapToGodFields,
  deriveContrarianBelief,
  deriveWhyNow,
  deriveUnfairAdvantage,
  extractCredentials,
  extractGritSignals,
  extractExecutionSignals,
  estimateTamFromSectors,
  inferMarketTiming,
  estimateScoreImpact
};
